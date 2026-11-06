CREATE TABLE IF NOT EXISTS click_products (
 click_id TEXT PRIMARY KEY REFERENCES clicks(id),
 item_id TEXT NOT NULL, title TEXT NOT NULL, shop_name TEXT, image_url TEXT,
 price INTEGER CHECK(price IS NULL OR price >= 0),
 commission INTEGER CHECK(commission IS NULL OR commission >= 0),
 source TEXT NOT NULL, fetched_at TEXT NOT NULL
);
