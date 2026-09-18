# Tangent — Expo app (Android-first, iOS-ready)

Phase 1 MVP per `tangent-prd.md`, styled per `tangent_design.md`.

## Stack (all free, no paid deps)

- Expo SDK 57 + React Native 0.86 + React 19, TypeScript
- React Navigation (bottom tabs + native stack)
- Zustand (local store) + expo-sqlite stub point (Matrix homeserver plugs in next)
- expo-haptics, expo-local-authentication (Whisper biometric gate), NetInfo (Network Weather)
- Reanimated + Gesture Handler (motion per design table)

## Run — Android first

You have no Android SDK on this machine, so use **Expo Go on a physical Android phone**
(the fastest Android-first path, no Android Studio needed):

```bash
cd app
npm install
npx expo start
```

Then scan the QR with Expo Go (Android). For iOS, same QR works in Expo Go on iPhone
(or `npx expo start --ios` on a Mac).

Web preview (for quick checks on this PC):

```bash
npx expo start --web
```

## Realtime chat relay

The app can connect to the included lightweight WebSocket relay for real cross-device text chat.
Run it from the `app` directory:

```bash
npm run server
npx expo start --web
```

For a hosted relay, set `EXPO_PUBLIC_TANGENT_WS_URL` to its `wss://` URL before starting Expo.
The relay stores users and messages in PostgreSQL. The schema is in `server/schema.sql`; the
relay runs it automatically at startup. Users should choose unique usernames during onboarding,
then add each other from **Add people** before chatting.

## Deploy the relay on Render

The repository includes `render.yaml`, which creates a Render web service and a PostgreSQL
database together:

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository.
3. Confirm the `tangent-relay` service and `tangent-db` database from `render.yaml`.
4. Deploy the Blueprint. Render supplies `DATABASE_URL` to the relay automatically.
5. Copy the deployed service URL, for example `https://tangent-relay.onrender.com`.
6. Set `EXPO_PUBLIC_TANGENT_WS_URL` to `wss://tangent-relay.onrender.com` before building or starting Expo.

The relay exposes `GET /` as a health endpoint. PostgreSQL is initialized automatically, and the
service refuses to start when `DATABASE_URL` is missing so it cannot accidentally run without
persistent storage.

EAS build when you want an APK/IPA:

```bash
npm i -g eas-cli
eas build -p android --profile preview
eas build -p ios --profile preview
```

## What is implemented (PRD Phase 1 + design system)

- Design tokens: `src/theme/tokens.ts` — Ember `#C9552F/#E37A52`, neutrals,
  radius 4/10/16/24, spacing 4–64, type scale, standard ease. No gradients/glass/glow.
- Onboarding → Chats (search, unread Ember badges, Network Weather) → Conversation
  (bubbles, receipts, replies, reactions, long-press menu, typing dots, send animation)
  → Tangent Threads (`ThreadDetailScreen`) → Whisper Mode (biometric gate, hidden excluded
  from preview/search) → Calls + in-call stub (Opus/WebRTC notes, audio-only fallback banner)
  → Settings (dark mode cross-fade, Lite Mode toggle).
- Offline-first store: `src/store/useStore.ts` — instant send + `sent→delivered` ack,
  queue hook point for Matrix/Socket.IO delta sync (Module 1 + 5).
- Haptics map: `src/lib/haptics.ts` — exactly the design §4 table.

## Next steps (PRD roadmap)

1. Phase 2: stand up Matrix Synapse (or Node+Socket.IO), wire `sendMessage`/`syncQueue`
   to it; add expo-image-picker + client compression, MinIO/R2 bucket.
2. SQLCipher for Whisper at rest; hide-from-notifications/search fully enforced.
3. Phase 3: WebRTC via LiveKit self-hosted SFU; real bandwidth estimation → Network Weather.
4. Fonts: drop `CabinetGrotesk-*.ttf`, `GeneralSans-*.ttf`, `JetBrainsMono-*.ttf`
   (Fontshare + JetBrains, all free commercial-use) into `assets/fonts/` and register in `App.tsx`.
5. Sounds (Freesound/Zapsplat + Audacity), Rive/Lottie polish, E2E (Olm/Megolm).
