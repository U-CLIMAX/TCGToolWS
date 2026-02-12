CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    salt TEXT NOT NULL,
    last_login_time INTEGER,
    role INTEGER NOT NULL DEFAULT 0,  -- 0: user, 1: premium, 2: developer
    premium_expire_time INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS pending_registrations (
    email TEXT PRIMARY KEY,
    hashed_password TEXT NOT NULL,
    salt TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decks (
    key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    deck_name TEXT NOT NULL,
    series_id TEXT NOT NULL,
    cover_cards_id TEXT NOT NULL,
    deck_data BLOB NOT NULL,
    history BLOB NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);

CREATE TABLE IF NOT EXISTS afdian_orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  afdian_trade_no TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS market_listings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    series_id TEXT NOT NULL,      -- 系列名
    cards_id TEXT NOT NULL,         -- 聯動人卡號 (存成 JSON 字串)
    climax_types TEXT NOT NULL,     -- 潮種類 (存成 JSON 字串，例如 '["門", "枝"]')
    tags TEXT,                      -- Tags (存成 JSON 字串，例如 '["賽場向", "娛樂"]')
    price INTEGER NOT NULL,         -- 價格
    shop_url TEXT NOT NULL,         -- 賣場連結
    deck_code TEXT,                 -- 卡組代碼
    updated_at INTEGER NOT NULL,    -- 建立/更新時間
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON market_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_updated_id ON market_listings(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price_asc_id ON market_listings(price ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_listings_price_desc_id ON market_listings(price DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_listings_series_updated_id ON market_listings( series_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_listings_series_price_asc_id ON market_listings( series_id, price ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_listings_series_price_desc_id ON market_listings( series_id, price DESC, id DESC);

CREATE TABLE IF NOT EXISTS decks_gallery (
    key TEXT PRIMARY KEY,
    series_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    deck_name TEXT NOT NULL,
    cover_cards_id TEXT NOT NULL,
    climax_cards_id TEXT NOT NULL,
    deck_data BLOB NOT NULL,
    rating_avg REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    rating_breakdown TEXT DEFAULT '[0,0,0,0,0]',
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_user_id ON decks_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_updated_id ON decks_gallery(updated_at DESC, key DESC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_updated_asc_id ON decks_gallery(updated_at ASC, key ASC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_series_updated_id ON decks_gallery(series_id, updated_at DESC, key DESC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_series_updated_asc_id ON decks_gallery(series_id, updated_at ASC, key ASC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_rating_desc ON decks_gallery(rating_avg DESC, updated_at DESC, key DESC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_rating_asc ON decks_gallery(rating_avg ASC, updated_at DESC, key DESC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_series_rating_desc ON decks_gallery(series_id, rating_avg DESC, updated_at DESC, key DESC);
CREATE INDEX IF NOT EXISTS idx_decks_gallery_series_rating_asc ON decks_gallery(series_id, rating_avg ASC, updated_at DESC, key DESC);

CREATE TABLE IF NOT EXISTS deck_ratings (
    deck_key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    updated_at INTEGER NOT NULL,

    PRIMARY KEY (deck_key, user_id),

    FOREIGN KEY (deck_key) REFERENCES decks_gallery(key) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deck_ratings_deck_key ON deck_ratings(deck_key);
CREATE INDEX IF NOT EXISTS idx_deck_ratings_user_id ON deck_ratings(user_id);
