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

---
Task ID: 10
Agent: main
Task: Rearrange layout to Peerlist-style 3-column grid.

Work Log:
- VLM-analyzed the Peerlist.io reference screenshot for exact structure: full-width sticky header (logo left, auth right) + 3-col grid (220px / 1fr / 320px) centered at ~1280px, view title in center column (not header), sticky sidebars below header.
- Created new `header.tsx`: slim full-width sticky header — Logo left, Docs/Bell/Log in/Invite founder right, live-ticker strip below. Removed view title (moves to center).
- Created new `view-header.tsx`: slim center-column header (Peerlist "Scroll"-style) — view title + mono route code + subtitle + optional CTA action on the right. Sticky at top-[84px].
- Reworked `sidebar.tsx`: removed Logo from top (it's in the header now); sidebar is now a sticky grid cell (top-[84px], h-[calc(100vh-84px)], overflow-y-auto) on lg+, fixed drawer on mobile.
- Reworked `right-rail.tsx`: visible on lg+ (was xl), sticky grid cell with scroll.
- Reworked `preship-app.tsx`: Header (full width) → main with `grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-6` max-w-[1280px] centered → Footer.
- Updated all 4 views to remove the dark hero strips; each now renders a <ViewHeader> at top with the view's CTA (broadcast/host/join/add) in the action slot. War Room keeps composer+tabs+feed; Synergy keeps filters+cards; IdeaLab keeps live+upcoming sections (single-column cards in narrower center); Projects keeps scope+stage filters (single-column cards).
- Removed old `topbar.tsx`.
- Lint clean. Agent Browser verified: 3-col grid renders, logo in header, right rail visible alongside center, view title in center, all 4 views switch correctly with contextual right-rail swaps. VLM confirmed structure matches Peerlist.

Stage Summary:
- Layout now matches Peerlist.io: full-width sticky header + centered 3-col grid (220/1fr/320) + sticky sidebars. On-brand Preship styling preserved (white/lime/ink, Funnel Display, live ticker, developer aesthetic).

---
Task ID: 11
Agent: main
Task: Add subtle shadows and hover animations for responsive feel.

Work Log:
- Added a shadow + interaction utility system to globals.css:
  - `.terminal-card` now has a subtle ink-tinted default shadow `0 1px 2px rgba(14,25,9,0.06), 0 2px 6px rgba(14,25,9,0.04)` + 200ms transition on box-shadow/transform/border-color.
  - `.hover-lift` for clickable cards: on hover, lifts `-2px` with `0 8px 20px rgba(14,25,9,0.12)` shadow; active presses back flat.
  - `.hover-row` for list rows: 150ms bg-color transition to accent tint.
  - `.tactile` (lift on hover, scale on press) and `.tactile-flat` (scale-only on press, for dense rows/pills).
  - `.cta-lime` — lime CTAs get a soft lime glow `0 4px 12px rgba(218,255,1,0.45)` + 1px lift on hover.
  - `.cta-ink` — ink CTAs get a deeper `0 4px 12px rgba(14,25,9,0.18)` shadow on hover.
- Applied utilities across all interactive surfaces:
  - Header: Docs/Bell (tactile-flat + icon scale), Log in (cta-ink), Invite founder (cta-lime).
  - Sidebar nav: primary nav items (tactile-flat + icon scale-110 on hover + active shadow), secondary nav, user card (hover border+shadow), manage→ link.
  - War Room: PostComposer mode tabs (tactile-flat + active shadow), record button (tactile + lime glow hover), SHIP POST (cta-lime), feed reaction buttons (tactile-flat + icon scale-110 on hover), share/more buttons, comment rows (hover border+bg).
  - Waveform player: play button (tactile + scale-110 + lime glow), seek bars (hover scale-y + opacity).
  - Synergy: SynergyCard (hover border), expand button (tactile-flat + chevron rotate), offer handshake button (cta-lime), accept handshake (cta-ink), offer list rows (hover shadow), broadcast/offer dialog CTAs (cta-lime).
  - IdeaLab: SessionCard (hover-lift + live red glow variant), ENTER affordance (group-hover gap+color+arrow translate), host/join CTAs (cta-lime/outline), session detail mic/hand controls (tactile + lime glow when active), invite-code copy (tactile-flat), go-live/join-live (cta-ink), speaker tiles.
  - Projects: ProjectCard (hover border + lift shadow), add CTA (cta-lime), dialog stage/category pickers (tactile-flat).
  - Right rail: founder list rows (hover-row + follow→ tactile-flat), trending post rows (hover-row), my-projects rows (hover-row).
  - Filter tabs in all views (tactile-flat + active shadow).
- Verified via Agent Browser + getComputedStyle:
  - terminal-card default shadow present: `rgba(14,25,9,0.06) 0px 1px 2px, rgba(14,25,9,0.04) 0px 2px 6px` with `box-shadow 0.2s, transform 0.2s, border-color 0.2s` transition.
  - hover-lift on session card: on hover, transform → `matrix(1,0,0,1,0,-2)` (translateY(-2px)) + lift shadow.
  - cta-lime on Ship post button: on hover, shadow → `rgba(218,255,1,0.45) 0px 4px 12px, rgba(14,25,9,0.08) 0px 2px 4px` + transform `matrix(1,0,0,1,0,-1)`.
- Lint clean. No runtime errors. VLM confirmed no regressions to layout/colors.

Stage Summary:
- App now feels responsive: cards have subtle depth, buttons lift+glow on hover, nav icons scale, list rows tint, waveform bars respond. Shadows are ink-tinted (not gray) to match the brand. Hover transitions are 150-200ms ease-out; press feedback is 100-120ms scale.

---
Task ID: 12
Agent: main
Task: Readability & spacing pass — dev-tools-grade typography (Linear/Vercel/GitHub caliber).

Work Log:
- Established a type scale in globals.css: body 15px / line-height 1.55; p line-height 1.6; antialiased font smoothing; text-rendering optimizeLegibility. Bumped --radius from 0.5rem to 0.625rem. Bumped label-mono from 0.6875rem to 0.75rem.
- Eliminated all text-[9px] (16 instances) and text-[10px] (110 instances) → text-[11px] via global sed, then bumped all remaining text-[11px] → text-xs (12px) — 222 instances now at 12px.
- Bumped view-level spacing: space-y-4 → space-y-5 across all 4 views. Page padding px-4 py-5 → px-5 py-8 lg:px-8. Max-width 1280→1320. Grid gap-6→gap-8. Right rail space-y-4→space-y-5.
- Header: h-14→h-16, button text text-[11px]→text-xs, icons 14→15px, gaps tightened. Updated all sticky offsets from top-[84px]→top-[96px] to match new header height.
- ViewHeader: title text-xl→text-2xl, subtitle text-xs→text-[13px], py-3→py-4, mb-4→mb-6, -mx-4→-mx-5 lg:-mx-8.
- Sidebar: nav px-2.5 py-2 → px-3 py-2.5, label text-sm→text-[15px], icons 16→17px, space-y-0.5→space-y-1, section headers text-[11px]→text-xs. User card m-3→m-4, p-3→p-3.5, avatar 36→40, name text-sm→text-[15px].
- FeedPost: header p-4→p-5, gap-3→gap-3.5, author name text-sm→text-[15px], handle/timestamp text-xs→text-[13px], body text text-[15px]→text-[16px] with leading-[1.65], tags gap-1→gap-1.5, reaction buttons px-2 py-1→px-2.5 py-1.5 text-xs→text-[13px], icons 15→16px. Comments: p-3→p-4, avatar 24→28, name text-xs→text-[13px], body text-xs→text-[13px] leading-relaxed, input h-9 text-[13px].
- PostComposer: tabs px-2 py-1→px-2.5 py-1.5, body p-4→p-5, textarea text-base→text-lg min-h-88→96, tags input h-9 w-44→w-48, select h-9, ship button h-9.
- Badges: StageChip px-2 py-0.5→px-2.5 py-1, BountyBadge text-[11px]→text-xs, RoleBadge px-2 py-0.5→px-2.5 py-1, Tag px-1.5 py-0.5→px-2 py-1, StatusPill px-2.5 py-1→px-3 py-1 dot 1.5→2px, TerminalHeader px-3 py-2→px-4 py-2.5.
- Right rail: all widget content bumped — founder names text-xs→text-[13px], avatars 28→30, trending body text-xs→text-[13px] leading-relaxed, Stat value text-xl→text-2xl p-2.5→p-3, bounty-mix/stage-distribution bars h-1.5→h-2, labels text-[11px]→text-xs, how-synergy-works text-xs→text-[13px] leading-relaxed.
- SynergyCard: p-4→p-5, avatar 40→44, title text-base→text-lg, bottleneck/need blocks p-2.5→p-3.5 text-xs→text-[13px], bounty terms p-2.5→p-3.5 text-xs→text-[13px], gaps mt-2.5→mt-3/3.5.
- SessionCard: cover px-4 py-3→px-5 py-4, title text-base→text-[17px], body p-4→p-5, thesis text-xs→text-[13px], host name text-xs→text-[13px], border /12→/15 for sharper definition.
- ProjectCard: p-4→p-5, mark 44→46, title text-base→text-lg, tagline text-xs→text-[13px], description text-xs→text-[13px], stage rail py-3→py-3.5, footer py-2.5→py-3.
- View CTAs bumped to h-9 text-xs. Filter tabs px-3 py-1.5→px-3.5 py-2.
- Verified via getComputedStyle: body 15px/23.25px (1.55 LH), h1 24px, feed post body 16px/26.4px (1.65 LH). VLM confirmed 3/4 screens clearly pass dev-tools-grade; synergy borderline but fixed with p-5 + 13px secondary text.

Stage Summary:
- App now has comfortable, readable typography: body 15-16px at 1.55-1.65 line-height, metadata 12-13px, generous p-5 card padding, space-y-5 section spacing. Feels clean, low-fatigue, sharp — matching Linear/Vercel/GitHub caliber. No text below 12px anywhere. Lint clean, no runtime errors.
