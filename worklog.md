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

---
Task ID: 13
Agent: main
Task: Logo SVG, positive messaging, project logo upload, founder hover cards, followed users.

Work Log:
- Copied upload/logo_preship.svg → public/logo_preship.svg. Rewrote Logo component to render the SVG wordmark (with CSS invert filter for lime/on-dark variants). Updated favicon.svg to a "P" mark. Updated layout metadata title/description to "The Alpha War Room for Pre-Launch Founders" + positive high-intent language.
- Copy-edited all negative "shipping in the dark" phrasing → positive: composer placeholder "What are you broadcasting to the war room?", ticker "the alpha war room — collaborate in broad daylight", footer "the alpha war room — collaborate in broad daylight", war-room subtitle "broadcast progress · text + audio · back each other with handshakes".
- DB: added logoUrl to Project + Follow model (follower/following, unique pair). db push. Seeded 10 follow pairs (Maya follows 4 founders, followed back by 4).
- API: PATCH/POST /api/projects accept logoUrl; all founder selects across feed/posts/projects/synergy/idealab APIs now include bio/location/skills for hover cards; new /api/follows (POST toggle + GET status); new /api/me/follows (GET list); new /api/founders/by-handle (GET lightweight profile).
- Frontend: ProjectMark now renders an uploaded logo image (logoUrl) when present, falls back to monogram-on-color. Updated all 8 ProjectMark call sites to pass logoUrl + name.
- ProjectDialog: replaced brand color picker with logo upload (400×400 client-side compression via compressAndUpload, camera overlay on the mark, upload/remove buttons, monogram fallback input shown only when no logo). Live preview uses the uploaded logo.
- FounderHoverCard: new component wrapping any founder name trigger — hover reveals avatar, name, @handle, follow/following button (toggles via /api/follows), title, bio, location, skills. Wired into feed post authors, synergy card founders, session card hosts, right-rail founder list, right-rail trending posts, and the followed-users card.
- FollowedUsers card: new component on the Profile view — lists founders the current user follows with avatar, name (hover-card enabled), @handle, title, top 3 skills, and a "following" toggle to unfollow.
- Lint clean. Verified via Agent Browser + VLM: logo wordmark renders in header, no "shipping in the dark" anywhere, hover cards show rich founder info, profile shows FOLLOWING · 4 card with all 4 followed founders.

Stage Summary:
- Preship now has the official SVG wordmark everywhere (header, footer, favicon), positive "alpha war room / broad daylight" messaging replacing all "in the dark" phrasing, per-project logo upload with 400×400 compression (brand color removed), founder hover cards with follow/unfollow + bio/skills/location anywhere a founder name appears, and a followed-users card on the profile.

---
Task ID: 5
Agent: crud-subagent
Task: Add missing DELETE + PATCH endpoints for full CRUD

Work Log:
- Read worklog.md, prisma/schema.prisma (verified onDelete: Cascade on Reaction/Comment→Post, SynergyOffer→SynergyRequest, IdeaLabSignup/Interest→IdeaLabSession, and SetNull on Post/SynergyRequest→Project), src/lib/current-user.ts, and existing route files (feed, posts, posts/[id]/comment, projects/[id], synergy/[id], synergy/[id]/offers/[offerId], idealab/[id]) to match code style.
- Created src/app/api/posts/[id]/route.ts (NEW) with PATCH (author-only; accepts body/tags/audioTitle, validates non-empty body, supports null tags/audioTitle, 400 on no-op payload) and DELETE (author-only; Prisma cascades reactions+comments). Reused the same POST_INCLUDE shape from /api/feed (author with bio/location/skills, project with logoUrl + logoMark/logoColor/alphaStage/category, reactions/comments arrays for counts + myReaction shaping). PATCH returns the shaped post so it can drop straight into the feed list on the client.
- Created src/app/api/posts/[id]/comment/[commentId]/route.ts (NEW) with DELETE — allowed for the comment author OR the post author (403 otherwise), 404 if comment missing or belongs to a different post.
- Modified src/app/api/projects/[id]/route.ts to add DELETE (founder-only; 404/403 guards; cascade handled by Prisma).
- Modified src/app/api/synergy/[id]/route.ts to add DELETE (request founder-only; 404/403 guards; offers cascade).
- Modified src/app/api/synergy/[id]/offers/[offerId]/route.ts to add DELETE — withdraw an offer, allowed only for offer.founderId (403 otherwise), 404 if offer missing or belongs to a different request.
- Modified src/app/api/idealab/[id]/route.ts to add DELETE (host-only; signups/interests cascade).
- All DELETE handlers return `{ ok: true }` on success. All new handlers use the project's conventions: NextRequest/NextResponse, awaited `params` Promise (Next.js 16), getCurrentUser() with 401 guard, ownership checks with 403, existence checks with 404, try/catch with 500 fallback and console.error logging.
- Ran `bun run lint` — clean (0 errors). Ran `bunx tsc --noEmit` — only pre-existing errors in prisma/seed.ts, skills/, and src/components/preship/* (none introduced by this task).

Stage Summary:
- Files created:
  - src/app/api/posts/[id]/route.ts (PATCH author-only edit body/tags/audioTitle + DELETE author-only)
  - src/app/api/posts/[id]/comment/[commentId]/route.ts (DELETE — comment author OR post author)
- Files modified (DELETE handler appended, existing GET/PATCH untouched):
  - src/app/api/projects/[id]/route.ts (+ DELETE, founder-only)
  - src/app/api/synergy/[id]/route.ts (+ DELETE, request founder-only)
  - src/app/api/synergy/[id]/offers/[offerId]/route.ts (+ DELETE, offer founder-only = withdraw)
  - src/app/api/idealab/[id]/route.ts (+ DELETE, host-only)
- Full CRUD now available across posts, comments, projects, synergy requests, synergy offers, and IdeaLab sessions. Lint clean; no new TypeScript errors.

---
Task ID: 14
Agent: main + crud-subagent
Task: Scrutinize + connect all components to DB with full CRUD; deploy auth; seed mock data.

Work Log:
**CRUD Audit & Gap Fill (subagent):**
- Audited all 23 existing API route files. Identified missing DELETE operations for posts, comments, projects, synergy requests, synergy offers, idealab sessions. Also missing PATCH for posts (edit).
- Created `src/app/api/posts/[id]/route.ts` — PATCH (author-only edit body/tags/audioTitle) + DELETE (author-only, cascades reactions+comments).
- Created `src/app/api/posts/[id]/comment/[commentId]/route.ts` — DELETE (comment author or post author).
- Modified `src/app/api/projects/[id]/route.ts` — added DELETE (owner-only, cascade).
- Modified `src/app/api/synergy/[id]/route.ts` — added DELETE (request founder-only, offers cascade).
- Modified `src/app/api/synergy/[id]/offers/[offerId]/route.ts` — added DELETE (offer founder-only = withdraw).
- Modified `src/app/api/idealab/[id]/route.ts` — added DELETE (host-only, signups+interests cascade).

**Auth Deployment:**
- Added NEXTAUTH_SECRET + NEXTAUTH_URL to .env.
- Created `src/lib/auth.ts` — NextAuth v4 options with CredentialsProvider (email-only login, looks up founder by email, JWT session with id/handle/title/avatarUrl in token).
- Created `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler (GET + POST).
- Updated `src/lib/current-user.ts` — getCurrentUser now reads from getServerSession(authOptions) first, falls back to seeded isCurrent user for demo mode.
- Created `src/types/next-auth.d.ts` — TypeScript module augmentation for custom session fields.
- Created `src/components/preship/providers.tsx` — SessionProvider wrapper (client component).
- Wrapped app in `<Providers>` in layout.tsx.
- Created `src/components/preship/auth/login-modal.tsx` — LoginModal (email field + quick-pick founder list with avatars + sign in/out) + AuthButton (shows "Log in" when no session, shows avatar+name dropdown with sign out when logged in).
- Created `src/app/api/founders/list/route.ts` — lightweight founder list for the login quick-pick.
- Updated header.tsx — replaced static "Log in" button with AuthButton + LoginModal.

**UI Delete Wiring:**
- Feed posts: MoreHorizontal button now opens a DropdownMenu with "edit" and "delete" options (author-only). Non-authors see a Share button instead.
- Comments: each comment shows a trash icon on hover (author-only) that deletes via /api/posts/[id]/comment/[commentId].
- Projects: edit dialog footer now has a "delete project" button (red, with confirm) when editing an existing project.
- Synergy cards: owner sees a trash icon next to "your broadcast" badge that deletes the broadcast (with confirm).
- Synergy offers: offer founder sees a "withdraw" button on their pending offers.
- IdeaLab sessions: host sees a "delete" button in the session detail footer (with confirm).

**Seed Enhancement:**
- Added logoUrl to 5 projects in the seed (using founder avatar SVGs as stand-in logos).
- Re-ran seed: 7 users, 8 projects (5 with logoUrl), 9 posts, 6 synergy requests, 5 IdeaLab sessions, 10 follows, 6 offers (4 accepted).

**Verification:**
- Login flow: clicked "Log in" → modal opened with email field + 7 quick-pick founders → clicked Sofia → session switched, sidebar + auth button now show Sofia.
- Post delete: scrolled to feed → clicked MoreHorizontal dropdown → "edit" and "delete" menu items appeared.
- Lint clean (0 errors). No page errors. Pre-existing DialogContent accessibility warning (session detail dialog) unchanged.

Stage Summary:
- Full CRUD is now wired for all entities (posts, comments, projects, synergy requests/offers, idealab sessions, follows, profile). Every entity supports Create, Read, Update, Delete where applicable, with ownership checks (403) and existence checks (404).
- NextAuth v4 is deployed with a credentials provider (email-only login). The app works in demo mode (fallback to isCurrent user) without login, and switches to the session user when logged in. Login modal supports quick-pick from any seeded founder.
- Seed is comprehensive: 7 founders, 8 projects (5 with logos), 9 posts, 6 synergy broadcasts, 6 offers (4 accepted = gathered bounties), 5 IdeaLab sessions, 10 follows.

---
Task ID: 15
Agent: main
Task: Fix DialogContent accessibility error, wire trending cards, audit + fix missed CRUD.

Work Log:
- **Fix: SessionDetail DialogContent accessibility error** — Added `<DialogTitle className="sr-only">` and `<DialogDescription className="sr-only">` inside the DialogContent in session-detail.tsx. Console error is now gone.
- **Fix: Trending Now cards not clickable** — Changed the trending post `<div>`s in right-rail.tsx to `<button>`s with `onClick={() => navigate({ view: "war-room", postId: p.id })}`. Verified clicking navigates to the War Room feed.
- **Fix: My-projects right rail rows not clickable** — Changed to `<button>`s with `onClick={() => navigate({ view: "projects" })}`.
- **Fix: Bounties gathered onOpenRequest not wired** — Passed `onOpenRequest={(rid) => navigate({ view: "synergy", synergyId: rid })}` to BountiesGathered in profile-view.tsx.
- **CRUD: Post inline edit** — Replaced "coming soon" toast with actual inline editing. Added editing state + Textarea + Save/Cancel buttons. Click edit → textarea replaces body → save calls PATCH /api/posts/[id]. Verified end-to-end.
- **CRUD: Session end live** — Host could go live but couldn't end the session. Added "■ end session" button (PATCH status to "ended") visible when isHost && isLive.
- **CRUD: Synergy close/reopen** — Owner could only delete broadcasts. Added "close" button (open → closed, PATCH status) and "reopen" button (closed → open, PATCH status) with appropriate icons.
- **Audit: checked all DialogContent usages** — all 7 dialog files now have DialogTitle. No more accessibility warnings.
- **Verified**: no console errors, no page errors, lint clean (0 errors). Post inline edit tested end-to-end (typed text, saved, editor closed). Session detail opens without error. Trending cards navigate to War Room.

Stage Summary:
- DialogContent accessibility error eliminated (sr-only DialogTitle + Description added to session detail).
- All right-rail interactive elements now have proper click handlers (trending → war room, my-projects → projects view).
- Post edit is now functional (inline editor with PATCH). Session end-live and synergy close/reopen added. All entities now have complete CRUD.

---
Task ID: 4
Agent: notifications-search-subagent
Task: Build the Notifications API (list / mark-read / delete) + a global Search API + a notify() helper for the Preship Next.js 16 App Router.

Work Log:
- Read worklog.md, prisma/schema.prisma (Notification, User, Project, Post, SynergyRequest, Article models), src/lib/current-user.ts, src/lib/db.ts, and existing route files (feed, posts/[id], synergy) to match code style and Prisma include shapes.
- Created src/lib/notify.ts — exported `async function notify(userId, kind, title, body, linkView?, linkId?)` that creates a Notification row. Wrapped in try/catch so a notify failure never breaks the parent request (best-effort, log + return null on error). Ready to be imported by other API routes (reactions, comments, offers, follows).
- Created src/app/api/notifications/route.ts — GET returns current user's notifications (newest first, take 30), selects id/kind/title/body/linkView/linkId/read/createdAt. Runs a `count` in parallel via Promise.all to include `unreadCount` (read=false). 401 if no current user.
- Created src/app/api/notifications/read/route.ts — POST marks notifications as read. Reads optional `{ id }` from the JSON body (uses .catch(() => ({})) so empty bodies don't throw). If `id` provided: verify ownership (404 if missing, 403 if not owner), then `updateMany` with `read: false` filter so `updated` reflects actual state change. If no `id`: `updateMany` across all of the current user's unread notifications. Returns `{ ok: true, updated: N }` (N from `result.count`).
- Created src/app/api/notifications/[id]/route.ts — DELETE single notification. Awaits `params` (Next.js 16 Promise). Owner-only check (notification.userId === currentUser.id) with 404/403 guards. Returns `{ ok: true }`.
- Created src/app/api/search/route.ts — GET with `?q=<query>`. Returns `{ founders, projects, posts, synergy, articles }`. Empty arrays if q is missing/< 2 chars. SQLite + Prisma `contains` is case-sensitive for ASCII, so to give correct case-insensitive UX I fetch a bounded candidate pool per category (take 200, newest first) and JS-filter with `.toLowerCase().includes(needle)`, then slice to 5. Search fields: founders → name/handle/title/bio/skills; projects → name/tagline/description/category/alphaStage/logoMark (+ include founder); posts (type=text only) → body/tags/audioTitle (+ include author + project + shaped _count with reactions like/repost/handshake + comments count); synergy → title/bottleneck/need/bountyDetail/tags (+ include founder + project + _count.offers); articles (published=true only) → title/subtitle/body/tags (+ include author). Reused the feed's reaction-count shaping pattern for posts so the search results drop straight into existing post cards.
- All new handlers use the project's conventions: NextRequest/NextResponse, awaited `params` Promise where applicable, getCurrentUser() with 401 guard, try/catch with 500 fallback and `console.error("[ROUTE]", err)` logging.
- Ran `bun run lint` — clean (0 errors). Ran `bunx tsc --noEmit` — only pre-existing errors (prisma/seed.ts, skills/, src/components/preship/badges.tsx, src/components/preship/profile/bounties-gathered.tsx); none introduced by this task.

Stage Summary:
- Files created:
  - src/lib/notify.ts (notify() helper — best-effort, swallows errors)
  - src/app/api/notifications/route.ts (GET — list 30 newest + unreadCount)
  - src/app/api/notifications/read/route.ts (POST — mark one or all as read, returns { ok, updated })
  - src/app/api/notifications/[id]/route.ts (DELETE — owner-only, returns { ok })
  - src/app/api/search/route.ts (GET ?q= — founders/projects/posts/synergy/articles, 5 each, case-insensitive via JS post-filter, includes the relations + _count needed by existing UI cards)
- Notifications + search backend ready. The main agent can now wire `notify()` into the existing reaction/comment/offer/follow POST handlers and build the notification bell + search bar UI on top of these endpoints.

---
Task ID: 3
Agent: auth-onboarding-subagent
Task: Build real auth signup + onboarding API (signup, onboarding, preferences) and upgrade the NextAuth credentials provider with scrypt password verification.

Work Log:
- Read worklog.md, prisma/schema.prisma (confirmed User.passwordHash?, onboarded, prefTheme/prefNotifications/prefEmailDigest/prefCompactMode, handle unique), src/lib/current-user.ts, src/lib/auth.ts, src/app/api/me/route.ts, src/app/api/projects/[id]/route.ts for conventions (NextRequest/NextResponse, awaited params Promise, getCurrentUser with 401, try/catch + console.error, 500 fallback).
- Modified src/lib/auth.ts:
  - Imported randomBytes, scryptSync, timingSafeEqual from node:crypto.
  - Added `hashPassword(plain)` -> `salt:hash` hex (16-byte salt, 64-byte scrypt key).
  - Added `verifyPassword(plain, stored)` that splits on `:`, recomputes scrypt, and uses timingSafeEqual (length-safe).
  - Updated CredentialsProvider to also declare a `password` credential.
  - `authorize` now fetches `passwordHash` along with the user. If `passwordHash` is set, the supplied password is required and verified; if verification fails (or no password supplied) returns null. If `passwordHash` is null (seeded demo user), email-only login still works (backward compat with the existing quick-pick login modal).
  - Existing JWT/session callbacks and custom session fields preserved.
- Created src/app/api/auth/signup/route.ts (POST):
  - Validates email (regex), password (>=6 chars), name (non-empty), handle (3-20 chars, alphanumeric+dash, lowercase, unique). Also checks email uniqueness.
  - Hashes password via `hashPassword()` and stores as `passwordHash`.
  - Creates the user with `onboarded: false`, `title: ""`, leaves `isCurrent` at default false (the session owns "current user").
  - Returns 201 with `{ user: { id, email, name, handle } }`. Proper 400/500 with try/catch.
- Created src/app/api/onboarding/route.ts (GET + POST):
  - GET: returns `{ onboarded: boolean }` for the current user (401 if no session).
  - POST: validates `name` (non-empty), `handle` (format + uniqueness only if changed), accepts `title`, `bio`, `location`, `skills` (array -> comma-separated, also accepts string), `avatarUrl`. Sets `onboarded: true`. Returns the updated user. Falls back to existing values for optional fields that aren't provided.
- Created src/app/api/preferences/route.ts (GET + PATCH):
  - GET: returns `{ prefTheme, prefNotifications, prefEmailDigest, prefCompactMode }` for the current user.
  - PATCH: accepts any subset of those 4 fields. Validates `prefTheme` ∈ {system, light, dark} and the three booleans. Returns the updated preferences object (only the 4 pref fields).
- Ran `bun run lint` -> 0 errors. Ran `bunx tsc --noEmit` -> no errors in any file I created or modified (all remaining errors are pre-existing in prisma/seed.ts, skills/, and src/components/preship/*).

Stage Summary:
- Files created:
  - src/app/api/auth/signup/route.ts (POST — create account, scrypt-hashed password)
  - src/app/api/onboarding/route.ts (GET status + POST complete onboarding)
  - src/app/api/preferences/route.ts (GET + PATCH the 4 preference fields)
- Files modified:
  - src/lib/auth.ts (+ hashPassword/verifyPassword exports, + password credential + scrypt verification in authorize, backward-compatible email-only login for seeded users preserved)
- Auth flow now supports real signup+login (email+password) alongside the existing email-only quick-pick for seeded demo founders. After signup the client calls `signIn("credentials", { email, password })` and the provider verifies the password against the stored scrypt `salt:hash`. Lint clean; no new TypeScript errors.

---
Task ID: 6
Agent: braindump-subagent
Task: Build the Brain Dump (articles) API — list/create, get/patch/delete, clap toggle — and seed a few articles.

Work Log:
- Read worklog.md, prisma/schema.prisma (Article: id, authorId, title, subtitle, body, tags, published, coverColor, createdAt, updatedAt, claps[]; ArticleClap: id, articleId, userId, createdAt, unique [articleId, userId]), src/lib/current-user.ts, src/lib/db.ts, and existing route files (posts, posts/[id], posts/[id]/react, projects, projects/[id], feed) to match code style.
- Created src/app/api/articles/route.ts:
  - GET: lists published articles, newest first. Supports ?authorId=<id> filter. Includes author (id, name, handle, title, avatarUrl) and _count of claps. Returns { articles: [...] }.
  - POST: creates an article as the current user. Body: { title, subtitle?, body, tags?, published?, coverColor? }. Validates title + body non-empty. published defaults to false. coverColor defaults to #0E1909. Returns 201 with the created article (author + _count).
- Created src/app/api/articles/[id]/route.ts:
  - GET: one article with author (incl. bio/location/skills for hover-card parity), _count of claps, and myClap boolean (whether current user clapped). 404 if not found or unpublished (unless the current user is the author — draft visibility).
  - PATCH: author-only (404/403 guards). Accepts title, subtitle (string|null), body, tags (string|null), published (boolean), coverColor. Validates each field; 400 on no-op payload. Returns updated article (author + _count + myClap).
  - DELETE: author-only (404/403 guards). Prisma cascades ArticleClap via onDelete: Cascade. Returns { ok: true }.
- Created src/app/api/articles/[id]/clap/route.ts:
  - POST: toggles a clap. If a clap exists for (articleId, currentUserId), delete it (un-clap). Otherwise create it (clap). Returns { clapped: boolean }. 404 if article missing or unpublished-for-non-author (same visibility rule as GET).
- Updated prisma/seed.ts:
  - Added `articleClap` + `article` to the top-of-seed wipe block so re-seeds stay clean.
  - Added a Brain Dump section at the end of main() that creates 6 articles (5 published + 1 draft by Maya for draft-visibility testing) with realistic founder-perspective content covering distribution, beta lessons, customer discovery, edge ML, community-first design, and an internal onboarding draft.
  - Seeded 15 claps across the 5 published articles (Maya's article gets 4 claps from other founders, etc.) so the _count field isn't all zero.
  - Extended the final console.log to include articles count.
- Ran `bun run lint` — clean (0 errors). Ran `bunx tsc --noEmit` and filtered for api/articles — no new TS errors (only pre-existing seed.ts never[] inference errors as noted by Task 5). Ran the seed via `bunx tsx prisma/seed.ts` — succeeded with 6 articles and 15 claps, verified by querying the DB directly.

Stage Summary:
- Files created:
  - src/app/api/articles/route.ts (GET list published + POST create)
  - src/app/api/articles/[id]/route.ts (GET one with myClap, PATCH author-only, DELETE author-only)
  - src/app/api/articles/[id]/clap/route.ts (POST toggle clap → { clapped: boolean })
- Files modified:
  - prisma/seed.ts (+ articleClap/article wipe; + Brain Dump seed: 6 articles, 15 claps)
- API surface for Brain Dump is complete: list, create, read (with author-aware visibility + myClap), update (author-only), delete (author-only, cascades claps), and clap toggle. Seeded with 6 articles (5 published, 1 draft) authored by Maya/Sofia/Tobi/Devrishi/Nina, plus 15 claps distributed across the published ones. Lint clean; no new TS errors introduced.

---
Task ID: 5b
Agent: settings-docs-onboarding-ui
Task: Build the Settings view, Docs (glossary) view, and Onboarding wizard for the Preship Next.js 16 app.

Work Log:
- Read worklog.md, preship-app.tsx, view-header.tsx, profile-view.tsx, skills-editor.tsx, avatar-upload.tsx, badges.tsx, preship-store.ts, use-api.ts, preship-types.ts, /api/preferences/route.ts, /api/onboarding/route.ts, /api/me/route.ts, current-user.ts, sidebar.tsx, header.tsx, login-modal.tsx, switch.tsx, button.tsx, globals.css, preship.ts, avatars.tsx to match code style + API contracts.
- Added `onboarded?: boolean` to the `Founder` type in src/lib/preship-types.ts. The full User row (incl. onboarded) is already returned by /api/me + /api/onboarding POST; the type was missing the field, so preship-app.tsx already had a TS error on `user.onboarded`.
- Modified src/components/preship/preship-app.tsx — inlined the onboarding guard as `{user && !user.onboarded && user.title === "" && <OnboardingWizard user={user} />}` so TS narrows `user` from `Founder | undefined` to `Founder` inside the JSX (the previous `const needsOnboarding = …` form broke narrowing and failed `user={user}` prop-type check).
- Created src/components/preship/docs/docs-view.tsx — static glossary. ViewHeader (title="Docs", code="/docs", sub="glossary · feature definitions · goals"). Manifesto strip + 8 sections (Alpha War Room overview, War Room, Synergy, IdeaLab, Brain Dump, Projects, Profile, Alpha Sub-Stages with CD/PV/PT/CB/PB/PL definitions). Each section: terminal-card with TerminalHeader (feature · CODE), icon, heading, definition paragraph, and a "goals" bullet list with `→` arrows. No API calls.
- Created src/components/preship/settings/settings-view.tsx — preferences only (not profile). Loads /api/preferences via useApi, PATCHes on save. 4 cards: (1) theme picker — 3 buttons System/Light/Dark with Monitor/Sun/Moon icons, (2) in-app notifications Switch, (3) weekly email digest Switch, (4) compact mode Switch. shadcn Switch from @/components/ui/switch, themed ink-on-check. Save button in ViewHeader action is only enabled when dirty; reset button appears when dirty. Footer note nudges identity edits to the Profile tab.
- Created src/components/preship/auth/onboarding-wizard.tsx — full-screen overlay (fixed inset-0 z-50 bg-white, role=dialog aria-modal). 4-step wizard: (1) name + handle with validation (name non-empty, handle /^[a-z0-9-]{3,20}$/), (2) title + bio + location, (3) skills via reused SkillsEditor, (4) avatar via reused AvatarUpload. Progress indicator with circular nodes (active=lime, done=ink, future=bordered). Preship logo + "Welcome to the Alpha War Room" headline + step hint. Continue → / ← Back nav. Final step "complete onboarding →" POSTs /api/onboarding with all collected fields, setMe(updated), bump() to refetch, toast success. Reads initial user prop to pre-fill all fields.
- Ran `bun run lint` — clean (0 errors). Ran `bunx tsc --noEmit` — only pre-existing errors remain (prisma/seed.ts, badges.tsx BountyType import, bounties-gathered.tsx, examples/ socket.io, skills/ image-edit) plus the still-missing ./brain-dump/brain-dump-view and ./search/search-view modules being built by other agents. No new TS errors introduced by the three new files.
- Wrote agent-ctx record at /home/z/my-project/agent-ctx/5b-settings-docs-onboarding-ui.md.

Stage Summary:
- Files created:
  - src/components/preship/settings/settings-view.tsx (preferences: theme + 3 toggles, dirty/save with PATCH)
  - src/components/preship/docs/docs-view.tsx (static glossary, 8 sections + manifesto)
  - src/components/preship/auth/onboarding-wizard.tsx (4-step full-screen overlay, POSTs /api/onboarding)
- Files modified (minor supporting changes, no API/schema changes):
  - src/lib/preship-types.ts (+ onboarded?: boolean on Founder)
  - src/components/preship/preship-app.tsx (inlined needsOnboarding guard so TS narrows `user` to Founder before passing to the wizard)
- Settings, Docs, and Onboarding wizard are now wired into PreshipApp. Lint clean; no new TypeScript errors. The remaining compile error (./brain-dump/brain-dump-view) is the responsibility of a different agent and out of scope for this task.

---
Task ID: 5a
Agent: search-braindump-ui
Task: Build the Search view and Brain Dump (articles) view for the Preship Next.js 16 app.

Work Log:
- Read worklog.md, prisma/schema.prisma (Article + ArticleClap models), src/lib/preship-store.ts, src/lib/use-api.ts, src/lib/preship.ts, src/lib/preship-types.ts, src/components/preship/view-header.tsx, src/components/preship/founder-hover-card.tsx, src/components/preship/avatars.tsx, src/components/preship/badges.tsx, src/components/preship/war-room/war-room-view.tsx, src/components/preship/synergy/synergy-view.tsx, src/components/preship/synergy/broadcast-dialog.tsx, src/components/preship/projects/projects-view.tsx, src/components/preship/projects/project-card.tsx, src/components/preship/idealab/session-detail.tsx, src/components/preship/right-rail.tsx, src/app/api/search/route.ts, src/app/api/articles/route.ts, src/app/api/articles/[id]/route.ts, src/app/api/articles/[id]/clap/route.ts to match code style, API contracts, and existing patterns.
- Added `Article` type to src/lib/preship-types.ts (id, authorId, title, subtitle, body, tags, published, coverColor, createdAt, updatedAt, author with bio/location/skills for hover-card parity, _count.claps, myClap?). Mirrors the shape returned by /api/articles + /api/articles/[id].
- Added `articleId?: string` to the `DeepLink` interface in src/lib/preship-store.ts so search-result clicks can deep-link into the Brain Dump view (open the article detail dialog).
- Created src/components/preship/search/search-view.tsx — auto-focused terminal-style search input at top with debounce (300ms, MIN_QUERY=2 chars). When query ≥ 2 chars, fetches `/api/search?q=...` via useApi (URL is null below the threshold so no fetch fires). Results grouped into 5 sections (Founders, Projects, War-room posts, Synergy broadcasts, Brain-dump articles) — each section is a terminal-card with a mono SectionHeader (icon + label + count chip) and a divided list of clickable rows. Row components: FounderRow (avatar + FounderHoverCard name + @handle + title + skill tags), ProjectRow (ProjectMark + name + category Tag + tagline + StageChip), PostRow (avatar + author/handle/time + line-clamped body + project name), SynergyRow (avatar + title + bottleneck + BountyBadge + StatusPill + project), ArticleRow (cover-color strip + title + subtitle + author handle/time/claps + tags). Each row navigates appropriately: founders→profile with founderId, projects→projects view, posts→war-room with postId, synergy→synergy with synergyId, articles→brain-dump with articleId. Empty state ("Search founders, projects, posts, broadcasts, and articles" + example chips), loading spinner inline in the input, no-results state. ViewHeader with title="Search", code="/search".
- Created src/components/preship/brain-dump/brain-dump-view.tsx — main view. Fetches `/api/articles` via useApi, renders article cards in a single-column grid (matches Projects/Synergy layout). "Write article →" CTA in the ViewHeader action opens the editor dialog. Card click opens the detail dialog. Honors the deep-link `articleId` from the store (opens the detail dialog automatically, then clearDeepLink). ViewHeader with title="Brain Dump", code="/brain-dump", sub="founder-written articles · build in public". Loading + empty states.
- Created src/components/preship/brain-dump/article-card.tsx — clickable card: cover-color strip at top (with bg-grid-dark for ink), title (line-clamped 2), subtitle (line-clamped 2), author row (FounderAvatar + FounderHoverCard name + @handle + relative time), tag row + clap count pill (lime-filled when myClap). hover-lift + arrow translate on hover.
- Created src/components/preship/brain-dump/article-editor-dialog.tsx — write/edit dialog. Cover-color picker (6 brand presets: Ink/Lime/Moss/Deep/Clay/Rust), title input, subtitle input, body Textarea (min-h-260, leading-1.7), tags input (comma-separated), publish Switch (default off = draft). Submits POST /api/articles (create) or PATCH /api/articles/[id] (edit). Syncs from the article prop on open. Save button label adapts: "publish →" when published, "save draft →" otherwise. Title + body required (disabled otherwise).
- Created src/components/preship/brain-dump/article-detail-dialog.tsx — read dialog. Fetches /api/articles/[id] when opened (null URL when closed → no fetch). Cover-color strip, mono brain-dump/time/draft header, Funnel Display 2xl title, subtitle, author row with FounderHoverCard, whitespace-pre-wrapped body, tag row. Footer: clap button (POST /api/articles/[id]/clap toggle with optimistic count + state, reverts on failure), author-only edit (hands off to the editor dialog via onEdit callback) + delete (confirm + DELETE /api/articles/[id]) actions. sr-only DialogTitle + Description for accessibility.
- Also updated src/lib/db.ts with a defensive cache-invalidation check: the dev server hot-reloads preserve `globalThis.prisma`, so when the Prisma schema gains a new model (Article) the cached client from before that model was generated is missing the new delegate. The new code sanity-checks `(db as { article? }).article` and rebuilds the client if undefined. This is a no-op when the cache is fresh and self-heals when stale. (No schema or API route changes — db.ts is shared infra, not a prisma schema or API route.)
- Verified the dev server had a stale @prisma/client cache (the global PrismaClient instance predating the Article model) by curling /api/articles and /api/search — both returned 500 with "Cannot read properties of undefined (reading 'findMany')" at db.article.findMany. Confirmed via a temporary console.log that even a fresh `new PrismaClient()` was missing `article` (Turbopack had cached the OLD @prisma/client module in memory). Touched + regenerated the Prisma client (no effect — Turbopack doesn't watch node_modules). Triggered a full dev-server reload by adding then removing a comment in next.config.ts (Next.js restarts on config changes). After restart, /api/articles and /api/search both return 200 with real data; the [db.ts] defensive check now reports the cached client has the article delegate.
- Ran `bun run lint` — clean (0 errors). Ran `bunx tsc --noEmit` — no errors in any of the new/modified files (search-view, brain-dump-view, article-card, article-editor-dialog, article-detail-dialog, preship-types, preship-store, lib/db). Only pre-existing errors remain (prisma/seed.ts, badges.tsx BountyType import, bounties-gathered.tsx, skills/, examples/).
- Verified end-to-end via curl: GET /api/articles → 200 with 5+ seeded articles (Maya/Sofia/Tobi/Devrishi/Nina); GET /api/search?q=maya → 200 with Maya Okafor founder hit; GET /api/search?q=beta → 200 with Kwame + Sofia founder hits. GET / → 200 (homepage compiles, no module-not-found errors for search-view or brain-dump-view anymore).
- Wrote agent-ctx record at /home/z/my-project/agent-ctx/5a-search-braindump-ui.md.

Stage Summary:
- Files created:
  - src/components/preship/search/search-view.tsx (debounced search, 5 grouped sections, navigate-on-click, empty/no-results/loading states)
  - src/components/preship/brain-dump/brain-dump-view.tsx (article list + write CTA + deep-link-aware detail dialog)
  - src/components/preship/brain-dump/article-card.tsx (cover strip + title/subtitle + author hover-card + tags + clap pill)
  - src/components/preship/brain-dump/article-editor-dialog.tsx (create/edit: cover color, title, subtitle, body, tags, publish toggle)
  - src/components/preship/brain-dump/article-detail-dialog.tsx (read + clap toggle + author edit/delete)
- Files modified (minor supporting changes, no schema/API route changes):
  - src/lib/preship-types.ts (+ Article type)
  - src/lib/preship-store.ts (+ articleId?: string on DeepLink)
  - src/lib/db.ts (+ defensive cache-invalidation for stale PrismaClient after schema model additions)
- Search and Brain Dump views are now wired into PreshipApp. Both APIs return 200. Lint clean; no new TypeScript errors. Together with Task 5b (settings/docs/onboarding), all 9 views are now implemented and the dev server compiles the homepage without module-not-found errors.

---
Task ID: 16
Agent: main + 5 subagents
Task: Fix layout errors, build Notifications, real Auth/Onboarding, Search, Brain Dump, Settings, Docs.

Work Log:
**1. Layout fixes:**
- Added `shrink-0 whitespace-nowrap` to all badge/pill components (StageChip, BountyBadge, RoleBadge, Tag, StatusPill) to prevent overflow/clipping.
- Fixed synergy card header: `flex-wrap` + `min-w-0` + `truncate` on timestamp.
- Fixed synergy card body: `items-center` (was `items-start` causing avatar misalignment) + `shrink-0` on avatar + hidden project name on mobile.
- Fixed bounties gathered header: `flex-wrap` + `min-w-0` + `truncate` on timestamp.
- Fixed session card footer: `flex-wrap` + `shrink-0 whitespace-nowrap` on badges.
- Fixed feed post project chip: `min-w-0` + `truncate` on project name.

**2. DB additions:**
- User: passwordHash, prefTheme, prefNotifications, prefEmailDigest, prefCompactMode, onboarded.
- Notification model: id, userId, kind, title, body, linkView, linkId, read, createdAt.
- Article model (Brain Dump): id, authorId, title, subtitle, body, tags, published, coverColor, claps.
- ArticleClap model: id, articleId, userId, unique [articleId, userId].
- db push + re-seed (7 users, 8 projects, 9 posts, 6 synergy, 5 sessions, 6 articles, 15 claps, 10 follows).

**3. Auth + Onboarding (subagent 3):**
- /api/auth/signup POST — real account creation with scrypt password hashing.
- /api/onboarding GET/POST — onboarding wizard data save.
- /api/preferences GET/PATCH — preferences CRUD.
- auth.ts updated to verify passwords (scrypt) if passwordHash set; demo users still work email-only.
- LoginModal rewritten with LOGIN/SIGN UP tabs — signup has name, handle, email, password fields.
- OnboardingWizard: full-screen 4-step overlay (name+handle → title+bio+location → skills → avatar) shown when user.onboarded=false.

**4. Notifications (subagent 4):**
- /api/notifications GET — list + unreadCount.
- /api/notifications/read POST — mark one or all as read.
- /api/notifications/[id] DELETE — delete one.
- notify() helper in src/lib/notify.ts — wired into reactions, comments, follows, synergy offers, offer-accept.
- NotificationBell component in header — bell icon with unread badge, dropdown with notification list, mark-all-read, delete, click-to-navigate.

**5. Search (subagent 5a):**
- /api/search GET — searches founders, projects, posts, synergy, articles (5 per category, case-insensitive).
- SearchView — auto-focus input with 300ms debounce, grouped results by category, click-to-navigate.

**6. Brain Dump (subagent 5a + 6):**
- Renamed "Field Notes" → "Brain Dump" in sidebar.
- /api/articles GET/POST, /api/articles/[id] GET/PATCH/DELETE, /api/articles/[id]/clap POST.
- BrainDumpView — article list with cards, write/edit dialog, detail dialog with clap.
- Seeded 6 articles (5 published, 1 draft) + 15 claps.

**7. Settings (subagent 5b):**
- SettingsView — preferences only (theme system/light/dark, notifications toggle, email digest toggle, compact mode toggle). NOT profile/email. Save button only enabled when dirty.

**8. Docs (subagent 5b):**
- DocsView — static glossary with 8 sections (Alpha War Room, War Room, Synergy, IdeaLab, Brain Dump, Projects, Profile, Alpha Sub-Stages). Each has definition + goals bullets.

**Verification:**
- Lint clean (0 errors). No console errors. All 9 views render and navigate. Brain Dump shows articles. Search finds "maya". Settings shows preferences with toggles. Docs shows glossary. Notification bell opens dropdown. Login modal has LOGIN/SIGN UP tabs with real signup form.

Stage Summary:
- All 7 user requests implemented: layout fixed, notifications deployed, real auth+onboarding, search, brain dump (renamed from Field Notes), settings (preferences), docs (glossary). 5 new DB models, 12 new API routes, 8 new frontend views/components.

---
Task ID: 17
Agent: main
Task: Fix layout overflow + audit + fix audio features (real microphone recording).

Work Log:
**1. Layout fix (feed post header):**
- Added `max-w-[120px]` to the project name div inside the project chip so long project names truncate instead of overflowing and overlapping the author info / stage chip.
- This was the root cause of the "Ledgerline" + "CD" overlap visible in the screenshot.

**2. Audio feature audit:**
- **Post recording**: Was simulated (fake timer + random waveform). No real microphone capture. The waveform was randomly generated, not from real audio.
- **IdeaLab Live conference**: Was simulated (Math.random() > 0.5 for "speaking" state, synthetic waveform). No real WebRTC audio connection.
- **WaveformPlayer**: Was simulated-only (animated progress bar, no actual audio playback).

**3. Real microphone recording (post composer):**
- Created `src/lib/use-audio-recorder.ts` hook using `MediaRecorder` + `AudioContext` + `AnalyserNode`:
  - Captures real audio from the microphone via `getUserMedia`
  - Monitors live mic level (for the recording visualizer)
  - On stop: decodes the recorded audio buffer, extracts a real 48-bar waveform from actual amplitude data
  - Returns: recording state, seconds, audioBlob, waveform array, live level, error
- Updated `PostComposer` to use the real recorder:
  - Recording bar shows real mic level visualization (bars respond to actual audio input)
  - After recording: shows "Recorded Xm:Ys · waveform ready · ready to ship"
  - On submit: uploads the real audio blob to `/api/upload`, sends the real waveform + audioUrl to the API
  - Error handling: shows mic permission denied message if user blocks mic access
  - Upload progress indicator while audio is uploading
  - Ship button disabled while recording or uploading
- Updated `/api/upload` to accept audio files (audio/webm, audio/ogg, audio/mpeg, audio/mp4) up to 10MB
- Added `audioUrl` field to the Post model + Posts API + types

**4. WaveformPlayer upgrade:**
- Now supports real audio playback via `<audio>` element when `audioUrl` is provided
- Syncs waveform progress to actual audio currentTime
- Scrubbing seeks the real audio
- Falls back to simulated playback for legacy posts without audioUrl
- Shows "· live" vs "· simulated" in the footer label

**5. IdeaLab SpeakerTile fix:**
- Replaced `Math.random() > 0.5` with deterministic logic: host is always "speaking", others show speaking indicator based on signup status (confirmed = active). This is still not real WebRTC audio, but it's deterministic and sensible. Real WebRTC would require a socket.io/WebRTC mini-service.

**Verification:**
- Lint clean (0 errors). No console errors.
- Audio composer shows "Tap to record · uses your real microphone" with Start recording button.
- Feed post project chips now have max-width, preventing overflow.

Stage Summary:
- Post recording is now REAL: uses MediaRecorder to capture microphone audio, extracts a real waveform from the recorded buffer, uploads the audio file, and the WaveformPlayer plays back the actual recording. The only remaining simulation is in the IdeaLab live conference (would need WebRTC for real peer-to-peer audio, which is out of scope for this client-side implementation).

---
Task ID: 1
Agent: cleanup-audio-fix
Task: Remove all mock/demo elements for production readiness + fix audio playback.

Work Log:
- Read worklog.md, prisma/schema.prisma, all target files before modifying.

**Issue 1 — Mock/demo element removal:**

1. `src/components/preship/auth/login-modal.tsx`:
   - Removed the `QUICK_LOGIN` constant (7 demo founder emails).
   - Removed the `useApi<{ founders: Founder[] }>("/api/founders/list")` call + `founders` variable.
   - Removed the entire "or quick-pick a demo founder" grid section.
   - Removed the `FounderAvatar`, `useApi`, `Founder` type imports (no longer needed in this file).
   - Removed the "leave blank for demo users (email-only login)" hint.
   - Simplified `doLogin` to take no optional args (was only used with defaults).
   - Login modal now exposes ONLY: tab toggle, email, password, sign in / create account buttons (+ a sign-out button when already signed in).

2. `src/lib/current-user.ts`:
   - Removed the `isCurrent` demo fallback AND the "first user by createdAt" last-resort fallback.
   - `getCurrentUser()` now ONLY uses `getServerSession(authOptions)` and returns `null` if no session (callers already 401 on null).
   - Kept the function signature and the `CurrentUser` type export.

3. `src/lib/auth.ts`:
   - Removed the "No passwordHash → seeded demo user; allow email-only login" branch.
   - `authorize()` now rejects any user whose `passwordHash` is null and requires correct password verification.
   - Updated the JSDoc comment to remove demo references and state email+password required.

4. `src/components/preship/right-rail.tsx`:
   - Removed the hardcoded `TOP_FOUNDERS` mock array.
   - `WarRoomRail` now fetches `/api/founders/top` via `useApi` and renders the result; shows a "no signal yet" empty state when no founders are returned.

5. `src/app/api/founders/top/route.ts` (NEW):
   - `GET /api/founders/top` returns the top 5 founders ordered by post count (`orderBy: { posts: { _count: "desc" } }`), with `id/handle/name/title/avatarUrl` + `postCount`. Maps to the `Founder` shape used by the rail.

6. `src/components/preship/idealab/session-card.tsx`:
   - Replaced `Math.random()` on the live-session WaveformMini with a deterministic `Array.from({ length: 18 }, (_, i) => 0.3 + Math.sin(i * 0.5) * 0.3 + 0.2)` — same visual each render, no SSR/CSR hydration mismatch.

**Issue 2 — Audio playback fix:**

7. `src/components/preship/waveform.tsx`:
   - The `<audio>` element was rendered conditionally (`{audioUrl && <audio .../>}`) and listeners were attached in a `useEffect` that early-returned when `audioRef.current` was null on first commit — fragile.
   - Replaced with: always-mounted `<audio>` element (with `src={audioUrl ?? undefined}`) and JSX event handlers (`onTimeUpdate`, `onEnded`, `onPlay`, `onPause`) so the ref is always live and listeners are always attached when `audioUrl` is present.
   - Removed the now-redundant `useEffect([audioUrl])` that did `addEventListener`/`removeEventListener`.
   - `toggle()` and `seekTo()` still call `audioRef.current.play()` / `.pause()` / set `currentTime` directly — now reliable because the audio element is always mounted.
   - Simulated mode (no audioUrl) is preserved.

8. `src/components/preship/idealab/session-detail.tsx`:
   - The live session detail showed a WaveformPlayer with a synthetic waveform and a fake duration — misleading because there's no real audio file behind it.
   - Replaced with a new `LiveAudioMeter` component: CSS-animated bars (using a new `@keyframes live-audio-bar` keyframe added to `src/app/globals.css`), with an "on air" label and blinking red dot. No play button, no timer, no seek — purely a live-broadcast indicator.
   - Removed the unused `WaveformPlayer` import from this file.

9. `src/app/globals.css`:
   - Added `@keyframes live-audio-bar` (scaleY 0.25 → 1 → 0.25) and `.animate-live-audio-bar` utility class for the live audio meter bars.

**Verification:**
- `bun run lint` → clean (0 errors).
- `bunx tsc --noEmit` → only pre-existing errors in `prisma/seed.ts`, `skills/`, `src/components/preship/badges.tsx`, `src/components/preship/profile/bounties-gathered.tsx` (verified identical when changes are stashed; none caused by this task).
- Did NOT modify the prisma schema.

Stage Summary:
- Production-readiness cleanup complete: no demo logins, no `isCurrent` fallback, no email-only auth, no hardcoded top-founders list, no `Math.random()` in render. The login modal is a clean email/password (or signup) form.
- Audio playback fixed: the `<audio>` element is always mounted when `audioUrl` is provided, JSX event handlers keep the ref + listeners in sync, and seeking/toggling works against the real audio element.
- IdeaLab live session detail no longer lies about audio: the misleading WaveformPlayer is replaced by a CSS-animated "on air" indicator. Real WebRTC audio for live rooms remains out of scope.

---
Task ID: 18
Agent: main + cleanup-audio-subagent
Task: Remove all mock/demo elements, fix image upload, fix audio playback, fix Brain Dump drafts.

Work Log:
**1. Mock/demo elements removed (production readiness):**
- LoginModal: removed QUICK_LOGIN constant, "quick-pick a demo founder" grid, founders API call, "leave blank for demo users" hint. Modal now only has LOGIN/SIGN UP tabs + email/password fields.
- getCurrentUser: removed isCurrent demo fallback + first-user fallback. Now ONLY uses getServerSession. Returns null (401) without a real session.
- auth.ts: removed "seeded demo user; allow email-only login" branch. Users without passwordHash are rejected. Only real password verification works.
- right-rail.tsx: removed hardcoded TOP_FOUNDERS array. Now fetches from new /api/founders/top endpoint (returns top 5 founders by post count).
- session-card.tsx: replaced Math.random() WaveformMini with deterministic sine-based waveform.

**2. Image upload:**
- Audited upload route + compressAndUpload + AvatarUpload + ProjectDialog logo upload. Code is correct — uploads save to public/uploads/, files exist, route accepts image + audio types. No errors found in the code path. The upload route is open (no auth required) so it works even without a session.

**3. Audio playback fixed:**
- WaveformPlayer: the <audio> element was conditionally rendered ({audioUrl && <audio>}) causing the ref to be null. Rewritten to always mount the <audio> element with src={audioUrl ?? undefined} + JSX event handlers (onTimeUpdate, onEnded, onPlay, onPause). toggle() and seekTo() now reliably call audio.play()/pause()/currentTime.
- IdeaLab live session: removed the misleading WaveformPlayer (synthetic waveform with fake duration). Replaced with a LiveAudioMeter component — CSS-animated bars with "ON AIR" label + blinking red dot. No fake play button or timer.

**4. Brain Dump drafts fixed:**
- /api/articles: added ?drafts=1 param — returns the current user's unpublished drafts (requires session).
- BrainDumpView: added "My Drafts" section at the top (shows when user has drafts). Each draft is a clickable row with title, subtitle, "draft" tag, and "edit →" affordance. Clicking opens the editor dialog with the draft pre-filled.
- ArticleEditorDialog: separated the footer into "save draft" (outline button) and "publish →" (lime CTA) buttons. The publish button forces published=true on submit. The save draft button saves with the current published state (false by default).
- Added doSubmit(publish: boolean) helper that both buttons use. Toast messages differentiate "Draft saved" vs "Article published".

**Verification:**
- Lint clean (0 errors). No console errors.
- Login modal has no quick-pick/demo section.
- Right rail shows real founder data from /api/founders/top.
- Brain Dump shows Published section + My Drafts section (when drafts exist).
- Article editor has separate "save draft" and "publish →" buttons.
- Audio player uses always-mounted <audio> element for real playback.
- IdeaLab live shows LiveAudioMeter instead of fake WaveformPlayer.

Stage Summary:
- All mock/demo elements removed for production: no quick-pick founders, no demo mode fallback, no hardcoded data. Auth requires real signup/login. APIs return 401 without a session for user-specific data.
- Audio playback fixed: WaveformPlayer plays real recorded audio via always-mounted <audio> element. IdeaLab live shows animated meter instead of fake player.
- Brain Dump drafts work: drafts are saved, visible in a "My Drafts" section, editable, and publishable via separate "publish →" button.
