# Tangent App Architecture

This document describes how the current Tangent app works. It covers the client, Firebase Authentication, Firebase Realtime Database, profile creation, message requests, realtime messaging, persistence, logout, and the main security boundaries.

## 1. Runtime Shape

Tangent is an Expo React Native app that runs on Android, iOS, and web.

```text
Expo app
  |
  | Firebase Web SDK
  +--> Firebase Authentication
  +--> Firebase Realtime Database
```

There is no custom server in the current production path. The app connects directly to Firebase from the client.

Main client layers:

- `App.tsx`: bootstraps fonts, providers, theme, and navigation.
- `RootNavigator.tsx`: chooses the welcome/auth stack or the authenticated app stack.
- `OnboardingScreen.tsx`: welcome, login, signup, and profile setup pages.
- `useStore.ts`: Zustand state for the current user, chats, messages, requests, and UI state.
- `realtime.ts`: Firebase initialization, authentication, realtime listeners, and writes.
- `database.rules.json`: Firebase Realtime Database authorization and validation rules.

## 2. Firebase Configuration

Firebase configuration is read from Expo public environment variables:

```text
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

The local values live in `app/.env.local`. That file is ignored by Git. `.env.example` documents the required variable names without containing real credentials.

The Firebase Web SDK configuration is not a private secret. The security boundary is Firebase Authentication plus `database.rules.json`. Service-account JSON files and private keys must never be placed in the Expo app.

## 3. Authentication

Enabled providers:

- Email/password authentication works on web and native builds.
- Google popup authentication currently works in the web flow. Native Google sign-in needs Android/iOS provider configuration before it can be used in an APK.

### Signup

1. The user opens **Create an account**.
2. The user chooses a Tangent username, email, and password.
3. `signUpWithEmail()` calls Firebase `createUserWithEmailAndPassword()`.
4. Firebase creates an authenticated user ID (`uid`).
5. The user completes profile setup with a display name and username.
6. `completeOnboarding()` writes the local profile state and calls `connectRealtime()`.
7. `connectRealtime()` writes the public user profile under `users/<username>`.

### Login

1. The user opens **I already have an account**.
2. `signInWithEmail()` calls Firebase `signInWithEmailAndPassword()`.
3. The app calls `signedInProfile()` and searches the Firebase `users` collection for the profile whose `ownerId` matches the authenticated Firebase `uid`.
4. The stored display name and Tangent username are restored.
5. `completeOnboarding()` reconnects the realtime listeners.
6. The user enters the authenticated chat stack.

The app does not invent a new username from the email when a stored profile is available. This prevents Firebase ownership rules from rejecting messages from an incorrectly reconstructed identity.

## 4. User Profiles

Each profile is stored at:

```text
users/<username>
```

Example shape:

```json
{
  "id": "tangent_sample_2026",
  "ownerId": "firebase-auth-uid",
  "name": "Tangent Sample",
  "username": "tangent_sample_2026",
  "phone": ""
}
```

`ownerId` binds the public username to the Firebase authenticated user. A user can create their own profile record, but cannot write another user\'s profile.

The app listens to `users` with `onValue()`. This keeps the local directory current so **Add people** can search names and usernames.

## 5. Session Persistence

There are two persistence layers:

### Firebase Auth persistence

On web, Firebase uses `browserLocalPersistence`, so the Firebase login remains after closing or reloading the browser until the user logs out.

### Zustand persistence

The Zustand store uses `persist()` with AsyncStorage under the key:

```text
tangent-session
```

The persisted subset includes:

- `onboarded`
- `userName`
- `currentUser`
- directory data
- chats
- messages
- threads
- Lite Mode
- Whisper unlock state

Passwords and temporary auth drafts are not persisted.

When the app starts with a persisted user, `App.tsx` calls `completeOnboarding()` again to reconnect Firebase listeners for that profile.

## 6. Logout

Logout is available from both Settings and Profile.

The flow is:

1. `logout()` detaches realtime listeners.
2. Firebase `signOut()` clears the authenticated Firebase session.
3. The store resets `onboarded` to `false`.
4. Local profile, chats, messages, threads, and Whisper state are cleared.
5. Navigation switches to the Welcome/auth stack.
6. Reloading after logout stays on Welcome.

## 7. Realtime Connection

`connectRealtime()` performs the following steps:

1. Initializes Firebase once.
2. Reuses the existing authenticated Firebase user. Anonymous auth is only a fallback for an unconfigured account flow.
3. Sets the current user profile at `users/<username>`.
4. Subscribes to the directory at `users`.
5. Subscribes to presence at `presence/<username>`.
6. Marks the current user online.
7. Listens for incoming messages at `inbox/<username>`.
8. Listens for incoming requests at `requests/<username>`.
9. Listens for acceptance events at `requestEvents/<username>`.

Listeners are detached before a new username is connected. This prevents duplicate subscriptions after login, reload recovery, or profile reconnects.

## 8. Adding People and Requests

Every new contact begins as a request. The sender does not get an active composer immediately.

### Sender flow

1. The sender searches the Firebase directory by username or name.
2. The sender taps **Request**.
3. The app creates a deterministic direct chat ID:

```text
dm:<sorted-username-a>:<sorted-username-b>
```

4. The local sender chat is marked `pending-sent`.
5. Firebase writes the request to:

```text
requests/<receiver-username>/<request-id>
```

6. The sender sees `Request sent` and cannot send messages.

### Receiver flow

1. The receiver listens to `requests/<receiver-username>`.
2. A pending request creates a local chat with `pending-received` status.
3. The receiver opens the chat and sees **Accept** and **Decline**.
4. Accepting changes the local chat to `active` and writes an acceptance event to:

```text
requestEvents/<sender-username>/<request-id>
```

5. The sender listens for that event and changes its chat to `active`.
6. Only then does the composer appear for the sender.

## 9. Realtime Text Messages

Messages are sent through the receiver inbox:

```text
inbox/<receiver-username>/<message-id>
```

A sent message contains values such as:

```json
{
  "id": "msg-abc123",
  "chatId": "dm:alice:bob",
  "sender": "alice",
  "senderUid": "firebase-auth-uid",
  "to": "bob",
  "kind": "text",
  "text": "Hello",
  "createdAt": 1789747486586,
  "receipt": "delivered",
  "reactions": []
}
```

The sender adds the message optimistically to the local Zustand store. The receiver gets it through the `onChildAdded()` inbox listener and the store creates or updates the direct chat.

Optional fields such as `replyToId` are only added when they have a value. Firebase Realtime Database rejects `undefined` values.

Incoming messages are normalized before entering the store. Missing legacy fields such as `reactions` receive safe defaults, preventing a malformed old message from blanking the conversation screen.

## 10. Message Gating

`ConversationScreen` computes:

```text
requestStatus !== active => gated conversation
```

When gated:

- The receiver sees Accept/Decline controls if the request is incoming.
- The sender sees the pending request message.
- The composer is not rendered.
- `sendMessage()` also rejects sends for non-active chats as a second safety check.

## 11. Firebase Database Rules

The rules default to deny:

```json
".read": false,
".write": false
```

Authenticated users can then access only the specific paths they need:

- `users`: authenticated directory read; profile writes require matching `ownerId`.
- `presence`: authenticated read; users can write only their own presence.
- `inbox`: only the profile owner can read their inbox; writes require an authenticated sender profile.
- `requests`: only the receiver can read incoming requests; only the sender can create a request addressed to that receiver.
- `requestEvents`: only the intended sender can read acceptance events; only the receiver can write an acceptance event.
- `messages`: retained message archive writes are constrained by sender ownership, although the active client delivery path uses the authorized inbox.

Publish rules after any changes:

```bash
firebase deploy --only database --project tangent001
```

## 12. Local and APK Builds

Local web development:

```bash
cd app
npx expo start --web
```

Android preview APK:

```bash
cd app
npx eas build -p android --profile preview
```

For an APK, Firebase environment values must be available to the EAS build environment. A local `.env.local` is enough for local Expo development but is not automatically available to a remote EAS build.

## 13. Current Limitations

- Google sign-in is currently implemented for the web flow. Native Google sign-in requires native Firebase app registrations and OAuth configuration.
- Message delivery is realtime through inbox records. Read receipts, reactions, edits, and deletes are currently primarily local UI/store behavior and need additional Firebase event paths for full cross-device synchronization.
- Presence is stored as a boolean and does not yet use Firebase `onDisconnect()` cleanup.
- Media, voice notes, and calls are not part of the current reliable text-chat path.
- Firebase Realtime Database does not automatically provide end-to-end encryption. The UI currently displays an encryption label, but cryptographic E2E is not implemented by this client.
