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
}
