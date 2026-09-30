use anchor_lang::prelude::*;

#[error_code]
pub enum IpRegistryError {
    #[msg("Content hash must not be all zeros")]
    ZeroContentHash,
    #[msg("Title must not be empty")]
    EmptyTitle,
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    #[msg("URI exceeds maximum length")]
    UriTooLong,
    #[msg("Only the IP owner can perform this action")]
    NotIpOwner,
    #[msg("Licensee must not be the default pubkey")]
    InvalidLicensee,
    #[msg("Royalty exceeds the maximum of 10000 bps")]
    RoyaltyTooHigh,
    #[msg("Expiry must be zero (perpetual) or in the future")]
    InvalidExpiry,
    #[msg("An exclusive license already exists for this IP")]
    ExclusiveLicenseExists,
    #[msg("This license already exists")]
    LicenseExists,
    #[msg("Price must be at least 1 lamport")]
    PriceTooLow,
    #[msg("A listing is already open for this IP")]
    ListingAlreadyOpen,
    #[msg("The listing is not open")]
    ListingNotOpen,
    #[msg("Listing does not match the current IP owner")]
    ListingSellerMismatch,
    #[msg("Listing does not reference this IP record")]
    ListingIpMismatch,
    #[msg("Seller cannot buy their own listing")]
    SelfPurchase,
    #[msg("Only the listing seller can cancel")]
    NotListingSeller,
}
