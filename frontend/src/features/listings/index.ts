export { LandlordDashboard } from "@/features/listings/components/LandlordDashboard";
export { NewListingForm } from "@/features/listings/components/NewListingForm";
export { EditListingScreen } from "@/features/listings/components/EditListingScreen";

/**
 * The status transitions, for `/admin`.
 *
 * Exported so the admin table drives the same endpoints a landlord does rather
 * than restating their paths — the API already returns any listing to an admin,
 * so there is nothing admin-specific about the call itself, only about which
 * cache is invalidated afterwards.
 */
export {
  publishListing,
  archiveListing,
  deleteListing,
} from "@/features/listings/api/listings.api";
