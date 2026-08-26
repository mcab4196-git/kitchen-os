-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "last_suggested_at" TIMESTAMP(3),
ADD COLUMN     "saved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "recipes_user_id_saved_idx" ON "recipes"("user_id", "saved");

-- CreateIndex
CREATE INDEX "recipes_user_id_last_suggested_at_idx" ON "recipes"("user_id", "last_suggested_at");
