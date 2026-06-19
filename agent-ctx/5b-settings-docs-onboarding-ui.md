# Task 5b — Settings, Docs, Onboarding UI

**Agent:** settings-docs-onboarding-ui
**Task:** Build the Settings view, Docs (glossary) view, and Onboarding wizard for the Preship Next.js 16 app.

## Files created

1. **`src/components/preship/settings/settings-view.tsx`**
   - `"use client"`. Preferences-only (not the profile).
   - Fetches `/api/preferences` via `useApi<Preferences>`.
   - 4 cards:
     - **Theme picker** — 3 buttons (System / Light / Dark) with Monitor/Sun/Moon icons; active state uses lime-on-ink, inactive is bordered white.
     - **In-app notifications** toggle (shadcn `Switch`, ink color when checked).
     - **Weekly email digest** toggle.
     - **Compact mode** toggle.
   - Each card is a `.terminal-card` with a `TerminalHeader` strip + label/description + control on the right.
   - `ViewHeader` action: `reset` (only when dirty) + `save` (only enabled when dirty). Save PATCHes `/api/preferences` with the 4 fields and toasts "Preferences saved →".
   - `dirty` is derived by comparing local prefs to the server snapshot; `synced` guard prevents the local copy from clobbering edits after a refetch.
   - Footer note nudges users to the Profile tab for identity edits.

2. **`src/components/preship/docs/docs-view.tsx`**
   - `"use client"`. Static glossary — no API calls.
   - `ViewHeader` with `title="Docs"`, `code="/docs"`, `sub="glossary · feature definitions · goals"`.
   - Manifesto strip card at the top with the "alpha war room — collaborate in broad daylight" framing.
   - 8 sections (each a `.terminal-card` with `TerminalHeader` + icon + heading + definition paragraph + "goals" bullet list with `→` arrows):
     1. The Alpha War Room (overview / manifesto) — code `WR-00`
     2. War Room (feed) — `WR`
     3. Synergy (bottleneck broadcast + bounty + handshake) — `SY`
     4. IdeaLab (invite-only audio) — `IL`
     5. Brain Dump (articles) — `BD`
     6. Projects (alpha sub-stages) — `PR`
     7. Profile (shareable + bounties gathered) — `PF`
     8. Alpha Sub-Stages — definitions for CD / PV / PT / CB / PB / PL — `AS`
   - Footer note: "more sections coming · this glossary grows with the product →".

3. **`src/components/preship/auth/onboarding-wizard.tsx`**
   - `"use client"`. Full-screen overlay (`fixed inset-0 z-50 overflow-y-auto bg-white`), `role="dialog" aria-modal="true"`.
   - Takes a `user: Founder` prop and pre-fills `name`, `handle`, `title`, `bio`, `location`, `skills`, `avatarUrl` from it.
   - Header: `<Logo />` + "Welcome to the Alpha War Room" headline + "4 quick steps · then you can broadcast" subhead.
   - 4-step progress indicator with circular nodes (active = lime, done = ink, future = bordered). Each step has an icon, title, and `step X of 4 · hint` line.
   - Steps:
     1. **Identity** — `name` + `handle` (with `@` prefix box). Validation: name non-empty; handle matches `^[a-z0-9-]{3,20}$`. Inline `AlertCircle` error text. Enter key advances when valid.
     2. **Background** — `title` + `bio` (textarea) + `location`. Optional.
     3. **Skillsets** — reuses `<SkillsEditor />` from `../profile/skills-editor`. Includes a short explanation about synergy matching.
     4. **Avatar** — reuses `<AvatarUpload />` from `../profile/avatar-upload`. Empty upload string is normalized to `null`.
   - Footer nav: "← back" (steps 2-4) + "continue →" (steps 1-3) / "complete onboarding →" (step 4). Submitting shows a `Loader2` spinner.
   - On finish: POST `/api/onboarding` with `{ name, handle, title, bio, location, skills, avatarUrl }`, set `me` in the store from the returned user, call `bump()` so every `useApi` consumer refetches (incl. `/api/me`), toast "Onboarding complete → welcome to the war room". Errors are surfaced via `toast.error`.
   - Footnote: "the alpha war room — collaborate in broad daylight".

## Supporting changes

- **`src/lib/preship-types.ts`** — added `onboarded?: boolean` to the `Founder` type. The full User row (including `onboarded`) is already returned by `/api/me` and `/api/onboarding` POST; this just makes the TS type match. Previously `preship-app.tsx` referenced `user.onboarded` without a corresponding type field (TS error).
- **`src/components/preship/preship-app.tsx`** — inlined the `needsOnboarding` check so TS narrows `user` from `Founder | undefined` to `Founder` inside the JSX `{user && !user.onboarded && user.title === "" && <OnboardingWizard user={user} />}`. The previous `const needsOnboarding = … && …` form broke narrowing because the const is a separate truthy signal — `user` stayed `Founder | undefined` in the JSX expression and TS errored on `user={user}`.

## Verification

- `bun run lint` — clean (0 errors).
- `bunx tsc --noEmit` — only pre-existing errors remain (prisma/seed.ts inference issues, `badges.tsx` BountyType import, `bounties-gathered.tsx` request property, examples/ socket.io, skills/ image-edit) plus the still-missing `./brain-dump/brain-dump-view` and `./search/search-view` modules that other agents are building. **No new errors introduced by my three files.**
- Dev server picks up the new files; only remaining compile error is `./brain-dump/brain-dump-view` (not in scope for this task).
