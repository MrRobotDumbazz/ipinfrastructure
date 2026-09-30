use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum AssetType {
    Patent,
    Copyright,
    Trademark,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum LicenseType {
    Exclusive,
    NonExclusive,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum SaleStatus {
    Open,
    Completed,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct IpRecord {
    pub owner: Pubkey,
    pub asset_type: AssetType,
    pub content_hash: [u8; 32],
    #[max_len(128)]
    pub title: String,
    #[max_len(256)]
    pub uri: String,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LicenseRecord {
    pub ip_record: Pubkey,
    pub issuer: Pubkey,
    pub licensee: Pubkey,
    pub license_type: LicenseType,
    pub royalty_bps: u16,
    pub expires_at: i64,
    pub issued_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SaleListing {
    pub ip_record: Pubkey,
    pub seller: Pubkey,
    pub price_lamports: u64,
    pub status: SaleStatus,
    pub buyer: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterIpParams {
    pub asset_type: AssetType,
    pub title: String,
    pub content_hash: [u8; 32],
    pub uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct IssueLicenseParams {
    pub licensee: Pubkey,
    pub royalty_bps: u16,
    pub expires_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ListForSaleParams {
    pub price_lamports: u64,
}
