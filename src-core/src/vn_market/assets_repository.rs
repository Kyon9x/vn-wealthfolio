//! VN Assets Repository - manages caching of market reference data

use diesel::prelude::*;
use diesel::r2d2::{self, Pool};
use diesel::sqlite::SqliteConnection;
use log::{debug, warn};
use std::sync::Arc;

use crate::db::get_connection;
use crate::errors::Result;
use crate::schema::vn_assets;

use super::assets_model::{NewVnAsset, VnAsset};

pub struct VnAssetsRepository {
    pool: Arc<Pool<r2d2::ConnectionManager<SqliteConnection>>>,
}

impl VnAssetsRepository {
    pub fn new(pool: Arc<Pool<r2d2::ConnectionManager<SqliteConnection>>>) -> Self {
        Self { pool }
    }

    /// Search for assets by symbol or name
    pub fn search(&self, query: &str) -> Result<Vec<VnAsset>> {
        let mut conn = get_connection(&self.pool)?;
        let query_lower = format!("%{}%", query.to_lowercase());

        let results = vn_assets::table
            .filter(
                vn_assets::symbol
                    .like(&query_lower)
                    .or(vn_assets::name.like(&query_lower)),
            )
            .limit(20)
            .load::<VnAsset>(&mut conn)?;

        Ok(results)
    }

    /// Get asset by symbol
    pub fn get_by_symbol(&self, symbol: &str) -> Result<Option<VnAsset>> {
        let mut conn = get_connection(&self.pool)?;

        let result = vn_assets::table
            .filter(vn_assets::symbol.eq(symbol))
            .first::<VnAsset>(&mut conn)
            .optional()?;

        Ok(result)
    }

    /// Get all assets of a specific type
    pub fn get_by_type(&self, asset_type: &str) -> Result<Vec<VnAsset>> {
        let mut conn = get_connection(&self.pool)?;

        let results = vn_assets::table
            .filter(vn_assets::asset_type.eq(asset_type))
            .load::<VnAsset>(&mut conn)?;

        Ok(results)
    }

    /// Get count of assets
    pub fn count(&self) -> Result<i64> {
        let mut conn = get_connection(&self.pool)?;

        let count = vn_assets::table.count().get_result(&mut conn)?;

        Ok(count)
    }

    /// Insert or update assets in bulk
    pub fn upsert_bulk(&self, assets: &[NewVnAsset]) -> Result<usize> {
        if assets.is_empty() {
            return Ok(0);
        }

        let mut conn = get_connection(&self.pool)?;

        let mut count = 0;
        for asset in assets {
            // Use replace or insert or replace
            diesel::insert_into(vn_assets::table)
                .values((
                    vn_assets::id.eq(&asset.id),
                    vn_assets::symbol.eq(&asset.symbol),
                    vn_assets::name.eq(&asset.name),
                    vn_assets::asset_type.eq(&asset.asset_type),
                    vn_assets::exchange.eq(&asset.exchange),
                    vn_assets::currency.eq(&asset.currency),
                ))
                .on_conflict(vn_assets::symbol)
                .do_update()
                .set((
                    vn_assets::name.eq(&asset.name),
                    vn_assets::asset_type.eq(&asset.asset_type),
                    vn_assets::exchange.eq(&asset.exchange),
                    vn_assets::updated_at.eq(chrono::Utc::now().to_rfc3339()),
                ))
                .execute(&mut conn)?;
            count += 1;
        }

        debug!("Upserted {} VN assets", count);
        Ok(count)
    }

    /// Clear all assets
    pub fn clear_all(&self) -> Result<usize> {
        let mut conn = get_connection(&self.pool)?;

        let rows = diesel::delete(vn_assets::table).execute(&mut conn)?;

        warn!("Cleared {} VN assets from cache", rows);
        Ok(rows)
    }
}
