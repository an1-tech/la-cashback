CREATE INDEX IF NOT EXISTS orders_release_due ON orders(user_id,status,released,available_at);
CREATE INDEX IF NOT EXISTS orders_status_updated ON orders(status,updated_at);
CREATE INDEX IF NOT EXISTS notifications_user_read ON notifications(user_id,read_at);
CREATE INDEX IF NOT EXISTS withdrawals_user_date ON withdrawals(user_id,created_at);
CREATE INDEX IF NOT EXISTS clicks_user_date ON clicks(user_id,created_at);
CREATE INDEX IF NOT EXISTS provider_events_state_date ON provider_events(state,created_at);
