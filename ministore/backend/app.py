"""
MiniStore - Beginner-Friendly Flask REST API
Built for DevOps & Kubernetes learning.
"""

import os
import re
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request

app = Flask(__name__)

# Read Database connection configuration from environment variables
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "ministoredb")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
PORT = int(os.environ.get("PORT", "5000"))

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_db_connection():
    """Establishes and returns a new connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=5,
    )


def init_db(max_retries=5, delay=2):
    """
    Creates necessary tables and seeds initial sample products if they don't exist.
    Retries gracefully to accommodate database container startup time in Docker/K8s.
    """
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[MiniStore Backend] Connecting to database {DB_HOST}:{DB_PORT}/{DB_NAME} (attempt {attempt}/{max_retries})...")
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Create products table
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS products (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(120) NOT NULL,
                            description TEXT,
                            price NUMERIC(10, 2) NOT NULL,
                            stock INT NOT NULL DEFAULT 0,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                        """
                    )

                    # Create orders table
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS orders (
                            id SERIAL PRIMARY KEY,
                            customer_name VARCHAR(120) NOT NULL,
                            customer_email VARCHAR(120) NOT NULL,
                            total_price NUMERIC(10, 2) NOT NULL,
                            status VARCHAR(50) DEFAULT 'confirmed',
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                        """
                    )

                    # Create order_items table
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS order_items (
                            id SERIAL PRIMARY KEY,
                            order_id INT REFERENCES orders(id) ON DELETE CASCADE,
                            product_id INT REFERENCES products(id),
                            quantity INT NOT NULL,
                            unit_price NUMERIC(10, 2) NOT NULL
                        );
                        """
                    )

                    # Check if sample products already exist
                    cur.execute("SELECT COUNT(*) FROM products;")
                    count = cur.fetchone()[0]

                    if count == 0:
                        sample_products = [
                            (
                                "The DevOps Handbook",
                                "Essential practices for world-class agility, reliability, and security in tech organizations.",
                                32.50,
                                25,
                            ),
                            (
                                "Kubernetes Helm Cap",
                                "Embroidered cotton cap featuring the nautical steering wheel helm logo.",
                                22.00,
                                40,
                            ),
                            (
                                "Container Whale Ceramic Mug",
                                "14oz heat-insulated stoneware mug for deep observability sessions.",
                                16.50,
                                30,
                            ),
                            (
                                "Mechanical Tenkeyless Keyboard",
                                "Linear switches, clean white backlighting, and detachable USB-C braided cable.",
                                89.00,
                                15,
                            ),
                            (
                                "Extended Desk Mat (900x400mm)",
                                "Micro-weave cloth surface with non-slip natural rubber base.",
                                24.00,
                                50,
                            ),
                            (
                                "Active Noise-Cancelling Headphones",
                                "Over-ear wireless headphones with 30-hour battery and USB-C fast charging.",
                                129.99,
                                12,
                            ),
                        ]
                        for item in sample_products:
                            cur.execute(
                                """
                                INSERT INTO products (name, description, price, stock)
                                VALUES (%s, %s, %s, %s);
                                """,
                                item,
                            )
                        conn.commit()
                        print("[MiniStore Backend] Database schema created and 6 sample products inserted.")
                    else:
                        print(f"[MiniStore Backend] Database already contains {count} products. Skipping seed.")
            return True
        except psycopg2.OperationalError as err:
            print(f"[MiniStore Backend] Database connection failed: {err}")
            if attempt < max_retries:
                time.sleep(delay)
            else:
                print("[MiniStore Backend] Warning: Could not connect to database on startup. Will reconnect on demand.")
                return False


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend process and database connectivity."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
        return (
            jsonify(
                {
                    "status": "ok",
                    "service": "ministore-backend",
                    "database": "connected",
                }
            ),
            200,
        )
    except Exception as err:
        return (
            jsonify(
                {
                    "status": "degraded",
                    "service": "ministore-backend",
                    "database": "disconnected",
                    "error": str(err),
                }
            ),
            503,
        )


@app.route("/api/products", methods=["GET"])
def list_products():
    """Returns the list of all available products with stock information."""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, description, price::float, stock, created_at
                    FROM products
                    ORDER BY id ASC;
                    """
                )
                products = cur.fetchall()
                # Format datetime to isoformat
                for p in products:
                    if p.get("created_at"):
                        p["created_at"] = p["created_at"].isoformat()
        return jsonify(products), 200
    except psycopg2.Error as err:
        return jsonify({"error": "Failed to fetch products from database", "details": str(err)}), 500


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    """Returns details for a single product by ID."""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, description, price::float, stock, created_at
                    FROM products
                    WHERE id = %s;
                    """,
                    (product_id,),
                )
                product = cur.fetchone()
                if not product:
                    return jsonify({"error": f"Product with ID {product_id} not found"}), 404
                if product.get("created_at"):
                    product["created_at"] = product["created_at"].isoformat()
                return jsonify(product), 200
    except psycopg2.Error as err:
        return jsonify({"error": "Failed to query product", "details": str(err)}), 500


@app.route("/api/orders", methods=["POST"])
def create_order():
    """
    Creates a new customer order.
    Validates payload, checks available stock, inserts order and order items,
    and decrements inventory atomically inside a database transaction.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be a valid JSON object"}), 400

    # Input validation: Customer information
    customer_name = data.get("customer_name", "").strip()
    customer_email = data.get("customer_email", "").strip()
    items = data.get("items")

    if not customer_name:
        return jsonify({"error": "Field 'customer_name' is required"}), 400

    if not customer_email or not EMAIL_REGEX.match(customer_email):
        return jsonify({"error": "A valid 'customer_email' is required"}), 400

    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "Field 'items' must be a non-empty list of products"}), 400

    # Validate individual items format
    validated_items = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            return jsonify({"error": f"Item at index {idx} must be a JSON object"}), 400

        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if not isinstance(product_id, int) or product_id <= 0:
            return jsonify({"error": f"Item {idx + 1}: 'product_id' must be a positive integer"}), 400

        if not isinstance(quantity, int) or quantity <= 0:
            return jsonify({"error": f"Item {idx + 1}: 'quantity' must be an integer greater than 0"}), 400

        validated_items.append({"product_id": product_id, "quantity": quantity})

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # We will process each item: lock product row FOR UPDATE, check stock, calculate total
            total_price = 0.0
            order_line_items = []

            for item in validated_items:
                cur.execute(
                    """
                    SELECT id, name, price::float, stock
                    FROM products
                    WHERE id = %s
                    FOR UPDATE;
                    """,
                    (item["product_id"],),
                )
                product = cur.fetchone()

                if not product:
                    conn.rollback()
                    return jsonify({"error": f"Product ID {item['product_id']} does not exist"}), 404

                if product["stock"] < item["quantity"]:
                    conn.rollback()
                    return (
                        jsonify(
                            {
                                "error": f"Insufficient stock for '{product['name']}'. Requested: {item['quantity']}, Available: {product['stock']}"
                            }
                        ),
                        400,
                    )

                line_cost = product["price"] * item["quantity"]
                total_price += line_cost
                order_line_items.append(
                    {
                        "product_id": product["id"],
                        "name": product["name"],
                        "quantity": item["quantity"],
                        "unit_price": product["price"],
                    }
                )

            # Insert into orders table
            cur.execute(
                """
                INSERT INTO orders (customer_name, customer_email, total_price, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at;
                """,
                (customer_name, customer_email, round(total_price, 2), "confirmed"),
            )
            created_order = cur.fetchone()
            order_id = created_order["id"]

            # Insert line items and update inventory
            for line in order_line_items:
                cur.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (order_id, line["product_id"], line["quantity"], line["unit_price"]),
                )
                cur.execute(
                    """
                    UPDATE products
                    SET stock = stock - %s
                    WHERE id = %s;
                    """,
                    (line["quantity"], line["product_id"]),
                )

            # Commit the entire transaction
            conn.commit()

            return (
                jsonify(
                    {
                        "message": "Order created successfully",
                        "order_id": order_id,
                        "customer_name": customer_name,
                        "customer_email": customer_email,
                        "total_price": round(total_price, 2),
                        "items_count": len(order_line_items),
                        "status": "confirmed",
                        "created_at": created_order["created_at"].isoformat() if created_order.get("created_at") else None,
                    }
                ),
                201,
            )

    except psycopg2.Error as err:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred while processing order", "details": str(err)}), 500
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    init_db()
    print(f"[MiniStore Backend] Starting HTTP server on 0.0.0.0:{PORT}...")
    app.run(host="0.0.0.0", port=PORT)
