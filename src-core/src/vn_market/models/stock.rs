//! Stock and Index models for VCI API

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Deserialize;

/// Symbol information from VCI listing API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VciSymbol {
    /// Stock symbol (e.g., "VNM", "FPT")
    pub symbol: String,

    /// Exchange board: "HSX" (HOSE), "HNX", "UPCOM"
    pub board: String,

    /// Asset type: "STOCK", "ETF", "BOND", etc.
    #[serde(rename = "type")]
    pub asset_type: String,

    /// Company name in Vietnamese
    pub organ_name: String,

    /// Short name
    pub organ_short_name: Option<String>,

    /// English company name
    pub en_organ_name: Option<String>,
}

impl VciSymbol {
    /// Map exchange code to standard format
    pub fn exchange(&self) -> &str {
        match self.board.as_str() {
            "HSX" => "HOSE",
            other => other,
        }
    }

    /// Check if this is a stock (not ETF, bond, etc.)
    pub fn is_stock(&self) -> bool {
        self.asset_type == "STOCK"
    }
}

/// Raw OHLC response from VCI API (array format)
#[derive(Debug, Clone, Deserialize)]
pub struct VciOhlcResponse {
    /// Timestamps (Unix seconds)
    pub t: Vec<i64>,
    /// Open prices (in 1000 VND units)
    pub o: Vec<f64>,
    /// High prices (in 1000 VND units)
    pub h: Vec<f64>,
    /// Low prices (in 1000 VND units)
    pub l: Vec<f64>,
    /// Close prices (in 1000 VND units)
    pub c: Vec<f64>,
    /// Volume
    pub v: Vec<i64>,
}

impl VciOhlcResponse {
    /// Check if response has data
    pub fn is_empty(&self) -> bool {
        self.t.is_empty()
    }

    /// Get number of records
    pub fn len(&self) -> usize {
        self.t.len()
    }
}

/// Processed quote data from VCI
#[derive(Debug, Clone)]
pub struct VciQuote {
    /// Stock symbol
    pub symbol: String,
    /// Quote timestamp
    pub timestamp: DateTime<Utc>,
    /// Open price in VND
    pub open: Decimal,
    /// High price in VND
    pub high: Decimal,
    /// Low price in VND
    pub low: Decimal,
    /// Close price in VND
    pub close: Decimal,
    /// Trading volume
    pub volume: i64,
}

/// VCI interval mapping
#[derive(Debug, Clone, Copy)]
pub enum VciInterval {
    OneMinute,
    OneHour,
    OneDay,
}

impl VciInterval {
    /// Get API value for interval
    pub fn as_api_value(&self) -> &'static str {
        match self {
            VciInterval::OneMinute => "ONE_MINUTE",
            VciInterval::OneHour => "ONE_HOUR",
            VciInterval::OneDay => "ONE_DAY",
        }
    }
}

/// Index symbol mapping (vnstock uses different codes)
pub fn map_index_symbol(symbol: &str) -> Option<&'static str> {
    match symbol.to_uppercase().as_str() {
        "VNINDEX" => Some("VNINDEX"),
        "HNXINDEX" => Some("HNXIndex"),
        "UPCOMINDEX" => Some("HNXUpcomIndex"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vci_symbol_exchange_mapping() {
        let symbol = VciSymbol {
            symbol: "VNM".to_string(),
            board: "HSX".to_string(),
            asset_type: "STOCK".to_string(),
            organ_name: "Vinamilk".to_string(),
            organ_short_name: None,
            en_organ_name: None,
        };
        assert_eq!(symbol.exchange(), "HOSE");
    }

    #[test]
    fn test_index_symbol_mapping() {
        assert_eq!(map_index_symbol("VNINDEX"), Some("VNINDEX"));
        assert_eq!(map_index_symbol("HNXINDEX"), Some("HNXIndex"));
        assert_eq!(map_index_symbol("UNKNOWN"), None);
    }
}
