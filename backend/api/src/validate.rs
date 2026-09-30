use chrono::{DateTime, SecondsFormat, TimeZone, Utc};

pub fn parse_content_hash(value: &str) -> Result<[u8; 32], String> {
    if value.len() == 64 {
        let decoded = hex::decode(value).map_err(|e| format!("invalid hex contentHash: {e}"))?;
        decoded
            .try_into()
            .map_err(|_| "contentHash must be 32 bytes".to_string())
    } else {
        let decoded = bs58::decode(value)
            .into_vec()
            .map_err(|e| format!("invalid base58 contentHash: {e}"))?;
        decoded
            .try_into()
            .map_err(|_| "contentHash must be 32 bytes".to_string())
    }
}

pub fn hex_hash(hash: &[u8; 32]) -> String {
    hex::encode(hash)
}

pub fn sol_to_lamports(price_in_sol: f64) -> Result<u64, String> {
    if !price_in_sol.is_finite() || price_in_sol <= 0.0 {
        return Err("priceInSol must be a positive number".to_string());
    }
    let lamports = (price_in_sol * 1_000_000_000.0).round();
    if lamports < 1.0 {
        return Err("priceInSol must be at least 0.000000001".to_string());
    }
    if lamports > u64::MAX as f64 {
        return Err("priceInSol is too large".to_string());
    }
    Ok(lamports as u64)
}

pub fn lamports_to_sol(lamports: u64) -> f64 {
    lamports as f64 / 1_000_000_000.0
}

pub fn unix_to_iso(unix: i64) -> String {
    Utc.timestamp_opt(unix, 0)
        .single()
        .map(|dt| dt.to_rfc3339_opts(SecondsFormat::Secs, true))
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

pub fn iso_to_unix(value: &str) -> Result<i64, String> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.timestamp())
        .map_err(|e| format!("invalid expiresAt: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_hex_content_hash() {
        let input = "0102".repeat(16);
        let parsed = parse_content_hash(&input).unwrap();
        assert_eq!(parsed[0], 1);
        assert_eq!(parsed[31], 2);
    }

    #[test]
    fn parses_base58_content_hash() {
        let hash = [7u8; 32];
        let encoded = bs58::encode(hash).into_string();
        assert_eq!(parse_content_hash(&encoded).unwrap(), hash);
    }

    #[test]
    fn rejects_bad_content_hash() {
        assert!(parse_content_hash("zz").is_err());
        assert!(parse_content_hash(&"0".repeat(63)).is_err());
    }

    #[test]
    fn converts_min_price() {
        assert_eq!(sol_to_lamports(0.000000001).unwrap(), 1);
        assert_eq!(sol_to_lamports(1.5).unwrap(), 1_500_000_000);
        assert!(sol_to_lamports(0.0).is_err());
        assert!(sol_to_lamports(-1.0).is_err());
    }

    #[test]
    fn roundtrips_iso_unix() {
        let iso = "2027-01-15T00:00:00Z";
        let unix = iso_to_unix(iso).unwrap();
        assert_eq!(unix_to_iso(unix), iso);
    }
}
