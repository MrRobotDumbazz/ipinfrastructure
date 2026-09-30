use anchor_lang::prelude::*;

use crate::{
    constants::*, error::IpRegistryError, state::IpRecord, state::IssueLicenseParams,
    state::LicenseRecord, state::LicenseType,
};

#[derive(Accounts)]
#[instruction(params: IssueLicenseParams)]
pub struct IssueNonExclusiveLicense<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = ip_record.owner == payer.key() @ IpRegistryError::NotIpOwner)]
    pub ip_record: Account<'info, IpRecord>,
    #[account(
        init,
        payer = payer,
        space = 8 + LicenseRecord::INIT_SPACE,
        seeds = [LICENSE_SEED, ip_record.key().as_ref(), params.licensee.as_ref()],
        bump
    )]
    pub license: Account<'info, LicenseRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IssueExclusiveLicense<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = ip_record.owner == payer.key() @ IpRegistryError::NotIpOwner)]
    pub ip_record: Account<'info, IpRecord>,
    #[account(
        init,
        payer = payer,
        space = 8 + LicenseRecord::INIT_SPACE,
        seeds = [EXCLUSIVE_LICENSE_SEED, ip_record.key().as_ref()],
        bump
    )]
    pub license: Account<'info, LicenseRecord>,
    pub system_program: Program<'info, System>,
}

pub fn handle_issue_non_exclusive(
    ctx: Context<IssueNonExclusiveLicense>,
    params: IssueLicenseParams,
) -> Result<()> {
    write_license(
        &mut ctx.accounts.license,
        ctx.accounts.ip_record.key(),
        ctx.accounts.payer.key(),
        params,
        LicenseType::NonExclusive,
        ctx.bumps.license,
    )?;
    msg!(
        "Non-exclusive license issued for IP {}",
        ctx.accounts.ip_record.key()
    );
    Ok(())
}

pub fn handle_issue_exclusive(
    ctx: Context<IssueExclusiveLicense>,
    params: IssueLicenseParams,
) -> Result<()> {
    write_license(
        &mut ctx.accounts.license,
        ctx.accounts.ip_record.key(),
        ctx.accounts.payer.key(),
        params,
        LicenseType::Exclusive,
        ctx.bumps.license,
    )?;
    msg!(
        "Exclusive license issued for IP {}",
        ctx.accounts.ip_record.key()
    );
    Ok(())
}

fn write_license(
    license: &mut LicenseRecord,
    ip_record: Pubkey,
    issuer: Pubkey,
    params: IssueLicenseParams,
    license_type: LicenseType,
    bump: u8,
) -> Result<()> {
    validate_license_params(&params)?;

    license.ip_record = ip_record;
    license.issuer = issuer;
    license.licensee = params.licensee;
    license.license_type = license_type;
    license.royalty_bps = params.royalty_bps;
    license.expires_at = params.expires_at;
    license.issued_at = Clock::get()?.unix_timestamp;
    license.bump = bump;
    Ok(())
}

fn validate_license_params(params: &IssueLicenseParams) -> Result<()> {
    require!(
        params.licensee != Pubkey::default(),
        IpRegistryError::InvalidLicensee
    );
    require!(
        params.royalty_bps <= MAX_ROYALTY_BPS,
        IpRegistryError::RoyaltyTooHigh
    );
    require!(
        params.expires_at == 0 || params.expires_at > Clock::get()?.unix_timestamp,
        IpRegistryError::InvalidExpiry
    );
    Ok(())
}
