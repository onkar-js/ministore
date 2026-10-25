-- MiniStore Database Initialization Script
-- Executed on database container startup to create schema and sample data.

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(120) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Seed initial catalog of products
INSERT INTO products (name, description, price, stock)
SELECT 'The DevOps Handbook', 'Essential practices for world-class agility, reliability, and security.', 32.50, 25
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'The DevOps Handbook');

INSERT INTO products (name, description, price, stock)
SELECT 'Kubernetes Helm Cap', 'Embroidered cotton cap featuring the nautical steering wheel helm logo.', 22.00, 40
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Kubernetes Helm Cap');

INSERT INTO products (name, description, price, stock)
SELECT 'Container Whale Ceramic Mug', '14oz heat-insulated stoneware mug for deep observability sessions.', 16.50, 30
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Container Whale Ceramic Mug');

INSERT INTO products (name, description, price, stock)
SELECT 'Mechanical Tenkeyless Keyboard', 'Linear switches, clean white backlighting, and detachable USB-C cable.', 89.00, 15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mechanical Tenkeyless Keyboard');

INSERT INTO products (name, description, price, stock)
SELECT 'Extended Desk Mat (900x400mm)', 'Micro-weave cloth surface with non-slip natural rubber base.', 24.00, 50
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Extended Desk Mat (900x400mm)');

INSERT INTO products (name, description, price, stock)
SELECT 'Active Noise-Cancelling Headphones', 'Over-ear wireless headphones with 30-hour battery and USB-C fast charging.', 129.99, 12
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Active Noise-Cancelling Headphones');
