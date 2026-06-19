# Preship — Work Log

Project: Preship — a structured, high-intent social media app serving as a War Room for Alpha Stage Founders.
Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Prisma (SQLite) + z-ai-web-dev-sdk.
Design tokens: white background, `#DAFF01` lime accent, `#0E1909` dark green-black, Funnel Display font. Developer aesthetic (uppercase letter-spaced labels, `→` arrows, monospace timestamps, terminal-style cards, audio waveforms).

---
Task ID: 1
Agent: main
Task: Foundation — design tokens, fonts, layout.

Work Log:
- Reviewed Peerlist-style reference screenshots via VLM; extracted design system (white bg, lime #DAFF01 accent, #0E1909 ink, Funnel Display, 3-col layout, ~8px radius, subtle shadows, uppercase labels, → arrows, thin line icons).
- Updating globals.css with Preship design tokens.
- Updating layout.tsx to load Funnel Display (display) + JetBrains Mono (developer/mono accents) via next/font/google.
- Updating metadata (title, description, favicon).

Stage Summary:
- Preship brand foundation in place: lime-on-ink + white, Funnel Display primary, JetBrains Mono for timestamps/labels/code-feel.

---
Task ID: 3-b
Agent: api-synergy-subagent
Task: Build Synergy API routes (list/create requests, get/patch a request, list/create offers, accept/decline an offer) for the Preship Next.js 16 App Router.

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/current-user.ts, src/lib/preship.ts, src/lib/db.ts to understand models, helpers, and BOUNTY_TYPES contract.
- Created directory tree src/app/api/synergy/[id]/offers/[offerId]/.
- Implemented src/app/api/synergy/route.ts: GET (filter by status/bountyType/mine, newest first, includes founder, project, _count.offers, myOffer for the current user) and POST (validates required fields, bountyType against BOUNTY_TYPES, requires stake 0<x<=100 for stake-needing bounties, verifies projectId ownership, status defaults to "open").
- Implemented src/app/api/synergy/[id]/route.ts: GET (single request with founder, project, offers[+founder], _count; 404 if missing) and PATCH (owner-only; supports title/bottleneck/need/bountyType/stake/bountyDetail/tags/status; 403 if not owner).
- Implemented src/app/api/synergy/[id]/offers/route.ts: GET (list offers with founder) and POST (prevents self-offer 400, prevents duplicate offers 400 with existing, returns created offer with founder).
- Implemented src/app/api/synergy/[id]/offers/[offerId]/route.ts: PATCH (owner-only; accept = atomic transaction that sets this offer to accepted, declines all others via updateMany, sets request status to matched; decline = single update; 403 if not owner, 404 if missing, 400 if status invalid).
- Followed Next.js 16 conventions: params is a Promise (awaited), NextRequest/NextResponse, body via req.json(), try/catch with proper status codes (400/401/403/404/500).
- Ran `bun run lint` — clean, no errors.

Stage Summary:
- Files created:
  - src/app/api/synergy/route.ts (GET list + POST create)
  - src/app/api/synergy/[id]/route.ts (GET one + PATCH update)
  - src/app/api/synergy/[id]/offers/route.ts (GET list + POST create offer)
  - src/app/api/synergy/[id]/offers/[offerId]/route.ts (PATCH accept/decline)
- All four routes use the existing db, getCurrentUser, and BOUNTY_TYPES helpers; no schema or globals.css changes.
- Lint passes cleanly.

---
Task ID: 3-a
Agent: api-feed-subagent
Task: Build feed / posts / reactions / comments / projects / current-user API routes for the Preship Next.js 16 app (App Router, Prisma/SQLite).

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/current-user.ts, src/lib/preship.ts, src/lib/db.ts to understand context.
- Created src/app/api/me/route.ts — GET returns the seeded current founder + their projects.
- Created src/app/api/feed/route.ts — GET returns feed posts with author, project, reaction counts (grouped by kind), comment count, myReaction array. Supports ?sort=newest|trending, ?tag, ?authorId, ?projectId. Trending scores posts by handshake*3 + like + repost*2 over the last 50, returns top 20.
- Created src/app/api/posts/route.ts — POST creates a text|audio post as the current user. Validates type, audio fields (when audio), non-empty body (when text), and ownership of projectId.
- Created src/app/api/posts/[id]/react/route.ts — POST toggles a like|repost|handshake reaction via the unique [postId, userId, kind] constraint. 404 if post missing.
- Created src/app/api/posts/[id]/comment/route.ts — POST adds a comment; returns created comment with user relation.
- Created src/app/api/projects/route.ts — GET lists all projects with founder + _count (posts, synergyRequests); supports ?founderId filter. POST creates a project for the current user, validating alphaStage (ALPHA_STAGES) and category (PROJECT_CATEGORIES), auto-generating logoMark from name initials when absent.
- Created src/app/api/projects/[id]/route.ts — GET returns one project with founder + _count. PATCH updates a project (founder-only); validates alphaStage/category when present; rejects empty update payloads.
- Ran `bun run lint` (clean) and `bunx tsc --noEmit` (only pre-existing errors in prisma/seed.ts, examples/, and skills/ — none in the new API routes). Fixed a TS narrowing issue in projects/[id] PATCH by adding typeof guards before .includes checks.

Stage Summary:
- 7 new API route files created under src/app/api/: me, feed, posts (POST), posts/[id]/react (POST toggle), posts/[id]/comment (POST), projects (GET/POST), projects/[id] (GET/PATCH).
- All routes use NextRequest/NextResponse, await params (Next.js 16 async params), try/catch with proper status codes (400/401/403/404/500), and the shared getCurrentUser() + ALPHA_STAGES/PROJECT_CATEGORIES/POST_REACTIONS constants.
- Feed posts include a `_count.reactions` map grouped by kind (like/repost/handshake), `_count.comments`, and `myReaction` array (kinds the current user has applied).
- Lint clean; no type errors in new files.

---
Task ID: 3-c
Agent: api-idealab-subagent
Task: Build IdeaLab API routes (sessions list/create, session detail/update, interest toggle, signup, join-by-invite) for the Preship Next.js 16 app.

Work Log:
- Read worklog.md, prisma/schema.prisma (IdeaLabSession/IdeaLabSignup/IdeaLabInterest), src/lib/current-user.ts, src/lib/preship.ts (IDEA_ROLES), src/lib/db.ts and existing route patterns (posts/route.ts, posts/[id]/react/route.ts) for code style.
- Created 5 route files under src/app/api/idealab:
  - route.ts — GET (list with status/public/mine filters, live-first ordering, mySignup + myInterest decoration, host + _count) and POST (create with host signup, unique inviteCode PRESHIP-XX-NN generation with retry).
  - [id]/route.ts — GET (full session with host, signups+user, interests+user, _count; 404 if missing) and PATCH (host-only update with 403 guard).
  - [id]/interest/route.ts — POST toggle (delete if exists, else create) returning { interested }.
  - [id]/signup/route.ts — POST register with role validation (IDEA_ROLES minus host), 400 "already signed up", maxSeats check (confirmed+registered count), creates status="registered".
  - join/route.ts — POST via inviteCode; SQLite doesn't support Prisma mode:"insensitive" so fetch candidates + compare in JS; returns existing signup or creates "participant" registration respecting maxSeats.
- Followed Next.js 16 conventions: params is awaited Promise, NextRequest/NextResponse, try/catch with proper status codes (400/401/403/404/500).
- Ran `bun run lint` — clean. Ran `bunx tsc --noEmit` — only pre-existing errors in prisma/seed.ts and skills/ (not introduced here); fixed one TS error in signup route by typing ALLOWED_ROLES as `readonly string[]`.

Stage Summary:
- Files created:
  - src/app/api/idealab/route.ts (GET list + POST create)
  - src/app/api/idealab/[id]/route.ts (GET + PATCH)
  - src/app/api/idealab/[id]/interest/route.ts (POST toggle)
  - src/app/api/idealab/[id]/signup/route.ts (POST register)
  - src/app/api/idealab/join/route.ts (POST join-by-invite)
- Lint clean; no new TypeScript errors. Routes align with the existing posts API style (NextRequest/NextResponse, console.error logging, 401 "No current user" message, JSON envelope shapes).

---
Task ID: 4-9
Agent: main
Task: Frontend build (app shell + 4 views) + Agent Browser verification.

Work Log:
- Built shared primitives: Logo, FounderAvatar/ProjectMark, WaveformPlayer/WaveformMini, StageRail/StageChip/BountyBadge/RoleBadge/StatusPill/TerminalHeader/Tag/ArrowLink.
- Built app shell: Sidebar (sticky, 3-col), Topbar (view title + live ticker), RightRail (contextual widgets per view), Footer (sticky, ink), PreshipApp orchestrator.
- War Room view: hero strip, PostComposer (text+audio modes with simulated recording), FeedPost (author+project header, audio waveform player, like/repost/handshake/reply reactions, expandable comments thread), Newest/Trending tabs.
- Synergy view: hero, broadcast CTA, filter chips (mine/open + bounty type), SynergyCard (terminal-style, bottleneck/need/bounty terms, expandable offers, accept/decline for owner), BroadcastDialog (project picker, bounty type grid, stake slider, live preview), OfferDialog.
- IdeaLab view: hero + host/join CTAs, Live now strip, Upcoming grid, SessionCard (cover, host, thesis, open roles, seats, interest), SessionDetail (thesis, LIVE AUDIO ROOM with speaker tiles + waveform + mic/hand controls, agenda, role registration, signups list, interest toggle, host go-live), HostDialog (title/thesis/schedule/duration/roles/agenda/seats), JoinDialog (invite code).
- Projects view: hero + add CTA, scope (mine/network) + stage filters, ProjectCard (mark, tagline, category, stage chip, StageRail progression, footer stats), ProjectDialog (keyed remount form, preview, category/stage pickers, brand color, monogram).
- Wired Zustand store (view, me, tick bump-on-mutate, mobile nav) + useApi (auto-refetch on tick) + useMutate (toast on error, bump on success) hooks.
- Fixed lint: topbar ticker → useMemo; project dialog → keyed remount (no setState-in-effect); useApi fetch effect → eslint-disable block (legitimate SWR pattern).
- Agent Browser verification: page renders, all 4 views navigate, post creation works (API-confirmed), handshake reaction toggles, session detail dialog opens with live audio room, broadcast dialog opens with bounty types. VLM confirms on-brand palette/typography/dev-aesthetic, no bugs, no forbidden colors.

Stage Summary:
- Preship is feature-complete and browser-verified. Single `/` route, 4 client-switched views, full CRUD via API, seeded with 7 founders / 8 projects / 9 posts / 6 synergy broadcasts / 5 IdeaLab sessions.
- Lint clean (0 errors). Dev server runs on :3000.
