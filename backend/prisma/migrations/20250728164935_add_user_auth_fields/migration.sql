/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- First add the password column as nullable
ALTER TABLE "users" ADD COLUMN "password" TEXT;

-- Set a temporary password for existing users (they'll need to reset it)
UPDATE "users" SET "password" = '$2a$12$LQv3c1yqBwlVHpPjrCyeNOGTcBbk6x2UQcJVfiHrtMeJHZqiNfpm2' WHERE "password" IS NULL;

-- Now make the password column required
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;

-- Add other columns
ALTER TABLE "users" ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lockUntil" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_emailVerificationToken_idx" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "users_passwordResetToken_idx" ON "users"("passwordResetToken");
