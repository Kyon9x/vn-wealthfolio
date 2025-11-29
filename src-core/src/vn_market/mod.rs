//! VN Market Module
//!
//! Native Rust implementation for Vietnamese market data providers.
//! Replaces the external Python vn-market-service with direct API calls.
//!
//! Supported data sources:
//! - VCI (Vietcap): Stocks and Indices
//! - FMarket: Mutual Funds
//! - SJC: Gold Prices

pub mod clients;
pub mod errors;
pub mod models;
pub mod utils;

pub use clients::{FMarketClient, SjcClient, VciClient};
pub use errors::VnMarketError;
