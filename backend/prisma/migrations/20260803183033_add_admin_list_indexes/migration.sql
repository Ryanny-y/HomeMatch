-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
