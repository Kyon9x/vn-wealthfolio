//! VN Market Module
//!
//! Native Rust implementation for Vietnamese market data providers.
//! Replaces the external Python vn-market-service with direct API calls.
//!
//! Supported data sources:
//! - VCI (Vietcap): Stocks and Indices
//! - FMarket: Mutual Funds
//! - SJC: Gold Prices

pub mod assets_model;
pub mod assets_repository;
pub mod assets_sync_service;
pub mod cache;
pub mod clients;
pub mod errors;
pub mod models;
pub mod service;
pub mod utils;

pub use assets_model::{NewVnAsset, VnAsset};
pub use assets_repository::VnAssetsRepository;
pub use assets_sync_service::{VnAssetsSyncService, SyncResult};
pub use cache::{VnAssetType, VnHistoricalCache, VnHistoricalRecord, VnQuoteCache};
pub use clients::{FMarketClient, SjcClient, VciClient};
pub use errors::VnMarketError;
pub use service::{SearchResult, VnMarketService};
