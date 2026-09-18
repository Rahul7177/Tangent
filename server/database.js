const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Configure PostgreSQL before starting the relay.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
});

async function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

async function healthcheck() {
  await pool.query('SELECT 1');
}

async function upsertUser({ username, name, phone = '' }) {
  await pool.query(
    `INSERT INTO users (username, name, phone)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, last_seen_at = NOW()`,
    [username, name, phone],
  );
}

async function listUsers() {
  const { rows } = await pool.query(
    'SELECT username, username AS id, name, phone FROM users ORDER BY username',
  );
  return rows;
}

async function listMessagesFor(username) {
  const { rows } = await pool.query(
    `SELECT id, chat_id AS "chatId", sender_username AS sender, recipient_username AS recipient,
            text, EXTRACT(EPOCH FROM created_at) * 1000 AS "createdAt", reply_to_id AS "replyToId"
     FROM messages
     WHERE sender_username = $1 OR recipient_username = $1
     ORDER BY created_at ASC
     LIMIT 10000`,
    [username],
  );
  return rows.map((message) => ({
    ...message,
    createdAt: Number(message.createdAt),
    mine: message.sender === username,
    kind: 'text',
    receipt: message.sender === username ? 'sent' : 'delivered',
    reactions: [],
  }));
}

async function insertMessage(message) {
  await pool.query(
    `INSERT INTO messages (id, chat_id, sender_username, recipient_username, text, created_at, reply_to_id)
     VALUES ($1, $2, $3, $4, $5, TO_TIMESTAMP($6 / 1000.0), $7)`,
    [message.id, message.chatId, message.sender, message.to, message.text, message.createdAt, message.replyToId || null],
  );
}

module.exports = { initializeDatabase, healthcheck, upsertUser, listUsers, listMessagesFor, insertMessage };