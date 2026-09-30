use anchor_lang::prelude::*;

#[constant]
pub const IP_RECORD_SEED: &[u8] = b"ip_record";

#[constant]
pub const LICENSE_SEED: &[u8] = b"license";

#[constant]
pub const EXCLUSIVE_LICENSE_SEED: &[u8] = b"exclusive_license";

#[constant]
pub const SALE_SEED: &[u8] = b"sale";

pub const MAX_TITLE_LEN: usize = 128;

pub const MAX_URI_LEN: usize = 256;

pub const MAX_ROYALTY_BPS: u16 = 10_000;

pub const MIN_PRICE_LAMPORTS: u64 = 1;
