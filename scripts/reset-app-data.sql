-- One-time reset of Teumpick user and usage data. Keep schema and migrations.
DELETE FROM sessions;
DELETE FROM pickup_orders;
DELETE FROM merchants;
DELETE FROM members;
DELETE FROM orders;
DELETE FROM auth_attempts;

-- All six counts must be zero after the reset.
SELECT 'sessions' AS table_name, COUNT(*) AS rows_left FROM sessions
UNION ALL SELECT 'pickup_orders', COUNT(*) FROM pickup_orders
UNION ALL SELECT 'merchants', COUNT(*) FROM merchants
UNION ALL SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'auth_attempts', COUNT(*) FROM auth_attempts;
