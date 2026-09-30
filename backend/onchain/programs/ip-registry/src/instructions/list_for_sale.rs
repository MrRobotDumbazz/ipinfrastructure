use anchor_lang::prelude::*;

use crate::{
    constants::*, error::IpRegistryError, state::IpRecord, state::ListForSaleParams,
    state::SaleListing, state::SaleStatus,
};

#[derive(Accounts)]
#[instruction(params: ListForSaleParams)]
pub struct ListForSale<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = ip_record.owner == payer.key() @ IpRegistryError::NotIpOwner)]
    pub ip_record: Account<'info, IpRecord>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + SaleListing::INIT_SPACE,
        seeds = [SALE_SEED, ip_record.key().as_ref()],
        bump,
        constraint = params.price_lamports >= MIN_PRICE_LAMPORTS @ IpRegistryError::PriceTooLow
    )]
    pub sale_listing: Account<'info, SaleListing>,
    pub system_program: Program<'info, System>,
}

pub fn handle_list_for_sale(ctx: Context<ListForSale>, params: ListForSaleParams) -> Result<()> {
    let listing = &mut ctx.accounts.sale_listing;
    require!(
        listing.seller == Pubkey::default() || listing.status != SaleStatus::Open,
        IpRegistryError::ListingAlreadyOpen
    );

    listing.ip_record = ctx.accounts.ip_record.key();
    listing.seller = ctx.accounts.payer.key();
    listing.price_lamports = params.price_lamports;
    listing.status = SaleStatus::Open;
    listing.buyer = Pubkey::default();
    listing.created_at = Clock::get()?.unix_timestamp;
    listing.bump = ctx.bumps.sale_listing;

    msg!(
        "IP {} listed for sale at {} lamports",
        listing.ip_record,
        listing.price_lamports
    );
    Ok(())
}
