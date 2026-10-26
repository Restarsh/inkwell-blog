-- CreateTable
CREATE TABLE "PostViewer" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostViewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostViewer_postId_lastSeen_idx" ON "PostViewer"("postId", "lastSeen");

-- CreateIndex
CREATE INDEX "PostViewer_lastSeen_idx" ON "PostViewer"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "PostViewer_postId_viewerId_key" ON "PostViewer"("postId", "viewerId");

-- AddForeignKey
ALTER TABLE "PostViewer" ADD CONSTRAINT "PostViewer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
