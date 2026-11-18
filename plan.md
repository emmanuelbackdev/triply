# Triply: v1 Implementation Plan

This is the to-do list for building Triply v1. Check a box (`- [x]`) when that item is done and verified.
A phase is done when all of its boxes are checked and lint and typecheck pass.

**Stack:** Expo SDK 58 (Expo Router, npm) · Clerk · Neon Postgres + Drizzle · Inngest · Claude Sonnet 5.5 · Unsplash/Pexels + ImageKit · Expo push · Sentry · EAS Build/Hosting/Update

---

## Spec reference (decided in the interview)

- **Platforms:** iOS, Android and web. Web has no map and no push notifications.
- **UI:** native-first look and feel.
- **Auth:** Apple and Google sign-in through Clerk. There is no email sign-in.
- **Trip form:**
  - Destination (free text; the AI checks it)
  - Days (1–14)
  - Travelers (1–10)
  - Budget tier: Budget / Moderate / Luxury
  - Interest chips, optional: Food, Culture, Nature, Nightlife, Shopping, Adventure
  - Pace: Relaxed / Balanced / Packed
- **Generation:** runs in the background with Inngest, shows step-by-step progress, and sends a push notification when the trip is ready.
- **Trip detail:** a cover photo, then each day's activities. Each activity has a time slot, cost in local currency plus USD, and coordinates. A map shows each day's places on native only.
- **Limits:** 3 trips per user per UTC calendar month. Failed trips don't count. Only 1 trip can generate at a time.
- **Trips after creation:** read-only, but you can delete them. You can also delete your account.
- **Not in v1:** editing or regenerating trips, sharing, offline use, hotels and flights, payments, analytics beyond Sentry, translations, guest mode.

---

## Phase 0: Foundation & verification spikes
Checks to run before building on any assumption about how these tools work.

- [ ] Read the Expo SDK 58 docs (`https://docs.expo.dev/versions/v58.0.0/`) and `https://docs.expo.dev/llms.txt`
- [ ] Set up the project structure: routes in `src/app/`, everything else in `src/components`, `src/lib`, `src/hooks`, `src/server`
- [ ] Add the theme and design tokens (native-first, light and dark)
- [ ] Add env var handling: `EXPO_PUBLIC_*` for the client and server-only secrets for API routes; add `.env.example`
- [ ] **Spike:** deploy a test API route to EAS Hosting and confirm these packages work there: the Neon serverless driver, `@clerk/backend`, the Anthropic SDK, the Inngest serve handler and Sentry. Also confirm request time limits
- [ ] **Spike:** decide whether photos come from Unsplash or Pexels. Unsplash's API rules require hotlinking and download tracking, which may conflict with an ImageKit proxy
- [ ] **Spike:** pick expo-maps or react-native-maps for SDK 58 and note the Android Google Maps key requirement
- [ ] Set up EAS: `eas init`, plus `development` / `preview` / `production` profiles in `eas.json`
- [ ] Make the first development build for iOS and Android. Expo Go won't work because the app uses native modules

## Phase 1: Database (Neon + Drizzle)
- [ ] Create the Neon project with a `main` branch for prod and a `dev` branch
- [ ] Install Drizzle ORM, Drizzle Kit and the Neon serverless driver
- [ ] Schema `users`: `clerk_user_id` (unique), `email`, `name`, `image_url`, `plan` (default `free`), timestamps
- [ ] Schema `push_tokens`: `user_id` (FK, cascade), `token` (unique), `platform`, timestamps
- [ ] Schema `trips`:
  - Status: `status` enum, `progress_step`, `error_code`
  - Inputs: `destination_input`, `days`, `travelers`, `budget_tier`, `interests`, `pace`
  - Resolved by the AI: `destination_name`, `country`, `country_code`, `currency`, `lat`, `lng`, `summary`, `cover_image_url`, `cover_image_credit`
  - Usage and timing: `model`, `input_tokens`, `output_tokens`, `generation_ms`, `created_at`, `completed_at`
- [ ] Schema `trip_days`: `trip_id` (FK, cascade), `day_number` (unique per trip), `title`, `summary`, `image_url`, `image_credit`
- [ ] Schema `activities`: `day_id` (FK, cascade), `position`, `time_slot`, `name`, `description`, `category`, `address`, `lat`, `lng`, `duration_minutes`, `est_cost_local`, `est_cost_usd`, `image_url`, `image_credit`
- [ ] Indexes: `trips(user_id, created_at desc)`, `trips(user_id, status)`
- [ ] Add DB constraints: days 1–14, travelers 1–10, plus the enums
- [ ] Generate the migration and apply it to the `dev` branch
- [ ] Add a shared DB client module in `src/server/db`

## Phase 2: Authentication (Clerk)
- [ ] Create a Clerk app with development and production instances. Turn on Google and Apple and turn off email
- [x] Install the Clerk Expo SDK and `expo-secure-store` as its token cache. Check the current Clerk Expo docs first
- [x] Wrap the root `_layout.tsx` in `ClerkProvider`
- [x] Build the welcome screen: hero, tagline, Continue with Apple, Continue with Google
- [ ] Wire up the Apple and Google OAuth flows on iOS, Android and web, including redirect URLs and the app scheme
- [x] Add route protection: signed-out users go to welcome and signed-in users go to the `(app)` group
- [ ] Add server auth: verify the Clerk session JWT (Bearer) in API routes with `@clerk/backend`
- [ ] Upsert the `users` row the first time an authenticated request comes in
- [ ] Add a `POST /api/webhooks/clerk` handler that verifies the signature and handles `user.deleted`
- [ ] Add sign out

## Phase 3: API foundation
- [ ] Shared helpers for API routes: auth guard, zod input validation, consistent JSON errors, ownership checks
- [ ] Typed API client on the client: fetch wrapper that attaches the Clerk token
- [ ] Install TanStack Query and add the provider
- [ ] `GET /api/me`, which returns the profile plus quota (`used`, `limit`, `resetsAt`)

## Phase 4: Trip creation & quota
- [ ] Shared zod schema for trip input, used by both the form and the API
- [ ] `POST /api/trips`, which:
  - validates the input
  - enforces the quota (3 per UTC month, excluding failed trips)
  - rejects the request if the user already has a trip that is queued or generating
  - inserts the trip with status `queued`
  - sends the Inngest event `trip/generate.requested` with event id = trip id
  - returns `{ tripId }`
- [ ] Trip form screen: destination, days stepper, travelers stepper, budget tier, interest chips, pace
- [ ] Show the quota on Home and on the form, and block the form when the quota is used up
- [ ] On submit, navigate to `/trips/[id]`

## Phase 5: Generation pipeline (Inngest + Claude)
- [ ] Install Inngest and serve it at `/api/inngest` using the handler confirmed in Phase 0
- [ ] Set up the local Inngest Dev Server workflow
- [ ] Create the `generate-trip` function with a concurrency limit of 1 per user
- [ ] Step `mark-generating`: update `status` and `progress_step`
- [ ] Step `resolve-destination`: Claude turns the free text into a canonical name, country, ISO code, currency and coordinates, or rejects it as `INVALID_DESTINATION`, which is a non-retryable error
- [ ] Step `generate-itinerary`:
  - call Claude Sonnet 5.5 (`claude-sonnet-5-5`) and force the output to match our structure using tool or JSON-schema mode
  - validate the result with zod and retry if it's invalid
- [ ] Prompt design covering interests, pace, budget tier, traveler count, local currency plus USD estimates and time slots, and a note that the content is AI-generated
- [ ] Check coordinates: every activity's lat/lng must fall inside the destination's bounding area
- [ ] Step `persist`: one transaction that replaces the trip's days and activities, sets `completed`, and records tokens and latency. Running it twice must give the same result
- [ ] `onFailure`: set `failed` and `error_code`, and report to Sentry
- [ ] Guard against prompt injection: limit input length and keep user text inside a clearly separated part of the prompt

## Phase 6: Images (Unsplash/Pexels + ImageKit)
- [ ] Image provider client for the source picked in Phase 0
- [ ] Step `fetch-images`: one cover image for the trip plus an image per day or per activity. If no image is found, skip it and never fail the trip
- [ ] Store the photo credit (photographer and link) and show it in the UI
- [ ] Set up the ImageKit URL endpoint and a helper that builds resize and format transform URLs, staying within the photo source's terms
- [ ] Render images with `expo-image` using placeholders and caching

## Phase 7: Progress & Home
- [ ] `GET /api/trips`: the user's trips, newest first
- [ ] `GET /api/trips/:id`: a trip with its days and activities, checked for ownership
- [ ] Progress screen on `/trips/[id]` while the trip is queued or generating: step-by-step progress, polling every ~2.5s, and polling stops when the trip finishes
- [ ] Home: empty state with a "Plan a trip" CTA, and a trip list with "Generating…" and "Failed" cards
- [ ] Failed state: a friendly reason and a "Try again" button that pre-fills the form

## Phase 8: Trip detail & map
- [ ] Detail layout: hero image, summary, day selector, activity cards (time slot, description, local + USD cost, duration)
- [ ] Native map component (`.native.tsx`): pins for the selected day, and tapping a pin focuses its card
- [ ] Web fallback (`.web.tsx`): list only, with an "Open in Google Maps" link per activity
- [ ] Android Google Maps API key set up through the config plugin in `app.json`
- [ ] Label trips as "AI-generated, verify before you go"
- [ ] `DELETE /api/trips/:id` and a delete action with a confirmation step

## Phase 9: Push notifications (native only)
- [ ] Install `expo-notifications`, add its config plugin, and set up the EAS projectId
- [ ] Ask for notification permission at a sensible moment, such as the first time the user taps Generate
- [ ] `POST /api/push-tokens` to register or refresh the device token
- [ ] Inngest step `notify`: send a push through the Expo Push Service when a trip completes and when it fails
- [ ] Remove tokens that Expo reports as invalid, such as `DeviceNotRegistered`
- [ ] Tapping a notification deep-links to `/trips/[id]`, including when the app was closed
- [ ] Skip all push code on web

## Phase 10: Account & settings
- [ ] Settings screen: profile, quota, sign out, Delete account
- [ ] `DELETE /api/me`: delete all of the user's data (cascade) and the Clerk user. Apple requires this
- [ ] Privacy policy and AI-content disclaimer, linked from settings and welcome

## Phase 11: Observability (Sentry)
- [ ] Add `@sentry/react-native` with the Expo config plugin and upload source maps through EAS
- [ ] Sentry in API routes, using the setup confirmed for EAS Hosting in Phase 0
- [ ] Report Inngest function failures to Sentry with tags for trip id and step
- [ ] Track release health, and scrub user PII
- [ ] Log generation metrics in the database (tokens, latency, failure codes) for cost tracking

## Phase 12: Web
- [ ] Check every screen at phone and desktop widths
- [ ] Clerk OAuth redirects work on web
- [ ] The map and push fallbacks from Phases 8 and 9 behave correctly
- [ ] Deploy the web build alongside the API routes on EAS Hosting

## Phase 13: Testing & CI
- [ ] Choose a test runner and set it up for the server code
- [ ] Unit tests: trip input validation
- [ ] Unit tests: quota and concurrency rules
- [ ] Unit tests: ownership checks on trip routes
- [ ] Unit tests: AI output schema, parser and coordinate validation
- [ ] Unit tests: the Inngest generation steps, with Claude and the image source mocked
- [ ] GitHub Actions: `npx expo lint`, `npx tsc --noEmit`, unit tests
- [ ] Manual end-to-end checklist on iOS, Android and web: sign in → generate → leave app → push → open trip → map → delete trip → delete account

## Phase 14: Release
- [ ] Production setup: Neon `main` migrations, Clerk production instance, Inngest production app and signing key, production secrets in EAS
- [ ] Deploy the production API and web to EAS Hosting
- [ ] Production builds through EAS Build, plus EAS Update channels
- [ ] App Store and Play listings: privacy policy URL, data safety and privacy labels, Sign in with Apple, account deletion, screenshots
- [ ] Submit through EAS Submit

---

## Assumptions (revisit if wrong)
1. "Ingest" means Inngest.
2. The database layer is Drizzle ORM with the Neon serverless HTTP driver.
3. The quota is 3 trips per UTC calendar month. Failed trips don't count, and only 1 trip can generate at a time.
4. Travelers range from 1 to 10 and days from 1 to 14.
5. The itinerary is stored in normalized `trip_days` and `activities` tables rather than as one JSON blob.
6. The app polls for progress every ~2.5s rather than using a realtime connection.
7. Users are synced to the database on their first API call. The Clerk webhook only handles deletion.
8. Deleting an account hard-deletes all of the user's data.
9. Activities use time slots (morning, afternoon, evening) rather than exact times.
10. Costs are AI estimates and labeled as such.
11. The Home list has no pagination in v1.

## Open risks
- Unsplash's hotlinking rules may conflict with serving its photos through ImageKit (Phase 0 spike).
- EAS Hosting's runtime may not support every server SDK, or its time limits may be too short (Phase 0 spike).
- There's no official Inngest adapter for Expo API routes, so we'll use the generic fetch handler.
- Native modules mean the app needs development builds from the start.
- The AI can invent venues or give wrong coordinates. Mitigated by the disclaimer and the coordinate check.
- Apple review requirements: Sign in with Apple, account deletion, privacy policy.
