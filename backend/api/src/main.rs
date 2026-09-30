use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::json;

mod chain;
mod dto;
mod error;
mod extract;
mod validate;

use anchor_client::anchor_lang::prelude::Pubkey;
use chain::ChainConfig;
use dto::{
    CreateTradeRequest, IpAsset, IssueLicenseRequest, License, LicenseTypeDto, RegisterIpRequest,
    TradeOrder,
};
use error::ApiError;
use extract::ContractJson;

const MAX_TITLE_LEN: usize = 128;
const MAX_URI_LEN: usize = 256;
const MAX_ROYALTY_BPS: u16 = 10_000;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Arc::new(
        ChainConfig::from_env().map_err(|e| std::io::Error::other(format!("config: {e}")))?,
    );
    let app = Router::new()
        .route("/api/v1/ip/register", post(register_ip).get(not_found))
        .route("/api/v1/ip/assets", get(list_ip_assets))
        .route(
            "/api/v1/ip/licenses",
            get(list_licenses).post(issue_license),
        )
        .route(
            "/api/v1/trade/orders",
            get(list_trade_orders).post(create_trade_order),
        )
        .with_state(config);
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("ip-api listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn not_found() -> Response {
    ApiError::BadRequest("method not allowed".into()).into_response()
}

async fn register_ip(
    State(config): State<Arc<ChainConfig>>,
    ContractJson(req): ContractJson<RegisterIpRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let title = req.title.trim().to_string();
    if title.is_empty() || title.len() > MAX_TITLE_LEN {
        return Err(ApiError::BadRequest(
            "title must be 1..=128 characters".into(),
        ));
    }
    let uri = req.uri.unwrap_or_default();
    if uri.len() > MAX_URI_LEN {
        return Err(ApiError::BadRequest(
            "uri must be at most 256 characters".into(),
        ));
    }
    let content_hash =
        validate::parse_content_hash(&req.content_hash).map_err(ApiError::BadRequest)?;

    let asset_type: ip_registry::state::AssetType = req.r#type.into();
    let result =
        tokio::task::spawn_blocking(move || config.register(asset_type, title, content_hash, uri))
            .await
            .map_err(|e| ApiError::Upstream(e.to_string()))?
            .map_err(ApiError::Upstream)?;

    let (id, record, tx_signature) = result;
    Ok((
        StatusCode::CREATED,
        Json(IpAsset {
            id: id.to_string(),
            title: record.title,
            r#type: req_type_str(&record.asset_type),
            owner: record.owner.to_string(),
            content_hash: validate::hex_hash(&record.content_hash),
            uri: if record.uri.is_empty() {
                None
            } else {
                Some(record.uri)
            },
            registered_at: validate::unix_to_iso(record.registered_at),
            tx_signature,
        }),
    ))
}

fn req_type_str(asset_type: &ip_registry::state::AssetType) -> &'static str {
    match asset_type {
        ip_registry::state::AssetType::Patent => "patent",
        ip_registry::state::AssetType::Copyright => "copyright",
        ip_registry::state::AssetType::Trademark => "trademark",
    }
}

async fn list_ip_assets(
    State(config): State<Arc<ChainConfig>>,
) -> Result<impl IntoResponse, ApiError> {
    let items = tokio::task::spawn_blocking(move || config.list_assets())
        .await
        .map_err(|e| ApiError::Upstream(e.to_string()))?
        .map_err(ApiError::Upstream)?;
    let assets: Vec<IpAsset> = items
        .into_iter()
        .map(|(id, record)| IpAsset {
            id: id.to_string(),
            title: record.title,
            r#type: req_type_str(&record.asset_type),
            owner: record.owner.to_string(),
            content_hash: validate::hex_hash(&record.content_hash),
            uri: if record.uri.is_empty() {
                None
            } else {
                Some(record.uri)
            },
            registered_at: validate::unix_to_iso(record.registered_at),
            tx_signature: String::new(),
        })
        .collect();
    Ok((StatusCode::OK, Json(json!(assets))))
}

async fn issue_license(
    State(config): State<Arc<ChainConfig>>,
    ContractJson(req): ContractJson<IssueLicenseRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let ip_asset_id: Pubkey = req
        .ip_asset_id
        .parse()
        .map_err(|e| ApiError::BadRequest(format!("invalid ipAssetId: {e}")))?;
    if req.royalty_bps > MAX_ROYALTY_BPS {
        return Err(ApiError::BadRequest("royaltyBps must be 0..=10000".into()));
    }
    let expires_at = match &req.expires_at {
        None => 0,
        Some(iso) => validate::iso_to_unix(iso).map_err(ApiError::BadRequest)?,
    };
    let exclusive = matches!(req.license_type, LicenseTypeDto::Exclusive);

    let result = tokio::task::spawn_blocking(move || {
        config.issue_license(ip_asset_id, exclusive, req.royalty_bps, expires_at)
    })
    .await
    .map_err(|e| ApiError::Upstream(e.to_string()))?
    .map_err(ApiError::Upstream)?;

    let (id, record, tx_signature) = result;
    Ok((
        StatusCode::CREATED,
        Json(License {
            id: id.to_string(),
            ip_asset_id: record.ip_record.to_string(),
            license_type: license_type_str(&record.license_type),
            licensee: record.licensee.to_string(),
            royalty_bps: record.royalty_bps,
            expires_at: if record.expires_at == 0 {
                None
            } else {
                Some(validate::unix_to_iso(record.expires_at))
            },
            tx_signature,
        }),
    ))
}

fn license_type_str(license_type: &ip_registry::state::LicenseType) -> &'static str {
    match license_type {
        ip_registry::state::LicenseType::Exclusive => "exclusive",
        ip_registry::state::LicenseType::NonExclusive => "non-exclusive",
    }
}

async fn list_licenses(
    State(config): State<Arc<ChainConfig>>,
) -> Result<impl IntoResponse, ApiError> {
    let items = tokio::task::spawn_blocking(move || config.list_licenses())
        .await
        .map_err(|e| ApiError::Upstream(e.to_string()))?
        .map_err(ApiError::Upstream)?;
    let licenses: Vec<License> = items
        .into_iter()
        .map(|(id, record)| License {
            id: id.to_string(),
            ip_asset_id: record.ip_record.to_string(),
            license_type: license_type_str(&record.license_type),
            licensee: record.licensee.to_string(),
            royalty_bps: record.royalty_bps,
            expires_at: if record.expires_at == 0 {
                None
            } else {
                Some(validate::unix_to_iso(record.expires_at))
            },
            tx_signature: String::new(),
        })
        .collect();
    Ok((StatusCode::OK, Json(json!(licenses))))
}

async fn create_trade_order(
    State(config): State<Arc<ChainConfig>>,
    ContractJson(req): ContractJson<CreateTradeRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let ip_asset_id: Pubkey = req
        .ip_asset_id
        .parse()
        .map_err(|e| ApiError::BadRequest(format!("invalid ipAssetId: {e}")))?;
    let price_lamports =
        validate::sol_to_lamports(req.price_in_sol).map_err(ApiError::BadRequest)?;

    let result =
        tokio::task::spawn_blocking(move || config.list_for_sale(ip_asset_id, price_lamports))
            .await
            .map_err(|e| ApiError::Upstream(e.to_string()))?
            .map_err(ApiError::Upstream)?;

    let (id, record, tx_signature) = result;
    Ok((
        StatusCode::CREATED,
        Json(TradeOrder {
            id: id.to_string(),
            ip_asset_id: record.ip_record.to_string(),
            seller: record.seller.to_string(),
            buyer: None,
            price_in_sol: validate::lamports_to_sol(record.price_lamports),
            status: sale_status_str(&record.status),
            tx_signature: Some(tx_signature),
        }),
    ))
}

fn sale_status_str(status: &ip_registry::state::SaleStatus) -> &'static str {
    match status {
        ip_registry::state::SaleStatus::Open => "open",
        ip_registry::state::SaleStatus::Completed => "completed",
        ip_registry::state::SaleStatus::Cancelled => "cancelled",
    }
}

async fn list_trade_orders(
    State(config): State<Arc<ChainConfig>>,
) -> Result<impl IntoResponse, ApiError> {
    let items = tokio::task::spawn_blocking(move || config.list_listings())
        .await
        .map_err(|e| ApiError::Upstream(e.to_string()))?
        .map_err(ApiError::Upstream)?;
    let orders: Vec<TradeOrder> = items
        .into_iter()
        .filter(|(_, record)| matches!(record.status, ip_registry::state::SaleStatus::Open))
        .map(|(id, record)| TradeOrder {
            id: id.to_string(),
            ip_asset_id: record.ip_record.to_string(),
            seller: record.seller.to_string(),
            buyer: if record.buyer == Pubkey::default() {
                None
            } else {
                Some(record.buyer.to_string())
            },
            price_in_sol: validate::lamports_to_sol(record.price_lamports),
            status: sale_status_str(&record.status),
            tx_signature: None,
        })
        .collect();
    Ok((StatusCode::OK, Json(json!(orders))))
}
