use std::sync::Arc;

use anchor_client::anchor_lang::prelude::Pubkey;
use anchor_client::anchor_lang::solana_program::system_program;
use anchor_client::{Client, Cluster, CommitmentConfig};
use solana_keypair::Keypair;

type Payer = Arc<Keypair>;

pub struct ChainConfig {
    rpc_url: String,
    payer_bytes: Vec<u8>,
    program_id: Pubkey,
}

pub const DEFAULT_PROGRAM_ID: &str = "EyUks7W8bCMggP4okvo99xHfuaSaM8tjC74aC1yuDGMV";

impl ChainConfig {
    pub fn from_env() -> Result<Self, String> {
        let rpc_url =
            std::env::var("SOLANA_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8899".to_string());
        let keypair_path = std::env::var("SERVER_KEYPAIR_PATH").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            format!("{home}/.config/solana/id.json")
        });
        let payer_bytes = std::fs::read_to_string(&keypair_path)
            .map_err(|e| format!("cannot read keypair {keypair_path}: {e}"))?;
        let payer_bytes: Vec<u8> = serde_json::from_str(&payer_bytes)
            .map_err(|e| format!("invalid keypair json {keypair_path}: {e}"))?;
        let program_id =
            std::env::var("PROGRAM_ID").unwrap_or_else(|_| DEFAULT_PROGRAM_ID.to_string());
        let program_id = program_id
            .parse()
            .map_err(|e| format!("invalid PROGRAM_ID: {e}"))?;
        Ok(Self {
            rpc_url,
            payer_bytes,
            program_id,
        })
    }

    fn program(&self) -> Result<anchor_client::Program<Payer>, String> {
        let payer = Keypair::try_from(self.payer_bytes.as_slice())
            .map_err(|e| format!("bad payer keypair: {e}"))?;
        let ws_url = self.rpc_url.replacen("http", "ws", 1);
        let cluster = Cluster::Custom(self.rpc_url.clone(), ws_url);
        let client =
            Client::new_with_options(cluster, Arc::new(payer), CommitmentConfig::confirmed());
        client
            .program(self.program_id)
            .map_err(|e| format!("program init: {e}"))
    }

    pub fn ip_record_address(&self, content_hash: &[u8; 32]) -> Pubkey {
        Pubkey::find_program_address(
            &[
                ip_registry::constants::IP_RECORD_SEED,
                content_hash.as_ref(),
            ],
            &self.program_id,
        )
        .0
    }

    pub fn register(
        &self,
        asset_type: ip_registry::state::AssetType,
        title: String,
        content_hash: [u8; 32],
        uri: String,
    ) -> Result<(Pubkey, ip_registry::state::IpRecord, String), String> {
        let program = self.program()?;
        let ip_record = self.ip_record_address(&content_hash);
        let params = ip_registry::state::RegisterIpParams {
            asset_type,
            title,
            content_hash,
            uri,
        };
        let sig = program
            .request()
            .args(ip_registry::instruction::RegisterIp { params })
            .accounts(ip_registry::accounts::RegisterIp {
                payer: program.payer(),
                ip_record,
                system_program: system_program::ID,
            })
            .send()
            .map_err(|e| format!("register_ip tx: {e}"))?;
        let record: ip_registry::state::IpRecord = program
            .account(ip_record)
            .map_err(|e| format!("fetch ip_record: {e}"))?;
        Ok((ip_record, record, sig.to_string()))
    }

    pub fn list_assets(&self) -> Result<Vec<(Pubkey, ip_registry::state::IpRecord)>, String> {
        let program = self.program()?;
        let mut items = program
            .accounts::<ip_registry::state::IpRecord>(vec![])
            .map_err(|e| format!("fetch ip_records: {e}"))?;
        items.sort_by_key(|(_, r)| std::cmp::Reverse(r.registered_at));
        Ok(items)
    }

    pub fn issue_license(
        &self,
        ip_asset_id: Pubkey,
        exclusive: bool,
        royalty_bps: u16,
        expires_at: i64,
    ) -> Result<(Pubkey, ip_registry::state::LicenseRecord, String), String> {
        let program = self.program()?;
        let licensee = program.payer();
        let license = if exclusive {
            let addr = Pubkey::find_program_address(
                &[
                    ip_registry::constants::EXCLUSIVE_LICENSE_SEED,
                    ip_asset_id.as_ref(),
                ],
                &self.program_id,
            )
            .0;
            let params = ip_registry::state::IssueLicenseParams {
                licensee,
                royalty_bps,
                expires_at,
            };
            let sig = program
                .request()
                .args(ip_registry::instruction::IssueExclusiveLicense { params })
                .accounts(ip_registry::accounts::IssueExclusiveLicense {
                    payer: program.payer(),
                    ip_record: ip_asset_id,
                    license: addr,
                    system_program: system_program::ID,
                })
                .send()
                .map_err(|e| format!("issue_exclusive tx: {e}"))?;
            (addr, sig)
        } else {
            let addr = Pubkey::find_program_address(
                &[
                    ip_registry::constants::LICENSE_SEED,
                    ip_asset_id.as_ref(),
                    licensee.as_ref(),
                ],
                &self.program_id,
            )
            .0;
            let params = ip_registry::state::IssueLicenseParams {
                licensee,
                royalty_bps,
                expires_at,
            };
            let sig = program
                .request()
                .args(ip_registry::instruction::IssueNonExclusiveLicense { params })
                .accounts(ip_registry::accounts::IssueNonExclusiveLicense {
                    payer: program.payer(),
                    ip_record: ip_asset_id,
                    license: addr,
                    system_program: system_program::ID,
                })
                .send()
                .map_err(|e| format!("issue_non_exclusive tx: {e}"))?;
            (addr, sig)
        };
        let record: ip_registry::state::LicenseRecord = program
            .account(license.0)
            .map_err(|e| format!("fetch license: {e}"))?;
        Ok((license.0, record, license.1.to_string()))
    }

    pub fn list_licenses(
        &self,
    ) -> Result<Vec<(Pubkey, ip_registry::state::LicenseRecord)>, String> {
        let program = self.program()?;
        let mut items = program
            .accounts::<ip_registry::state::LicenseRecord>(vec![])
            .map_err(|e| format!("fetch licenses: {e}"))?;
        items.sort_by_key(|(_, r)| std::cmp::Reverse(r.issued_at));
        Ok(items)
    }

    pub fn list_for_sale(
        &self,
        ip_asset_id: Pubkey,
        price_lamports: u64,
    ) -> Result<(Pubkey, ip_registry::state::SaleListing, String), String> {
        let program = self.program()?;
        let sale = Pubkey::find_program_address(
            &[ip_registry::constants::SALE_SEED, ip_asset_id.as_ref()],
            &self.program_id,
        )
        .0;
        let params = ip_registry::state::ListForSaleParams { price_lamports };
        let sig = program
            .request()
            .args(ip_registry::instruction::ListForSale { params })
            .accounts(ip_registry::accounts::ListForSale {
                payer: program.payer(),
                ip_record: ip_asset_id,
                sale_listing: sale,
                system_program: system_program::ID,
            })
            .send()
            .map_err(|e| format!("list_for_sale tx: {e}"))?;
        let record: ip_registry::state::SaleListing = program
            .account(sale)
            .map_err(|e| format!("fetch sale_listing: {e}"))?;
        Ok((sale, record, sig.to_string()))
    }

    pub fn list_listings(&self) -> Result<Vec<(Pubkey, ip_registry::state::SaleListing)>, String> {
        let program = self.program()?;
        let mut items = program
            .accounts::<ip_registry::state::SaleListing>(vec![])
            .map_err(|e| format!("fetch sale_listings: {e}"))?;
        items.sort_by_key(|(_, r)| std::cmp::Reverse(r.created_at));
        Ok(items)
    }
}
