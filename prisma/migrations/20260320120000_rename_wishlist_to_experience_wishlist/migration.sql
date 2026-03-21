-- Rename WishlistItem -> experience_wishlists (model ExperienceWishlist)
ALTER TABLE "WishlistItem" RENAME TO "experience_wishlists";

ALTER INDEX "WishlistItem_pkey" RENAME TO "experience_wishlists_pkey";
ALTER INDEX "WishlistItem_travelerId_idx" RENAME TO "ExperienceWishlist_travelerId_idx";
ALTER INDEX "WishlistItem_concertId_idx" RENAME TO "ExperienceWishlist_concertId_idx";
ALTER INDEX "WishlistItem_hikeId_idx" RENAME TO "ExperienceWishlist_hikeId_idx";
ALTER INDEX "WishlistItem_diningId_idx" RENAME TO "ExperienceWishlist_diningId_idx";
ALTER INDEX "WishlistItem_attractionId_idx" RENAME TO "ExperienceWishlist_attractionId_idx";
ALTER INDEX "WishlistItem_planId_idx" RENAME TO "ExperienceWishlist_planId_idx";

ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_travelerId_fkey" TO "ExperienceWishlist_travelerId_fkey";
ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_planId_fkey" TO "ExperienceWishlist_planId_fkey";
ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_concertId_fkey" TO "ExperienceWishlist_concertId_fkey";
ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_hikeId_fkey" TO "ExperienceWishlist_hikeId_fkey";
ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_diningId_fkey" TO "ExperienceWishlist_diningId_fkey";
ALTER TABLE "experience_wishlists" RENAME CONSTRAINT "WishlistItem_attractionId_fkey" TO "ExperienceWishlist_attractionId_fkey";
