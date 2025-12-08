//! VN Assets Sync Service - Fetches and caches all supported assets from VCI and FMarket

use chrono::Utc;
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::SqliteConnection;
use log::{debug, info};
use std::sync::Arc;

use crate::db::get_connection;
use crate::errors::Result;
use crate::schema::vn_assets_sync;
use crate::vn_market::clients::{FMarketClient, VciClient};

use super::assets_model::NewVnAsset;
use super::assets_repository::VnAssetsRepository;

type DbPool = Pool<ConnectionManager<SqliteConnection>>;

pub struct VnAssetsSyncService {
    pool: Arc<DbPool>,
    vci_client: VciClient,
    fmarket_client: Arc<tokio::sync::RwLock<FMarketClient>>,
    repository: VnAssetsRepository,
}

impl VnAssetsSyncService {
    pub fn new(pool: Arc<DbPool>) -> Self {
        let repository = VnAssetsRepository::new(pool.clone());
        Self {
            pool,
            vci_client: VciClient::new(),
            fmarket_client: Arc::new(tokio::sync::RwLock::new(FMarketClient::new())),
            repository,
        }
    }

    /// Fetch all supported assets from VCI and FMarket and sync to cache
    pub async fn sync_all_assets(&self) -> Result<SyncResult> {
        info!("Starting VN assets sync from VCI and FMarket...");

        let mut total_synced = 0;

        // Fetch stocks and indices from VCI
        match self.sync_stocks_and_indices().await {
            Ok(count) => {
                info!("Synced {} stocks and indices from VCI", count);
                total_synced += count;
            }
            Err(e) => {
                log::warn!("Failed to sync stocks: {}", e);
            }
        }

        // Fetch funds from FMarket
        match self.sync_funds().await {
            Ok(count) => {
                info!("Synced {} funds from FMarket", count);
                total_synced += count;
            }
            Err(e) => {
                log::warn!("Failed to sync funds: {}", e);
            }
        }

        // Update sync metadata
        self.update_sync_metadata(total_synced)?;

        info!(
            "VN assets sync completed. Total synced: {}",
            total_synced
        );

        Ok(SyncResult {
            total_synced,
            timestamp: Utc::now(),
        })
    }

    /// Sync stocks and indices from VCI
    async fn sync_stocks_and_indices(&self) -> std::result::Result<usize, String> {
        let symbols = self
            .vci_client
            .get_all_symbols()
            .await
            .map_err(|e| e.to_string())?;

        let mut assets_to_insert = Vec::new();

        for symbol in symbols {
            if !symbol.is_listed() {
                continue;
            }

            let is_index = symbol.symbol.contains("INDEX") || symbol.symbol.starts_with("VN");
            let asset_type = if is_index {
                "Index".to_string()
            } else if symbol.is_stock() {
                "Stock".to_string()
            } else {
                continue;
            };

            let asset = NewVnAsset::new(
                symbol.symbol.clone(),
                symbol.display_name().to_string(),
                asset_type,
                symbol.exchange().to_string(),
            );

            assets_to_insert.push(asset);
        }

        let count = assets_to_insert.len();
        if count > 0 {
            self.repository
                .upsert_bulk(&assets_to_insert)
                .map_err(|e| e.to_string())?;
            debug!("Inserted {} stocks/indices", count);
        }

        Ok(count)
    }

    /// Sync funds from FMarket
    async fn sync_funds(&self) -> std::result::Result<usize, String> {
        let client = self.fmarket_client.write().await;
        let funds = client
            .get_funds_listing()
            .await
            .map_err(|e| e.to_string())?;

        let assets_to_insert: Vec<NewVnAsset> = funds
            .into_iter()
            .map(|fund| {
                NewVnAsset::new(
                    fund.short_name.clone(),
                    fund.name.clone(),
                    "Fund".to_string(),
                    "FUND".to_string(),
                )
            })
            .collect();

        let count = assets_to_insert.len();
        if count > 0 {
            self.repository
                .upsert_bulk(&assets_to_insert)
                .map_err(|e| e.to_string())?;
            debug!("Inserted {} funds", count);
        }

        Ok(count)
    }

    /// Update sync metadata
    fn update_sync_metadata(&self, _synced_count: usize) -> Result<()> {
        let mut conn = get_connection(&self.pool)?;
        let now = Utc::now().to_rfc3339();

        // Check if entry exists
        let exists: bool = diesel::select(diesel::dsl::exists(
            vn_assets_sync::table.filter(vn_assets_sync::id.eq("vn_assets_sync_status")),
        ))
        .get_result(&mut conn)?;

        if exists {
            diesel::update(vn_assets_sync::table)
                .filter(vn_assets_sync::id.eq("vn_assets_sync_status"))
                .set((
                    vn_assets_sync::last_synced_at.eq(&now),
                    vn_assets_sync::updated_at.eq(&now),
                ))
                .execute(&mut conn)?;
        } else {
            diesel::insert_into(vn_assets_sync::table)
                .values((
                    vn_assets_sync::id.eq("vn_assets_sync_status"),
                    vn_assets_sync::last_synced_at.eq(&now),
                    vn_assets_sync::sync_count.eq(1),
                    vn_assets_sync::created_at.eq(&now),
                    vn_assets_sync::updated_at.eq(&now),
                ))
                .execute(&mut conn)?;
        }

        Ok(())
    }

    /// Get asset count from cache
    pub fn get_asset_count(&self) -> Result<i64> {
        self.repository.count()
    }
}

#[derive(Debug, Clone)]
pub struct SyncResult {
    pub total_synced: usize,
    pub timestamp: chrono::DateTime<Utc>,
}
