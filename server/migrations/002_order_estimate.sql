ALTER TABLE orders ADD COLUMN estimated_cashback INTEGER CHECK(estimated_cashback IS NULL OR estimated_cashback >= 0);
UPDATE orders SET estimated_cashback=cashback WHERE status='pending';
