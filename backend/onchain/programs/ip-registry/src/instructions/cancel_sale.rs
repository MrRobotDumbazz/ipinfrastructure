use anchor_lang::prelude::*;

use crate::{error::IpRegistryError, state::SaleListing, state::SaleStatus};

#[derive(Accounts)]
pub struct CancelSale<'info> {
    pub seller: Signer<'info>,
    #[account(
        mut,
        constraint = sale_listing.seller == seller.key() @ IpRegistryError::NotListingSeller,
        constraint = sale_listing.status == SaleStatus::Open @ IpRegistryError::ListingNotOpen
    )]
    pub sale_listing: Account<'info, SaleListing>,
}

pub fn handle_cancel_sale(ctx: Context<CancelSale>) -> Result<()> {
    ctx.accounts.sale_listing.status = SaleStatus::Cancelled;
    msg!(
        "Sale listing for IP {} cancelled",
        ctx.accounts.sale_listing.ip_record
    );
    Ok(())
}
