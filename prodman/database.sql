-- ============================================================
--  ProdMan Database Setup
--  Import this file in phpMyAdmin → Import tab → Go
-- ============================================================

CREATE DATABASE IF NOT EXISTS prodman_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE prodman_db;

CREATE TABLE IF NOT EXISTS products (
    id          INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)    NOT NULL,
    description TEXT            NOT NULL,
    price       DECIMAL(10,2)   NOT NULL,
    stock       INT             NOT NULL DEFAULT 0,
    category    VARCHAR(100)    NOT NULL,
    image_url   VARCHAR(500)    NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock, category, image_url) VALUES
('iPhone 15 Pro',     'Apple flagship smartphone with titanium design and A17 Pro chip.',      75000.00, 30, 'Electronics', 'https://placehold.co/400x400/1a1a2e/ffffff?text=iPhone'),
('Nike Air Max 270',  'Lightweight running shoes with Max Air heel unit for all-day comfort.',   5999.00, 50, 'Footwear',    'https://placehold.co/400x400/16213e/ffffff?text=Nike'),
('Samsung 4K Monitor','32-inch UHD display with HDR10+ and 144Hz refresh rate.',               22500.00, 15, 'Electronics', 'https://placehold.co/400x400/0f3460/ffffff?text=Monitor'),
('Leather Wallet',    'Genuine full-grain leather bifold wallet with RFID blocking.',            1200.00,100, 'Accessories', 'https://placehold.co/400x400/533483/ffffff?text=Wallet'),
('Coffee Maker',      'Programmable drip coffee maker with built-in grinder and thermal carafe.',3450.00, 25, 'Appliances',  'https://placehold.co/400x400/e94560/ffffff?text=Coffee');
