// Frontend types matching the Preship API responses.

export type Founder = {
  id: string;
  // `email` is only present on the current user's own payload (/api/me);
  // public endpoints (leaderboards, hover cards, lists) intentionally omit it.
  email?: string;
  handle: string;
  name: string;
  title: string;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  skills?: string | null;
  bountiesPublic?: boolean;
  isCurrent: boolean;
  onboarded?: boolean;
  isFoundingMember?: boolean;
};

export type Project = {
  id: string;
  founderId: string;
  name: string;
  tagline: string;
  description?: string | null;
  category: string;
  alphaStage: string;
  logoUrl?: string | null;
  logoColor: string;
  logoMark: string | null;
  website?: string | null;
  createdAt: string;
  founder?: Founder;
  _count?: { posts: number; synergyRequests: number };
};

export type ReactionKind = "like" | "repost" | "handshake";

export type FeedPost = {
  id: string;
  authorId: string;
  projectId: string | null;
  type: "text" | "audio";
  body: string | null;
  audioTitle: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  audioWaveform: string | null;
  tags: string | null;
  createdAt: string;
  author: Founder;
  project: Project | null;
  _count: {
    reactions: Record<ReactionKind, number>;
    comments: number;
  };
  myReaction: ReactionKind[];
  comments?: Comment[];
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: Founder;
};

export type BountyType =
  | "equity"
  | "advisor-shares"
  | "revenue-share"
  | "cofounder"
  | "barter";

export type SynergyRequest = {
  id: string;
  founderId: string;
  projectId: string | null;
  title: string;
  bottleneck: string;
  need: string;
  bountyType: BountyType;
  stake: number | null;
  bountyDetail: string | null;
  tags: string | null;
  status: "open" | "matched" | "closed";
  createdAt: string;
  founder: Founder;
  project: Project | null;
  _count: { offers: number };
  myOffer: SynergyOffer | null;
  offers?: SynergyOffer[];
};

export type SynergyOffer = {
  id: string;
  requestId: string;
  founderId: string;
  pitch: string;
  offer: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  founder: Founder;
};

/** Preset role IDs. Hosts may also define arbitrary custom roles (free text
 *  slugs stored in rolesOpen), so role fields are typed as `string` at the
 *  edges where customs surface (signup.role, mySignup.role). This union is
 *  kept for the known preset set. */
export type IdeaRole =
  | "host"
  | "co-host"
  | "technical-lead"
  | "design-lead"
  | "product-lead"
  | "marketing-lead"
  | "participant"
  // Host-defined custom role slug (e.g. "ml-engineer", "growth-hacker").
  | (string & {});

export type IdeaLabSession = {
  id: string;
  title: string;
  thesis: string;
  description?: string | null;
  hostId: string;
  scheduledAt: string;
  durationMins: number;
  status: "scheduled" | "live" | "ended";
  agenda: string | null;
  rolesOpen: string | null;
  inviteCode: string;
  maxSeats: number;
  isPublic: boolean;
  coverColor: string;
  createdAt: string;
  host: Founder;
  _count: { signups: number; interests: number };
  mySignup: { role: IdeaRole; status: string } | null;
  myInterest: boolean;
  signups?: IdeaLabSignup[];
  interests?: { id: string; user: Founder }[];
};

export type IdeaLabSignup = {
  id: string;
  role: IdeaRole;
  status: string;
  user: Founder;
};

export type Article = {
  id: string;
  authorId: string;
  title: string;
  subtitle: string | null;
  // `body` is only present on the detail payload (/api/articles/[id]); the
  // list endpoint omits it to keep the payload proportional to row count.
  body?: string;
  tags: string | null;
  published: boolean;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<
    Founder,
    "id" | "name" | "handle" | "title" | "avatarUrl"
  > &
    Partial<Pick<Founder, "bio" | "location" | "skills">>;
  _count: { claps: number };
  myClap?: boolean;
};
