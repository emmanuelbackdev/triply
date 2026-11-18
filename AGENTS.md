This is an Expo/React Native mobile application (iOS, Android and web). Prioritize mobile-first patterns, performance, and cross-platform compatibility.

The v1 roadmap lives in `plan.md`. Check off items there as they ship.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently SDK 58).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

The same applies to every library in the tech stack below. Read the current docs (or the matching skill) before writing integration code.

## Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| App framework | Expo SDK 58 + Expo Router | Package manager is **npm** (`package-lock.json`) |
| Navigation | Expo Router **native tabs** + native `Stack` | Never JavaScript tabs. See [Navigation & Routing](#navigation--routing) |
| Styling | Nativewind v4 (Tailwind CSS 3) | `className` on RN components. Config in `tailwind.config.js` and `global.css` |
| Auth | Clerk (`@clerk/expo`) | Apple and Google sign-in only |
| Database | Neon Postgres | `DATABASE_URL` in `.env`, server only |
| ORM | Drizzle ORM + Drizzle Kit | Neon serverless driver |
| Background jobs | Inngest | Local Dev Server only for now |
| Images | ImageKit | Optimize/transform via ImageKit URLs, render with `expo-image` |
| Errors & monitoring | Sentry (`@sentry/react-native`) | Initialized in `src/app/_layout.tsx` |
| Build & deploy | EAS Build / Update / Hosting | |

### Styling (Nativewind)

- Style with Nativewind `className`. Don't add `StyleSheet.create` or another styling library unless Nativewind can't express the style.
- Add design tokens (colors, fonts, spacing) to `theme.extend` in `tailwind.config.js` instead of hard-coding the same values across components.
- `tailwind.config.js` `content` covers `./src/**/*`. If you add class names outside `src/`, add that path too.
- After changing `babel.config.js`, `metro.config.js` or `tailwind.config.js`, restart Metro with `npx expo start --clear`.

### Auth (Clerk)

- Use `@clerk/expo` with `expo-secure-store` as the token cache. `ClerkProvider` wraps the root layout.
- Sign-in methods are Apple and Google only. No email/password.
- Before writing Clerk code, load the matching skill from `.claude/skills/` (`clerk-expo` for the app, `clerk-webhooks` for webhooks, `clerk-backend-api` for server calls).
- API routes verify the Clerk session token (Bearer) with `@clerk/backend`. Never trust a user ID sent in the request body.

### Database (Neon + Drizzle)

- The DB client and schema live in `src/server/db/`. Generate migrations with Drizzle Kit. Never edit applied migrations by hand.
- `users` rows are keyed by the Clerk user ID (`clerk_user_id`, unique) and store email, name and image URL.
- `DATABASE_URL` and all other secrets are server-only. Never prefix a secret with `EXPO_PUBLIC_`, and never import `src/server/**` from client code.

### Background jobs (Inngest)

- **Development mode only for now.** Do not configure `INNGEST_EVENT_KEY` or `INNGEST_SIGNING_KEY`, and don't add production or deployment config. Run the local Inngest Dev Server against the app's serve endpoint at `/api/inngest`.
- The Inngest client and functions live in `src/server/inngest/`.
- Make steps idempotent. Running a function twice must give the same result.
- Report function failures to Sentry.

**User sync flow:** Clerk `user.created` webhook → `POST /api/webhooks/clerk` (verify the signature, then send an Inngest event) → Inngest function → insert the user into Neon with Drizzle. The webhook handler only verifies the signature and enqueues. It does no DB work itself. Locally, Clerk reaches the webhook through an ngrok URL that the user provides. Never hard-code that URL.

### Images (ImageKit)

- Build ImageKit URLs (resize, format, quality) through one shared helper. Don't hand-concatenate transformation strings in components.
- Render remote images with `expo-image`, using placeholders and caching.
- Keep photo credits where the image source requires them.

### Errors & monitoring (Sentry)

- `Sentry.init` and `Sentry.wrap` live in the root `src/app/_layout.tsx`. Don't initialize Sentry anywhere else in the app.
- `metro.config.js` composes Sentry and Nativewind as `withNativeWind(getSentryExpoConfig(__dirname), …)`. Keep both wrappers if you edit it.
- `SENTRY_AUTH_TOKEN` lives in `.env.local` locally (gitignored) and as an EAS environment variable for builds. Never commit it.
- Capture unexpected errors with `Sentry.captureException`. Don't swallow errors silently.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present). This project currently uses npm.

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server (add --clear after config changes)
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/`: every file there is a screen, and `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Always use native tabs

This project **always** uses native tabs for tab navigation. **Never** use the JavaScript `<Tabs />` navigator from `expo-router` (or `expo-router/js-tabs`), and never use a JS tab library such as `@react-navigation/bottom-tabs`.

- On SDK 58, import from `expo-router/native-tabs` (not `unstable-native-tabs`, which is for SDK 54–57):

  ```tsx
  import { NativeTabs } from "expo-router/native-tabs";

  export default function TabLayout() {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  ```

- Every tab must be declared with a `NativeTabs.Trigger`. Tabs are not added automatically.
- For headers and pushed screens inside a tab, nest a native `<Stack />` layout inside that tab.
- Native tabs can't be nested inside other native tabs, and Android allows at most 5 tabs.
- On web, native tabs fall back to a basic layout. If web needs a custom layout, add a `_layout.web.tsx` using headless tabs from `expo-router/ui`, and keep native tabs on iOS and Android.
- Check the current API before writing tab code: https://docs.expo.dev/router/advanced/native-tabs.md

## Server code (API routes)

- Backend endpoints are Expo Router API routes (`+api.ts` files under `src/app/api/`). `app.json` already sets `web.output: "server"`.
- Keep the actual logic in `src/server/` and keep route files thin.
- Validate request input before using it, and return consistent JSON errors.

## Implementing UI from a design

When asked to build a screen from a reference design (for example a file in `design/`):

1. Match the reference closely: layout, spacing, typography (sizes and weights), colors and gradients, buttons, inputs, border radius, shadows, icons, imagery and cropping. Don't redesign or improvise unless something is missing from the reference.
2. Use the existing structure and Nativewind tokens.
3. Run the app in the simulator, take a screenshot, and compare it strictly against the reference.
4. List every visual difference, fix them, then screenshot and compare again. Repeat until the two are nearly identical. Don't stop after the first implementation.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. This app uses native modules (Sentry, Reanimated, Clerk), so it needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Never commit secrets. `.env*.local` is gitignored. Only `EXPO_PUBLIC_*` variables reach the client bundle.
