use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterIpRequest {
    pub title: String,
    pub r#type: IpAssetTypeDto,
    pub content_hash: String,
    pub uri: Option<String>,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum IpAssetTypeDto {
    Patent,
    Copyright,
    Trademark,
}

impl From<IpAssetTypeDto> for ip_registry::state::AssetType {
    fn from(value: IpAssetTypeDto) -> Self {
        match value {
            IpAssetTypeDto::Patent => ip_registry::state::AssetType::Patent,
            IpAssetTypeDto::Copyright => ip_registry::state::AssetType::Copyright,
            IpAssetTypeDto::Trademark => ip_registry::state::AssetType::Trademark,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpAsset {
    pub id: String,
    pub title: String,
    pub r#type: &'static str,
    pub owner: String,
    pub content_hash: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
    pub registered_at: String,
    pub tx_signature: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueLicenseRequest {
    pub ip_asset_id: String,
    pub license_type: LicenseTypeDto,
    pub royalty_bps: u16,
    pub expires_at: Option<String>,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum LicenseTypeDto {
    Exclusive,
    NonExclusive,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct License {
    pub id: String,
    pub ip_asset_id: String,
    pub license_type: &'static str,
    pub licensee: String,
    pub royalty_bps: u16,
    pub expires_at: Option<String>,
    pub tx_signature: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTradeRequest {
    pub ip_asset_id: String,
    pub price_in_sol: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TradeOrder {
    pub id: String,
    pub ip_asset_id: String,
    pub seller: String,
    pub buyer: Option<String>,
    pub price_in_sol: f64,
    pub status: &'static str,
    pub tx_signature: Option<String>,
}
