-- Create vn_assets table for caching VN market assets (stocks, funds, indices)
CREATE TABLE IF NOT EXISTS vn_assets (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    exchange TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient searching
CREATE INDEX idx_vn_assets_symbol ON vn_assets(symbol);
CREATE INDEX idx_vn_assets_asset_type ON vn_assets(asset_type);
CREATE INDEX idx_vn_assets_name ON vn_assets(name);
CREATE INDEX idx_vn_assets_created_at ON vn_assets(created_at);

-- Add a sync metadata table to track when assets were last synced
CREATE TABLE IF NOT EXISTS vn_assets_sync (
    id TEXT PRIMARY KEY DEFAULT 'vn_assets_sync_status',
    last_synced_at TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
