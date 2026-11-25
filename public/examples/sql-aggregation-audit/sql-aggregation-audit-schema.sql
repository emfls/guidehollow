-- GuideHollow Benchmark Test Suite: SQL Aggregation Verification
-- Fixture for validating AI-generated GROUP BY, HAVING, and COUNT(NULL) queries.

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    country TEXT NOT NULL,
    account_tier TEXT NOT NULL
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL, -- Can be NULL for no discount
    status TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Seed Data: 5 Customers
INSERT INTO customers VALUES (1, 'Acme Corp', 'USA', 'Enterprise');
INSERT INTO customers VALUES (2, 'Globex Logistics', 'USA', 'Standard');
INSERT INTO customers VALUES (3, 'Initech Software', 'CAN', 'Enterprise');
INSERT INTO customers VALUES (4, 'Umbrella Bio', 'UK', 'Standard');
INSERT INTO customers VALUES (5, 'Stark Energy', 'USA', 'Enterprise');

-- Seed Data: 8 Orders with intentional NULLs and month boundaries
INSERT INTO orders VALUES (101, 1, '2026-11-01 14:00:00', 1200.00, 100.00, 'COMPLETED');
INSERT INTO orders VALUES (102, 1, '2026-11-15 09:30:00', 800.00, NULL, 'COMPLETED');
INSERT INTO orders VALUES (103, 2, '2026-11-20 16:45:00', 450.00, NULL, 'COMPLETED');
INSERT INTO orders VALUES (104, 2, '2026-11-22 11:15:00', 300.00, 25.00, 'REFUNDED');
INSERT INTO orders VALUES (105, 3, '2026-10-31 23:55:00', 2500.00, 250.00, 'COMPLETED');
INSERT INTO orders VALUES (106, 3, '2026-11-05 13:20:00', 1500.00, NULL, 'COMPLETED');
INSERT INTO orders VALUES (107, 4, '2026-11-12 10:00:00', 150.00, NULL, 'CANCELLED');
INSERT INTO orders VALUES (108, 5, '2026-11-22 17:00:00', 950.00, 50.00, 'COMPLETED');
