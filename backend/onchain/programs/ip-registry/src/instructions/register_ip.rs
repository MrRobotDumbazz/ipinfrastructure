use anchor_lang::prelude::*;

use crate::{constants::*, error::IpRegistryError, state::IpRecord, state::RegisterIpParams};

#[derive(Accounts)]
#[instruction(params: RegisterIpParams)]
pub struct RegisterIp<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + IpRecord::INIT_SPACE,
        seeds = [IP_RECORD_SEED, params.content_hash.as_ref()],
        bump
    )]
    pub ip_record: Account<'info, IpRecord>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_ip(ctx: Context<RegisterIp>, params: RegisterIpParams) -> Result<()> {
    validate_params(&params)?;

    let record = &mut ctx.accounts.ip_record;
    record.owner = ctx.accounts.payer.key();
    record.content_hash = params.content_hash;
    record.title = params.title;
    record.uri = params.uri;
    record.registered_at = Clock::get()?.unix_timestamp;
    record.bump = ctx.bumps.ip_record;

    msg!(
        "IP record registered for content hash {:?}",
        record.content_hash
    );
    Ok(())
}

pub fn validate_params(params: &RegisterIpParams) -> Result<()> {
    require!(
        params.content_hash != [0u8; 32],
        IpRegistryError::ZeroContentHash
    );
    require!(!params.title.trim().is_empty(), IpRegistryError::EmptyTitle);
    require!(
        params.title.len() <= MAX_TITLE_LEN,
        IpRegistryError::TitleTooLong
    );
    require!(params.uri.len() <= MAX_URI_LEN, IpRegistryError::UriTooLong);
    Ok(())
}
