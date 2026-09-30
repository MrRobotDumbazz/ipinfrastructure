use anchor_lang::prelude::*;

use crate::{error::IpRegistryError, state::IpRecord, state::SaleListing, state::SaleStatus};

#[derive(Accounts)]
pub struct BuyIp<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = ip_record.key() == sale_listing.ip_record @ IpRegistryError::ListingIpMismatch
    )]
    pub ip_record: Account<'info, IpRecord>,
    #[account(
        mut,
        constraint = sale_listing.status == SaleStatus::Open @ IpRegistryError::ListingNotOpen,
        constraint = sale_listing.seller == ip_record.owner @ IpRegistryError::ListingSellerMismatch
    )]
    pub sale_listing: Account<'info, SaleListing>,
    #[account(
        mut,
        constraint = seller.key() == sale_listing.seller @ IpRegistryError::ListingSellerMismatch,
        constraint = seller.key() != buyer.key() @ IpRegistryError::SelfPurchase
    )]
    pub seller: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy_ip(ctx: Context<BuyIp>) -> Result<()> {
    let price = ctx.accounts.sale_listing.price_lamports;

    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.buyer.to_account_info(),
        to: ctx.accounts.seller.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(anchor_lang::system_program::ID, cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, price)?;

    ctx.accounts.ip_record.owner = ctx.accounts.buyer.key();
    ctx.accounts.sale_listing.status = SaleStatus::Completed;
    ctx.accounts.sale_listing.buyer = ctx.accounts.buyer.key();

    msg!(
        "IP {} sold to {} for {} lamports",
        ctx.accounts.ip_record.key(),
        ctx.accounts.buyer.key(),
        price
    );
    Ok(())
}
