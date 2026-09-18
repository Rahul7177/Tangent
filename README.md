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

## Realtime chat with Firebase

Tangent uses Firebase Authentication and Realtime Database directly from the Expo client. No
server or payment card is required for the Firebase Spark plan.

1. Create a Firebase project at https://console.firebase.google.com.
2. Add a Web app in **Project settings → Your apps**.
3. Enable **Authentication → Sign-in method → Anonymous**.
4. Create a **Realtime Database** in the region closest to your users.
5. In **Realtime Database → Rules**, paste the contents of `database.rules.json` and publish.
6. Copy `.env.example` to `.env.local` and fill it with the Web app config values.
7. Start the app with `npx expo start --web` or build it with EAS.

The Firebase web config is safe to include in the client bundle. The database rules and Firebase
Authentication are the security boundary; do not put service-account JSON or private keys in the
Expo app. Firebase stores users, presence, inbox messages, and conversation messages persistently.

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
