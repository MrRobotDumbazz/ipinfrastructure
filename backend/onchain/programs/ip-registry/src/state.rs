use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct IpRecord {
    pub owner: Pubkey,
    pub content_hash: [u8; 32],
    #[max_len(128)]
    pub title: String,
    #[max_len(256)]
    pub uri: String,
    pub registered_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterIpParams {
    pub title: String,
    pub content_hash: [u8; 32],
    pub uri: String,
}
