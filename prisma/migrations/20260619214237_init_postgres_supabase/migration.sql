-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "avatarUrl" TEXT,
    "skills" TEXT,
    "bountiesPublic" BOOLEAN NOT NULL DEFAULT true,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "prefTheme" TEXT NOT NULL DEFAULT 'system',
    "prefNotifications" BOOLEAN NOT NULL DEFAULT true,
    "prefEmailDigest" BOOLEAN NOT NULL DEFAULT false,
    "prefCompactMode" BOOLEAN NOT NULL DEFAULT false,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "alphaStage" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoColor" TEXT NOT NULL DEFAULT '#DAFF01',
    "logoMark" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "audioTitle" TEXT,
    "audioUrl" TEXT,
    "audioDuration" INTEGER,
    "audioWaveform" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SynergyRequest" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "bottleneck" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "bountyType" TEXT NOT NULL,
    "stake" DOUBLE PRECISION,
    "bountyDetail" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SynergyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SynergyOffer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "offer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SynergyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaLabSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "description" TEXT,
    "hostId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "agenda" TEXT,
    "rolesOpen" TEXT,
    "inviteCode" TEXT NOT NULL,
    "maxSeats" INTEGER NOT NULL DEFAULT 8,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "coverColor" TEXT NOT NULL DEFAULT '#0E1909',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaLabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaLabSignup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaLabSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaLabInterest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaLabInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkView" TEXT,
    "linkId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT NOT NULL,
    "tags" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "coverColor" TEXT NOT NULL DEFAULT '#0E1909',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleClap" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleClap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_isCurrent_idx" ON "User"("isCurrent");

-- CreateIndex
CREATE INDEX "User_handle_idx" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Project_founderId_idx" ON "Project"("founderId");

-- CreateIndex
CREATE INDEX "Project_alphaStage_idx" ON "Project"("alphaStage");

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_projectId_idx" ON "Post"("projectId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "Reaction_postId_kind_idx" ON "Reaction"("postId", "kind");

-- CreateIndex
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_postId_userId_kind_key" ON "Reaction"("postId", "userId", "kind");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "SynergyRequest_founderId_createdAt_idx" ON "SynergyRequest"("founderId", "createdAt");

-- CreateIndex
CREATE INDEX "SynergyRequest_status_createdAt_idx" ON "SynergyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SynergyRequest_projectId_idx" ON "SynergyRequest"("projectId");

-- CreateIndex
CREATE INDEX "SynergyRequest_bountyType_idx" ON "SynergyRequest"("bountyType");

-- CreateIndex
CREATE INDEX "SynergyOffer_requestId_idx" ON "SynergyOffer"("requestId");

-- CreateIndex
CREATE INDEX "SynergyOffer_founderId_status_idx" ON "SynergyOffer"("founderId", "status");

-- CreateIndex
CREATE INDEX "SynergyOffer_status_idx" ON "SynergyOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaLabSession_inviteCode_key" ON "IdeaLabSession"("inviteCode");

-- CreateIndex
CREATE INDEX "IdeaLabSession_hostId_scheduledAt_idx" ON "IdeaLabSession"("hostId", "scheduledAt");

-- CreateIndex
CREATE INDEX "IdeaLabSession_status_idx" ON "IdeaLabSession"("status");

-- CreateIndex
CREATE INDEX "IdeaLabSession_isPublic_scheduledAt_idx" ON "IdeaLabSession"("isPublic", "scheduledAt");

-- CreateIndex
CREATE INDEX "IdeaLabSession_scheduledAt_idx" ON "IdeaLabSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "IdeaLabSignup_sessionId_idx" ON "IdeaLabSignup"("sessionId");

-- CreateIndex
CREATE INDEX "IdeaLabSignup_userId_idx" ON "IdeaLabSignup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaLabSignup_sessionId_userId_key" ON "IdeaLabSignup"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "IdeaLabInterest_sessionId_idx" ON "IdeaLabInterest"("sessionId");

-- CreateIndex
CREATE INDEX "IdeaLabInterest_userId_idx" ON "IdeaLabInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaLabInterest_sessionId_userId_key" ON "IdeaLabInterest"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Article_published_createdAt_idx" ON "Article"("published", "createdAt");

-- CreateIndex
CREATE INDEX "Article_authorId_createdAt_idx" ON "Article"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleClap_articleId_idx" ON "ArticleClap"("articleId");

-- CreateIndex
CREATE INDEX "ArticleClap_userId_idx" ON "ArticleClap"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleClap_articleId_userId_key" ON "ArticleClap"("articleId", "userId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynergyRequest" ADD CONSTRAINT "SynergyRequest_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynergyRequest" ADD CONSTRAINT "SynergyRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynergyOffer" ADD CONSTRAINT "SynergyOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SynergyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SynergyOffer" ADD CONSTRAINT "SynergyOffer_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaLabSession" ADD CONSTRAINT "IdeaLabSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaLabSignup" ADD CONSTRAINT "IdeaLabSignup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IdeaLabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaLabSignup" ADD CONSTRAINT "IdeaLabSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaLabInterest" ADD CONSTRAINT "IdeaLabInterest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IdeaLabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaLabInterest" ADD CONSTRAINT "IdeaLabInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleClap" ADD CONSTRAINT "ArticleClap_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleClap" ADD CONSTRAINT "ArticleClap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
