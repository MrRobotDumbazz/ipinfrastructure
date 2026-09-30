pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EyUks7W8bCMggP4okvo99xHfuaSaM8tjC74aC1yuDGMV");

#[program]
pub mod ip_registry {
    use super::*;

    pub fn register_ip(ctx: Context<RegisterIp>, params: RegisterIpParams) -> Result<()> {
        crate::instructions::register_ip::handle_register_ip(ctx, params)
    }

    pub fn issue_non_exclusive_license(
        ctx: Context<IssueNonExclusiveLicense>,
        params: IssueLicenseParams,
    ) -> Result<()> {
        crate::instructions::issue_license::handle_issue_non_exclusive(ctx, params)
    }

    pub fn issue_exclusive_license(
        ctx: Context<IssueExclusiveLicense>,
        params: IssueLicenseParams,
    ) -> Result<()> {
        crate::instructions::issue_license::handle_issue_exclusive(ctx, params)
    }

    pub fn list_for_sale(ctx: Context<ListForSale>, params: ListForSaleParams) -> Result<()> {
        crate::instructions::list_for_sale::handle_list_for_sale(ctx, params)
    }

    pub fn cancel_sale(ctx: Context<CancelSale>) -> Result<()> {
        crate::instructions::cancel_sale::handle_cancel_sale(ctx)
    }

    pub fn buy_ip(ctx: Context<BuyIp>) -> Result<()> {
        crate::instructions::buy_ip::handle_buy_ip(ctx)
    }
}
