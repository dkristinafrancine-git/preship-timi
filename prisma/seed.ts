import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// deterministic pseudo-random for stable waveform generation
function seededWave(seed: number, bars = 48): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < bars; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    // shape: louder in the middle
    const env = Math.sin((i / bars) * Math.PI);
    out.push(Math.max(0.12, Math.min(1, 0.35 + r * 0.7 * (0.4 + env))));
  }
  return out;
}

async function main() {
  console.log("Seeding Preship...");

  // wipe
  await db.ideaLabInterest.deleteMany();
  await db.ideaLabSignup.deleteMany();
  await db.ideaLabSession.deleteMany();
  await db.synergyOffer.deleteMany();
  await db.synergyRequest.deleteMany();
  await db.comment.deleteMany();
  await db.reaction.deleteMany();
  await db.post.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();

  // ---------- Founders ----------
  const founders = [
    {
      email: "maya@preship.app",
      handle: "maya",
      name: "Maya Okafor",
      title: "Solo Builder · ex-Stripe",
      bio: "Building in the dark. Customer discovery for a CLI-first bookkeeping tool. I write about distribution-led dev.",
      location: "Lagos, NG",
      avatarUrl: "/avatars/maya.svg",
      skills: "Go, distribution, GTM",
      isCurrent: true,
    },
    {
      email: "dev@preship.app",
      handle: "devrishi",
      name: "Devrishi K.",
      title: "Founder · Helm Labs",
      bio: "Prototyping an on-device inference engine for embedded fleets. Looking for a GTM co-founder.",
      location: "Bengaluru, IN",
      avatarUrl: "/avatars/devrishi.svg",
      skills: "Rust, ML, infra",
    },
    {
      email: "sofia@preship.app",
      handle: "sofiawren",
      name: "Sofia Wren",
      title: "Founder · Loomwave",
      bio: "Closed beta for a waveform-first podcast editor. Hiring design collaborators on a bounty basis.",
      location: "Lisbon, PT",
      avatarUrl: "/avatars/sofia.svg",
      skills: "Audio, product, design",
    },
    {
      email: "tobi@preship.app",
      handle: "tobidez",
      name: "Tobi Adebayo",
      title: "Founder · Stackpile",
      bio: "Problem validation for an internal-tools generator. I ship in public and post weekly teardowns.",
      location: "Berlin, DE",
      avatarUrl: "/avatars/tobi.svg",
      skills: "TypeScript, DX, open source",
    },
    {
      email: "nina@preship.app",
      handle: "ninakade",
      name: "Nina Kade",
      title: "Founder · Murmur",
      bio: "Building a text+audio social layer for niche communities. Pre-launch. I host weekly IdeaLabs.",
      location: "Austin, US",
      avatarUrl: "/avatars/nina.svg",
      skills: "Community, audio, brand",
    },
    {
      email: "kwame@preship.app",
      handle: "kwame",
      name: "Kwame Mensah",
      title: "Founder · Draftpilot",
      bio: "Closed beta. AI red-teaming for legal drafts. Looking for a security advisor (advisor shares).",
      location: "Accra, GH",
      avatarUrl: "/avatars/kwame.svg",
      skills: "Security, law, AI",
    },
    {
      email: "ren@preship.app",
      handle: "renhashimoto",
      name: "Ren Hashimoto",
      title: "Founder · Kilot",
      bio: "Prototyping a cost-telemetry agent for serverless. I post latency logs as poetry.",
      location: "Tokyo, JP",
      avatarUrl: "/avatars/ren.svg",
      skills: "Observability, Go",
    },
  ];

  const users = [];
  for (const f of founders) {
    users.push(await db.user.create({ data: f }));
  }
  const [maya, devrishi, sofia, tobi, nina, kwame, ren] = users;

  // ---------- Projects ----------
  const projects = await Promise.all([
    db.project.create({
      data: {
        founderId: maya.id,
        name: "Ledgerline",
        tagline: "CLI-first bookkeeping for solo operators",
        description:
          "A terminal-native bookkeeping tool. We're in customer discovery — running 4 interviews/week with indie consultants.",
        category: "DevTool",
        alphaStage: "Customer Discovery",
        logoColor: "#DAFF01",
        logoMark: "LL",
        website: "ledgerline.dev",
      },
    }),
    db.project.create({
      data: {
        founderId: maya.id,
        name: "Ledgerline Mobile",
        tagline: "Receipt capture companion",
        description: "A mobile companion app for capturing receipts on the go.",
        category: "Consumer",
        alphaStage: "Problem Validation",
        logoColor: "#6f8a3e",
        logoMark: "LM",
      },
    }),
    db.project.create({
      data: {
        founderId: devrishi.id,
        name: "Helm Labs",
        tagline: "On-device inference for embedded fleets",
        description:
          "A runtime that ships 4-bit models to microcontrollers. In prototyping — bench numbers are promising on ESP32-S3.",
        category: "AI",
        alphaStage: "Prototyping",
        logoColor: "#0E1909",
        logoMark: "HL",
        website: "helmlabs.io",
      },
    }),
    db.project.create({
      data: {
        founderId: sofia.id,
        name: "Loomwave",
        tagline: "Waveform-first podcast editor",
        description:
          "Edit podcasts by editing the transcript. Closed beta with 38 creators. NPS 62.",
        category: "SaaS",
        alphaStage: "Closed Beta",
        logoColor: "#DAFF01",
        logoMark: "LW",
        website: "loomwave.com",
      },
    }),
    db.project.create({
      data: {
        founderId: tobi.id,
        name: "Stackpile",
        tagline: "Internal tools from your schema, in 60s",
        description:
          "Problem validation. Talking to ops teams about their tooling debt. 22 interviews done.",
        category: "DevTool",
        alphaStage: "Problem Validation",
        logoColor: "#c4cf9a",
        logoMark: "SP",
      },
    }),
    db.project.create({
      data: {
        founderId: nina.id,
        name: "Murmur",
        tagline: "Text + audio social layer for niche communities",
        description:
          "Pre-launch. Building the alpha for invite-only communities. Waitlist 1,200.",
        category: "Consumer",
        alphaStage: "Pre-Launch",
        logoColor: "#DAFF01",
        logoMark: "MM",
        website: "murmur.chat",
      },
    }),
    db.project.create({
      data: {
        founderId: kwame.id,
        name: "Draftpilot",
        tagline: "AI red-teaming for legal drafts",
        description:
          "Closed beta with 3 mid-size firms. Catches clause conflicts before partners review.",
        category: "AI",
        alphaStage: "Closed Beta",
        logoColor: "#0E1909",
        logoMark: "DP",
        website: "draftpilot.legal",
      },
    }),
    db.project.create({
      data: {
        founderId: ren.id,
        name: "Kilot",
        tagline: "Cost-telemetry agent for serverless",
        description:
          "Prototyping. An agent that watches your serverless bill and rewrites hot paths.",
        category: "DevTool",
        alphaStage: "Prototyping",
        logoColor: "#6f8a3e",
        logoMark: "KL",
      },
    }),
  ]);

  const [
    ledgerline,
    ledgerlineMobile,
    helm,
    loomwave,
    stackpile,
    murmur,
    draftpilot,
    kilot,
  ] = projects;

  // ---------- Posts (text + audio) ----------
  const t = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

  const posts: { data: any }[] = [
    {
      data: {
        authorId: sofia.id,
        projectId: loomwave.id,
        type: "audio",
        audioTitle: "Beta retro: what 38 creators taught us about transcripts",
        audioDuration: 184,
        audioWaveform: seededWave(11).join(","),
        body: "Quick audio retro on week 6 of closed beta. The big insight: transcript edits should be surgical, not destructive. Creators hate losing original timing.",
        tags: "closed-beta,audio,retro",
        createdAt: t(6),
      },
    },
    {
      data: {
        authorId: devrishi.id,
        projectId: helm.id,
        type: "text",
        body: "Bench numbers from the weekend. ESP32-S3 runs a 4-bit 40M param model at 11 tok/s with 312ms cold start. Not fast enough for voice, but enough for periodic inference on the edge.\n\nNext: quantization-aware fine-tune. If you've done this on constrained chips, I want to talk.",
        tags: "prototyping,edge-ml,bench",
        createdAt: t(42),
      },
    },
    {
      data: {
        authorId: maya.id,
        projectId: ledgerline.id,
        type: "text",
        body: "Customer discovery, interview 18.\n\nFounder of a 2-person consultancy told me: \"I'd rather re-enter 40 receipts by hand than trust an AI categorizer I can't audit.\"\n\nThat's the product. Auditability over magic. Every categorization gets a diff you can read.",
        tags: "customer-discovery,insight",
        createdAt: t(95),
      },
    },
    {
      data: {
        authorId: tobi.id,
        projectId: stackpile.id,
        type: "audio",
        audioTitle: "Why every ops team has 14 half-finished internal tools",
        audioDuration: 142,
        audioWaveform: seededWave(7).join(","),
        body: "Spent the week interviewing ops leads. Pattern: every internal tool dies at the same stage — the moment the original builder leaves. Stackpile has to solve continuity, not just speed.",
        tags: "problem-validation,ops,insight",
        createdAt: t(180),
      },
    },
    {
      data: {
        authorId: nina.id,
        projectId: murmur.id,
        type: "text",
        body: "Pre-launch checkpoint. Waitlist crossed 1,200. The signal I'm watching: 64% of signups come from inside 3 existing communities.\n\nWe're not building a social network. We're building the audio room those communities already wish they had.",
        tags: "pre-launch,distribution",
        createdAt: t(300),
      },
    },
    {
      data: {
        authorId: kwame.id,
        projectId: draftpilot.id,
        type: "text",
        body: "Closed beta incident report (anonymized).\n\nOur agent flagged a non-compete that referenced a subsidiary that didn't exist yet. Partner said: \"This would've cost us a client.\" That's the bar now — catch the impossible, not just the unlikely.",
        tags: "closed-beta,legal-ai,red-team",
        createdAt: t(420),
      },
    },
    {
      data: {
        authorId: ren.id,
        projectId: kilot.id,
        type: "audio",
        audioTitle: "Serverless bill as poetry — week 3 logs",
        audioDuration: 98,
        audioWaveform: seededWave(23).join(","),
        body: "Read the latency logs from Kilot's hot-path rewriter. The agent rewrote a Lambda that was 73% of the bill. It reads like a haiku.",
        tags: "prototyping,serverless,cost",
        createdAt: t(640),
      },
    },
    {
      data: {
        authorId: sofia.id,
        type: "text",
        body: "Unpopular opinion for audio founders: your waveform UI is a status symbol, not a feature. Most users never touch it. Ship the transcript editor first. Ship the waveform when a power user asks for it twice.",
        tags: "audio,product,hot-take",
        createdAt: t(880),
      },
    },
    {
      data: {
        authorId: maya.id,
        projectId: ledgerlineMobile.id,
        type: "text",
        body: "Killed the Ledgerline Mobile companion today.\n\nThree weeks of interviews and not one user wanted a separate app. They wanted one-tap capture inside the tools they already live in. Good kill. Saved six months.",
        tags: "problem-validation,kill",
        createdAt: t(1200),
      },
    },
  ];

  const createdPosts = [];
  for (const p of posts) createdPosts.push(await db.post.create(p));

  // ---------- Reactions ----------
  const reactionMatrix = [
    // [postIdx, userIdx, kind]
    [0, 0, "like"], [0, 3, "like"], [0, 4, "handshake"], [0, 5, "like"],
    [1, 0, "like"], [1, 6, "handshake"], [1, 4, "like"],
    [2, 1, "like"], [2, 3, "like"], [2, 5, "handshake"], [2, 4, "like"],
    [3, 0, "like"], [3, 2, "like"], [3, 6, "like"],
    [4, 1, "like"], [4, 3, "like"], [4, 5, "handshake"],
    [5, 0, "like"], [5, 2, "like"], [5, 6, "handshake"],
    [6, 0, "like"], [6, 4, "like"],
    [7, 1, "like"], [7, 3, "handshake"], [7, 5, "like"],
    [8, 1, "like"], [8, 4, "like"], [8, 6, "like"],
  ];
  for (const [pi, ui, kind] of reactionMatrix) {
    try {
      await db.reaction.create({
        data: { postId: createdPosts[pi].id, userId: users[ui].id, kind: kind as any },
      });
    } catch {}
  }

  // ---------- Comments ----------
  const comments = [
    [0, 5, "The surgical-not-destructive framing is exactly right. We hit this in video editing too."],
    [1, 0, "Have you looked at QAT for the fine-tune? We got 1.4x on a similar budget."],
    [2, 3, "\"Auditability over magic\" — printing that on a wall."],
    [3, 6, "Continuity is the whole ballgame. Have you read the \"bus-factor\" postmortems from Stripe ops?"],
    [4, 2, "The 64%-from-3-communities number is your wedge. Build for those 3 first."],
    [5, 4, "Catch the impossible, not just the unlikely. New tagline."],
    [7, 6, "Hard agree. We shipped our waveform 8 months too early."],
    [8, 5, "Good kill. The best founders I know kill features faster than they ship them."],
  ];
  for (const [pi, ui, body] of comments) {
    await db.comment.create({
      data: { postId: createdPosts[pi as number].id, userId: users[ui as number].id, body: body as string },
    });
  }

  // ---------- Synergy requests ----------
  const synergy = await Promise.all([
    db.synergyRequest.create({
      data: {
        founderId: devrishi.id,
        projectId: helm.id,
        title: "Need a GTM co-founder for edge-ML runtime",
        bottleneck:
          "We have a working 4-bit inference runtime bench. I can ship the engine, but I cannot ship it to anyone. No distribution, no outbound, no founder-led sales muscle.",
        need: "GTM co-founder with developer-tools GTM experience. B2D, ideally with an audience in embedded / IoT.",
        bountyType: "cofounder",
        stake: 40,
        bountyDetail:
          "40% founding equity, 4-year vest, 1-year cliff. Equal say on go-to-market. I keep technical + roadmap.",
        tags: "gtm,devtools,edge-ml",
        status: "open",
        createdAt: t(120),
      },
    }),
    db.synergyRequest.create({
      data: {
        founderId: sofia.id,
        projectId: loomwave.id,
        title: "Design collaborator for transcript-scrub UX",
        bottleneck:
          "Power users want a waveform. Casual users want a transcript. We don't have the design capacity to ship a single interaction model that serves both. Stuck on the spec.",
        need: "Senior product designer with audio-tooling experience. Contract, ~6 weeks.",
        bountyType: "advisor-shares",
        stake: 0.75,
        bountyDetail:
          "0.75% advisor shares, vested over 18 months. Open to converting to a design-lead role at seed.",
        tags: "design,audio,ux",
        status: "open",
        createdAt: t(260),
      },
    }),
    db.synergyRequest.create({
      data: {
        founderId: kwame.id,
        projectId: draftpilot.id,
        title: "Security advisor for legal-AI red-teaming",
        bottleneck:
          "Our agent catches clause conflicts, but I have no one stress-testing the agent itself. I need a security mindset that treats prompts like an attack surface.",
        need: "Security advisor with AI red-teaming experience. 4 hours/month.",
        bountyType: "advisor-shares",
        stake: 0.5,
        bountyDetail: "0.5% advisor shares. Quarterly retainer optional once we close seed.",
        tags: "security,ai,legal",
        status: "open",
        createdAt: t(400),
      },
    }),
    db.synergyRequest.create({
      data: {
        founderId: tobi.id,
        projectId: stackpile.id,
        title: "Barter: my DX work for your ops-team intros",
        bottleneck:
          "Stackpile needs 10 more ops-team interviews to finish problem validation. I keep hitting the same 3 networks.",
        need: "Intros to ops leads at 50+ person companies. In exchange I'll do a DX teardown of your dev tool.",
        bountyType: "barter",
        stake: null,
        bountyDetail:
          "Barter. For every qualified intro that becomes an interview, I deliver a written DX teardown of your product (2-3 pages, actionable).",
        tags: "problem-validation,ops,intros",
        status: "open",
        createdAt: t(560),
      },
    }),
    db.synergyRequest.create({
      data: {
        founderId: ren.id,
        projectId: kilot.id,
        title: "Looking for a GTM + infra hybrid co-founder",
        bottleneck:
          "Kilot rewrites hot Lambda paths and cuts bills. I can build the agent. I can't build the go-to-market and I can't run production infra at the same time.",
        need: "Co-founder comfortable with both serverless infra scale and B2D sales.",
        bountyType: "cofounder",
        stake: 38,
        bountyDetail: "38% founding equity. Owns GTM + production. 4-year vest, 1-year cliff.",
        tags: "serverless,gtm,infra",
        status: "open",
        createdAt: t(720),
      },
    }),
    db.synergyRequest.create({
      data: {
        founderId: maya.id,
        projectId: ledgerline.id,
        title: "Revenue-share: distribution partner for indie consultants",
        bottleneck:
          "Ledgerline is in customer discovery but I already have a waitlist of 60 indie consultants who want it. I don't have a distribution channel to reach the next 600.",
        need: "Distribution partner with access to indie consultant / solopreneur communities.",
        bountyType: "revenue-share",
        stake: 12,
        bountyDetail:
          "12% of revenue from referrals they bring, in perpetuity, capped at 3x a negotiated milestone. No equity dilution.",
        tags: "distribution,revenue-share",
        status: "open",
        createdAt: t(900),
      },
    }),
  ]);

  // a few offers
  const offers = [
    [0, maya.id, "I ran GTM for two dev-tools at Stripe. Edge-ML is a wedge I'd take seriously. Happy to do a 60-min working session before any commitment.", "Open to 35% if you want me full-time pre-seed."],
    [0, nina.id, "I've been building distribution for audio communities. Different surface but same muscle. I'd host an IdeaLab with you to pressure-test the wedge first.", null],
    [1, tobi.id, "I shipped the transcript-scrub UX at a previous co. The waveform-vs-transcript split is a false binary — I have a spec that collapses them. Let's talk.", "0.6% is fine. Add a 90-day trial."],
    [2, devrishi.id, "I red-team ML pipelines as a side quest. Treated prompts as an attack surface on a previous project. 4 hrs/month works for me.", null],
    [4, sofia.id, "I run serverless at scale on Loomwave's backend. Kilot is the tool I wish I had 6 months ago. I'd want to own GTM fully though.", null],
  ];
  for (const [ri, uid, pitch, offer] of offers) {
    await db.synergyOffer.create({
      data: {
        requestId: synergy[ri as number].id,
        founderId: uid as string,
        pitch: pitch as string,
        offer: (offer as string | null) ?? null,
        status: "pending",
      },
    });
  }

  // ---------- IdeaLab sessions ----------
  const inHours = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);
  const sessions = await Promise.all([
    db.ideaLabSession.create({
      data: {
        title: "What does \"developer-grade bookkeeping\" actually mean?",
        thesis:
          "Hypothesis: indie operators will adopt a CLI-first bookkeeping tool if and only if every categorization is auditable as a diff. We'll ideate the MVP surface, the audit UX, and the wedge segment.",
        description:
          "Invite-only working session. We're not pitching — we're pressure-testing the wedge and designing the first 14 days of the product.",
        hostId: maya.id,
        scheduledAt: inHours(20),
        durationMins: 60,
        status: "scheduled",
        agenda: "0:00 — Wedge teardown: who exactly switches first\n0:10 — Audit UX: the diff as the unit of trust\n0:25 — 14-day MVP surface\n0:45 — Distribution: 3 communities to seed\n0:55 — Handshakes & next steps",
        rolesOpen: "design-lead,product-lead,marketing-lead,participant",
        inviteCode: "PRESHIP-LL-01",
        maxSeats: 8,
        isPublic: true,
        coverColor: "#0E1909",
      },
    }),
    db.ideaLabSession.create({
      data: {
        title: "Edge-ML runtime: can we ship voice on a 4-bit model?",
        thesis:
          "Hypothesis: a quantization-aware fine-tune gets 4-bit voice inference to 18 tok/s on ESP32-S3, which unlocks voice on constrained fleets. We'll design the experiment and the GTM wedge.",
        description:
          "Technical ideation. Bring benchmarks, bring skepticism. The goal is a 7-day experiment plan and a named wedge segment.",
        hostId: devrishi.id,
        scheduledAt: inHours(46),
        durationMins: 75,
        status: "scheduled",
        agenda: "0:00 — State of the bench (11 tok/s baseline)\n0:15 — QAT vs GPTQ vs custom\n0:35 — Voice latency budget\n0:55 — Wedge: which fleet first\n0:70 — Experiment plan + owners",
        rolesOpen: "technical-lead,design-lead,participant",
        inviteCode: "PRESHIP-HELM-02",
        maxSeats: 10,
        isPublic: true,
        coverColor: "#0E1909",
      },
    }),
    db.ideaLabSession.create({
      data: {
        title: "Waveform or transcript: designing one model for two users",
        thesis:
          "Hypothesis: the waveform-vs-transcript split in audio editing is a false binary. We'll ideate a single interaction model that scales from casual to power user.",
        description:
          "Design-led ideation. No slides. We'll sketch, critique, and leave with one prototype spec.",
        hostId: sofia.id,
        scheduledAt: inHours(-2),
        durationMins: 60,
        status: "live",
        agenda: "0:00 — The two personas, honestly\n0:12 — Where every existing tool fails\n0:30 — One model: sketches\n0:50 — Pick a prototype to build",
        rolesOpen: "design-lead,product-lead,participant",
        inviteCode: "PRESHIP-LW-03",
        maxSeats: 8,
        isPublic: true,
        coverColor: "#DAFF01",
      },
    }),
    db.ideaLabSession.create({
      data: {
        title: "The internal-tools graveyard: building for continuity",
        thesis:
          "Hypothesis: internal tools die at the moment the original builder leaves. The product opportunity is continuity, not speed. We'll define what continuity means as a feature set.",
        description:
          "Founder-led ideation with 3 ops leads joining. We'll map the graveyard and design the continuity surface.",
        hostId: tobi.id,
        scheduledAt: inHours(72),
        durationMins: 60,
        status: "scheduled",
        agenda: "0:00 — Mapping the graveyard\n0:15 — What \"continuity\" means to ops\n0:35 — Feature set: docs, ownership, on-call\n0:55 — Handshakes",
        rolesOpen: "product-lead,marketing-lead,participant",
        inviteCode: "PRESHIP-SP-04",
        maxSeats: 9,
        isPublic: true,
        coverColor: "#0E1909",
      },
    }),
    db.ideaLabSession.create({
      data: {
        title: "Audio rooms for niche communities: the wedge",
        thesis:
          "Hypothesis: the next wave of social is invite-only audio for niche communities, not broadcast podcasts. We'll ideate the wedge community and the alpha surface.",
        description: "Closed session for the 3 communities on the Murmur waitlist. Invite only.",
        hostId: nina.id,
        scheduledAt: inHours(120),
        durationMins: 60,
        status: "scheduled",
        agenda: "0:00 — The 3 communities on the waitlist\n0:15 — What each one already wishes it had\n0:35 — The alpha surface\n0:55 — Invite plan",
        rolesOpen: "design-lead,marketing-lead,participant",
        inviteCode: "PRESHIP-MM-05",
        maxSeats: 7,
        isPublic: false,
        coverColor: "#DAFF01",
      },
    }),
  ]);

  // signups + interests
  const signupMatrix = [
    [0, devrishi.id, "technical-lead", "confirmed"],
    [0, tobi.id, "product-lead", "confirmed"],
    [0, nina.id, "marketing-lead", "registered"],
    [1, ren.id, "technical-lead", "confirmed"],
    [1, maya.id, "participant", "registered"],
    [2, tobi.id, "design-lead", "confirmed"],
    [2, maya.id, "product-lead", "confirmed"],
    [2, nina.id, "participant", "registered"],
    [3, maya.id, "product-lead", "confirmed"],
    [3, sofia.id, "participant", "registered"],
    [4, maya.id, "design-lead", "confirmed"],
    [4, devrishi.id, "participant", "registered"],
  ];
  for (const [si, uid, role, status] of signupMatrix) {
    await db.ideaLabSignup.create({
      data: { sessionId: sessions[si as number].id, userId: uid as string, role: role as string, status: status as string },
    });
  }
  const interestMatrix = [
    [0, kwame.id], [0, ren.id],
    [1, kwame.id], [1, tobi.id],
    [3, devrishi.id], [3, ren.id],
    [4, sofia.id], [4, kwame.id],
  ];
  for (const [si, uid] of interestMatrix) {
    await db.ideaLabInterest.create({
      data: { sessionId: sessions[si as number].id, userId: uid as string },
    });
  }

  console.log("Preship seed complete.");
  console.log({ users: users.length, projects: projects.length, posts: createdPosts.length, synergy: synergy.length, sessions: sessions.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
