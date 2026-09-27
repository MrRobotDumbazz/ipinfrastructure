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
}
