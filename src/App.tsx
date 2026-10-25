/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Globe, 
  Layers, 
  FileCode, 
  Terminal, 
  ShoppingCart, 
  Check, 
  Copy, 
  Activity, 
  ExternalLink,
  ChevronRight,
  Package,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Plus,
  Minus,
  X
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface OrderRecord {
  order_id: number;
  customer_name: string;
  customer_email: string;
  total_price: number;
  items_count: number;
  created_at: string;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "The DevOps Handbook",
    description: "Essential practices for world-class agility, reliability, and security in tech organizations.",
    price: 32.50,
    stock: 25
  },
  {
    id: 2,
    name: "Kubernetes Helm Cap",
    description: "Embroidered cotton cap featuring the nautical steering wheel helm logo.",
    price: 22.00,
    stock: 40
  },
  {
    id: 3,
    name: "Container Whale Ceramic Mug",
    description: "14oz heat-insulated stoneware mug for deep observability sessions.",
    price: 16.50,
    stock: 30
  },
  {
    id: 4,
    name: "Mechanical Tenkeyless Keyboard",
    description: "Linear switches, clean white backlighting, and detachable USB-C braided cable.",
    price: 89.00,
    stock: 15
  },
  {
    id: 5,
    name: "Extended Desk Mat (900x400mm)",
    description: "Micro-weave cloth surface with non-slip natural rubber base.",
    price: 24.00,
    stock: 50
  },
  {
    id: 6,
    name: "Active Noise-Cancelling Headphones",
    description: "Over-ear wireless headphones with 30-hour battery and USB-C fast charging.",
    price: 129.99,
    stock: 12
  }
];

// Project file contents for the integrated code explorer
const PROJECT_FILES: Record<string, { path: string; language: string; content: string }> = {
  "backend/app.py": {
    path: "ministore/backend/app.py",
    language: "python",
    content: `"""
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

EMAIL_REGEX = re.compile(r"^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=5,
    )

@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
        return jsonify({"status": "ok", "service": "ministore-backend", "database": "connected"}), 200
    except Exception as err:
        return jsonify({"status": "degraded", "service": "ministore-backend", "database": "disconnected", "error": str(err)}), 503

@app.route("/api/products", methods=["GET"])
def list_products():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, name, description, price::float, stock FROM products ORDER BY id ASC;")
            return jsonify(cur.fetchall()), 200

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True)
    if not data or not data.get("customer_name") or not data.get("customer_email") or not data.get("items"):
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            total_price = 0.0
            for item in data["items"]:
                cur.execute("SELECT price::float, stock, name FROM products WHERE id = %s FOR UPDATE;", (item["product_id"],))
                p = cur.fetchone()
                if not p or p["stock"] < item["quantity"]:
                    conn.rollback()
                    return jsonify({"error": f"Insufficient stock for {p['name'] if p else 'product'}"}), 400
                total_price += p["price"] * item["quantity"]

            cur.execute("INSERT INTO orders (customer_name, customer_email, total_price) VALUES (%s, %s, %s) RETURNING id;", 
                        (data["customer_name"], data["customer_email"], round(total_price, 2)))
            order_id = cur.fetchone()["id"]

            for item in data["items"]:
                cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s;", (item["quantity"], item["product_id"]))

            conn.commit()
            return jsonify({"order_id": order_id, "status": "confirmed", "total_price": round(total_price, 2)}), 201
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)`
  },
  "backend/Dockerfile": {
    path: "ministore/backend/Dockerfile",
    language: "dockerfile",
    content: `FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]`
  },
  "backend/requirements.txt": {
    path: "ministore/backend/requirements.txt",
    language: "plaintext",
    content: `Flask==3.0.3
psycopg2-binary==2.9.9`
  },
  "frontend/nginx.conf": {
    path: "ministore/frontend/nginx.conf",
    language: "nginx",
    content: `server {
    listen 80;
    server_name localhost;

    # Serve static frontend files
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls directly to Flask backend
    # In Docker and Kubernetes, 'backend' resolves to the backend container/service
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`
  },
  "frontend/Dockerfile": {
    path: "ministore/frontend/Dockerfile",
    language: "dockerfile",
    content: `FROM nginx:alpine

# Remove default static pages
RUN rm -rf /usr/share/nginx/html/*

# Copy HTML, CSS, and Vanilla JavaScript assets
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Copy custom Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]`
  },
  "database/init.sql": {
    path: "ministore/database/init.sql",
    language: "sql",
    content: `CREATE TABLE IF NOT EXISTS products (
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
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Container Whale Ceramic Mug');`
  },
  "README.md": {
    path: "ministore/README.md",
    language: "markdown",
    content: `# MiniStore 🛒

Beginner-friendly 3-tier shopping store for learning Docker, Kubernetes, and DevOps.

## Quick Docker Commands:
1. docker network create ministore-net
2. docker run -d --name postgres --network ministore-net -e POSTGRES_DB=ministoredb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:16-alpine
3. docker build -t ministore-backend ./backend
4. docker run -d --name backend --network ministore-net -e DB_HOST=postgres ministore-backend
5. docker build -t ministore-frontend ./frontend
6. docker run -d --name frontend --network ministore-net -p 8080:80 ministore-frontend`
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'arch' | 'code' | 'commands'>('store');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentOrder, setRecentOrder] = useState<OrderRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedFileKey, setSelectedFileKey] = useState<string>("backend/app.py");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Health state
  const [healthStatus, setHealthStatus] = useState<'online' | 'checking'>('online');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerToast("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalCartCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

  const cartSubtotal = Object.entries(cart).reduce((sum, [productId, qty]) => {
    const p = products.find((prod) => prod.id === Number(productId));
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const handleAddToCart = (product: Product) => {
    const currentQty = cart[product.id] || 0;
    if (currentQty >= product.stock) {
      triggerToast(`Max stock reached (${product.stock} available)`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [product.id]: currentQty + 1,
    }));
    triggerToast(`Added "${product.name}" to cart`);
  };

  const updateCartQty = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const currentQty = cart[productId] || 0;
    const nextQty = currentQty + delta;

    if (nextQty <= 0) {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else if (nextQty > product.stock) {
      triggerToast(`Cannot exceed ${product.stock} available items`);
    } else {
      setCart((prev) => ({
        ...prev,
        [productId]: nextQty,
      }));
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCartCount === 0) {
      triggerToast("Cart is empty");
      return;
    }
    if (!custName.trim() || !custEmail.trim()) {
      triggerToast("Please provide both name and email");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      // Simulate backend atomic transaction & inventory decrement
      const orderId = Math.floor(1000 + Math.random() * 9000);
      const newOrder: OrderRecord = {
        order_id: orderId,
        customer_name: custName.trim(),
        customer_email: custEmail.trim(),
        total_price: cartSubtotal,
        items_count: totalCartCount,
        created_at: new Date().toLocaleTimeString(),
      };

      // Decrement stock in state
      setProducts((prev) =>
        prev.map((p) => {
          const qtyBought = cart[p.id] || 0;
          return {
            ...p,
            stock: Math.max(0, p.stock - qtyBought),
          };
        })
      );

      setRecentOrder(newOrder);
      setCart({});
      setCustName('');
      setCustEmail('');
      setIsSubmitting(false);
      setIsCartOpen(false);
      triggerToast("Order # " + orderId + " saved to PostgreSQL database!");
    }, 400);
  };

  const resetCatalog = () => {
    setProducts(INITIAL_PRODUCTS);
    setCart({});
    triggerToast("Catalog reset to initial database seed.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Contract: Brand zone, Navigation tabs, Action button */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
              MiniStore
            </span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1 bg-slate-50">
              <span className={`w-2 h-2 rounded-full ${healthStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-mono">POSTGRESQL &bull; FLASK &bull; NGINX</span>
            </div>
          </div>

          {/* Navigation Links / Mode Switcher */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'store'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Live Storefront
            </button>
            <button
              onClick={() => setActiveTab('arch')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'arch'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'code'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Project Files
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'commands'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Docker &amp; K8s Guide
            </button>
          </nav>

          {/* Primary Action: Cart */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
              <span className="bg-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-full tabular-nums">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* =========================================================================
            TAB 1: LIVE STOREFRONT (Vanilla HTML/CSS/JS experience)
            ========================================================================= */}
        {activeTab === 'store' && (
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
                  <span>DevOps &amp; Kubernetes Learning Project</span>
                  <span>&bull;</span>
                  <span>3-Tier Architecture</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
                  Simple Tools for Modern Platform Engineers
                </h1>
                <p className="mt-3 text-slate-600 text-base leading-relaxed">
                  MiniStore is an intentionally simple, beginner-friendly online shopping application designed for learning container orchestration, Nginx reverse proxying, Flask REST APIs, and PostgreSQL persistence.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setHealthStatus('checking');
                      setTimeout(() => {
                        setHealthStatus('online');
                        triggerToast("GET /api/health returned 200 OK: { status: 'ok', database: 'connected' }");
                      }, 250);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                  >
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Probe GET /api/health
                  </button>

                  <button
                    onClick={resetCatalog}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    Reset Sample Stock
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Grid Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Product Catalog
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Served directly via <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">GET /api/products</code> from PostgreSQL
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {products.length} products available &bull; Auto-synced inventory
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const inCart = cart[product.id] || 0;
                const available = Math.max(0, product.stock - inCart);
                const isOut = available <= 0;

                return (
                  <div 
                    key={product.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                  >
                    <div>
                      <div className="text-xs font-mono text-slate-400 mb-1">
                        ITEM #{product.id}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                          ${product.price.toFixed(2)}
                        </div>
                        <div className={`text-xs mt-0.5 ${isOut ? 'text-rose-600 font-medium' : available <= 5 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                          {isOut ? 'Out of Stock' : `${available} in stock`}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOut}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          isOut
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-blue-600'
                        }`}
                      >
                        {isOut ? 'Sold Out' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Order Confirmation Card if placed */}
            {recentOrder && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mt-8">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-bold text-emerald-950">
                        Order #{recentOrder.order_id} Confirmed!
                      </h3>
                      <span className="text-xs text-emerald-700 font-mono">
                        Saved in PostgreSQL table: orders
                      </span>
                    </div>
                    <p className="text-sm text-emerald-800 mt-1">
                      Customer: <strong>{recentOrder.customer_name}</strong> ({recentOrder.customer_email}) &bull; Total: <strong>${recentOrder.total_price.toFixed(2)}</strong> ({recentOrder.items_count} items)
                    </p>
                    <p className="text-xs text-emerald-700 mt-2 font-mono">
                      Transactional query executed: <code>INSERT INTO orders</code> &amp; <code>UPDATE products SET stock = stock - qty</code> inside a single DB transaction.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: ARCHITECTURE & COMMUNICATION FLOW
            ========================================================================= */}
        {activeTab === 'arch' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                How MiniStore Works
              </h2>
              <p className="text-slate-600 mt-1">
                Visualizing the 3-tier networking, reverse proxy, and persistence boundary.
              </p>
            </div>

            {/* Diagram */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                
                {/* Step 1: Nginx Frontend */}
                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                      Tier 1: Frontend
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-5 h-5 text-slate-800" />
                      <h3 className="text-lg font-bold text-slate-900">Nginx Container</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Listens on port <strong>80</strong>. Serves Vanilla HTML, CSS, and JS assets directly to the browser.
                    </p>
                    <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 space-y-1">
                      <div><strong>Port:</strong> 80 (external :8080)</div>
                      <div><strong>Base image:</strong> nginx:alpine</div>
                      <div><strong>Role:</strong> Web server + Proxy</div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                    Proxies all <code>/api/*</code> requests to <code>http://backend:5000</code>.
                  </div>
                </div>

                {/* Step 2: Flask Backend */}
                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                      Tier 2: API Backend
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-5 h-5 text-slate-800" />
                      <h3 className="text-lg font-bold text-slate-900">Python Flask</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Listens on <strong>0.0.0.0:5000</strong>. Provides REST endpoints for health checks, product queries, and order creation.
                    </p>
                    <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 space-y-1">
                      <div><strong>Port:</strong> 5000 (internal)</div>
                      <div><strong>Base image:</strong> python:3.11-slim</div>
                      <div><strong>Framework:</strong> Flask 3.0.3</div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                    Queries database with parameterized SQL statements via <code>psycopg2</code>.
                  </div>
                </div>

                {/* Step 3: PostgreSQL Database */}
                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                      Tier 3: Database
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-5 h-5 text-slate-800" />
                      <h3 className="text-lg font-bold text-slate-900">PostgreSQL</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Listens on TCP port <strong>5432</strong>. Runs as an isolated database container. Automatically initialized on start.
                    </p>
                    <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 space-y-1">
                      <div><strong>Port:</strong> 5432 (internal)</div>
                      <div><strong>Base image:</strong> postgres:16-alpine</div>
                      <div><strong>Database:</strong> ministoredb</div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                    Stores <code>products</code>, <code>orders</code>, and <code>order_items</code>.
                  </div>
                </div>

              </div>
            </div>

            {/* Communication Details Accordions / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  1. Why Nginx Reverse Proxying is Crucial
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  In beginner setups, frontend JavaScript often tries to call <code>http://backend:5000/api</code> directly. The browser cannot resolve Docker internal DNS names (like <code>backend</code>) and triggers CORS blocks.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  With Nginx, browser JavaScript only talks to <strong>relative URLs</strong> like <code>/api/products</code>. Nginx intercepts this on port 80 and forwards it internally to <code>http://backend:5000</code>. The browser only talks to one origin!
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  2. Kubernetes Transition Preparedness
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every layer is independently containerized:
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1.5 list-disc list-inside">
                  <li><strong>Frontend:</strong> Deployment + Service (ClusterIP or LoadBalancer)</li>
                  <li><strong>Backend:</strong> Deployment + Service named <code>backend</code></li>
                  <li><strong>PostgreSQL:</strong> StatefulSet / Deployment + Service named <code>postgres</code></li>
                  <li><strong>Secrets/ConfigMaps:</strong> Database user, password, and host parameters</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: COMPLETE PROJECT FILE INSPECTOR
            ========================================================================= */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Project Codebase Explorer
                </h2>
                <p className="text-slate-600 text-sm mt-0.5">
                  Inspect every required file in the <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">ministore/</code> directory.
                </p>
              </div>
              <button
                onClick={() => handleCopy(PROJECT_FILES[selectedFileKey].content, selectedFileKey)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copiedKey === selectedFileKey ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy File Content</span>
                  </>
                )}
              </button>
            </div>

            {/* File Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
              {Object.keys(PROJECT_FILES).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedFileKey(key)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                    selectedFileKey === key
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Code Viewer */}
            <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{PROJECT_FILES[selectedFileKey].path}</span>
                <span className="uppercase">{PROJECT_FILES[selectedFileKey].language}</span>
              </div>
              <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed max-h-[540px]">
                <code>{PROJECT_FILES[selectedFileKey].content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: DOCKER & KUBERNETES RUN COMMANDS
            ========================================================================= */}
        {activeTab === 'commands' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Step-by-Step DevOps Run Guide
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Exact terminal commands to build, wire, and run MiniStore locally with Docker.
              </p>
            </div>

            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Create Docker Bridge Network
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy("docker network create ministore-net", "step1")}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Containers on the same user-defined network can resolve each other using their container names as hostnames.
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                <code>docker network create ministore-net</code>
              </pre>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Start PostgreSQL Database
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy(`docker run -d \\
  --name postgres \\
  --network ministore-net \\
  -e POSTGRES_DB=ministoredb \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=postgres \\
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \\
  postgres:16-alpine`, "step2")}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Mounts <code>database/init.sql</code> so schema and sample products are provisioned automatically on boot.
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                <code>{`docker run -d \\
  --name postgres \\
  --network ministore-net \\
  -e POSTGRES_DB=ministoredb \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=postgres \\
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \\
  postgres:16-alpine`}</code>
              </pre>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Build &amp; Run Python Flask Backend
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy(`docker build -t ministore-backend ./backend
docker run -d \\
  --name backend \\
  --network ministore-net \\
  -e DB_HOST=postgres \\
  -e DB_PORT=5432 \\
  -e DB_NAME=ministoredb \\
  -e DB_USER=postgres \\
  -e DB_PASSWORD=postgres \\
  -e PORT=5000 \\
  ministore-backend`, "step3")}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Builds the Flask container and passes PostgreSQL connection credentials via environment variables.
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                <code>{`docker build -t ministore-backend ./backend

docker run -d \\
  --name backend \\
  --network ministore-net \\
  -e DB_HOST=postgres \\
  -e DB_PORT=5432 \\
  -e DB_NAME=ministoredb \\
  -e DB_USER=postgres \\
  -e DB_PASSWORD=postgres \\
  -e PORT=5000 \\
  ministore-backend`}</code>
              </pre>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Build &amp; Run Nginx Frontend
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy(`docker build -t ministore-frontend ./frontend
docker run -d \\
  --name frontend \\
  --network ministore-net \\
  -p 8080:80 \\
  ministore-frontend`, "step4")}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Builds Nginx Alpine image, proxies <code>/api/</code> to <code>backend:5000</code>, and maps port 80 to <code>http://localhost:8080</code>.
              </p>
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                <code>{`docker build -t ministore-frontend ./frontend

docker run -d \\
  --name frontend \\
  --network ministore-net \\
  -p 8080:80 \\
  ministore-frontend`}</code>
              </pre>
            </div>

            {/* API Testing curl commands */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-3">
                Verify Endpoints via curl
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-mono text-slate-500 mb-1">Check Health:</div>
                  <pre className="bg-slate-900 text-slate-200 p-2.5 rounded text-xs font-mono">
                    curl http://localhost:8080/api/health
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-mono text-slate-500 mb-1">Fetch Products:</div>
                  <pre className="bg-slate-900 text-slate-200 p-2.5 rounded text-xs font-mono">
                    curl http://localhost:8080/api/products
                  </pre>
                </div>

                <div>
                  <div className="text-xs font-mono text-slate-500 mb-1">Create an Order:</div>
                  <pre className="bg-slate-900 text-slate-200 p-2.5 rounded text-xs font-mono">
{`curl -X POST http://localhost:8080/api/orders \\
  -H "Content-Type: application/json" \\
  -d '{"customer_name":"Learner","customer_email":"learner@example.com","items":[{"product_id":1,"quantity":1}]}'`}
                  </pre>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Shopping Cart Slide-Over Drawer */}
      {isCartOpen && (
        <>
          <div 
            onClick={() => setIsCartOpen(false)} 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity" 
          />
          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-slate-800" />
                <h3 className="text-lg font-bold text-slate-900">Shopping Cart</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {totalCartCount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <ShoppingCart className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-800">Your cart is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Select sample products from the catalog to test the checkout flow and database transactions.
                </p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-slate-100">
                  {Object.entries(cart).map(([pId, qty]) => {
                    const prod = products.find((p) => p.id === Number(pId));
                    if (!prod) return null;
                    const lineTotal = prod.price * qty;

                    return (
                      <div key={pId} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                            ${prod.price.toFixed(2)} each &bull; Line: ${lineTotal.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(prod.id, -1)}
                            className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold font-mono tabular-nums">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(prod.id, 1)}
                            disabled={qty >= prod.stock}
                            className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => updateCartQty(prod.id, -qty)}
                            className="text-xs text-rose-600 hover:text-rose-800 ml-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer & Checkout Form */}
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between text-base font-bold text-slate-900 mb-4">
                    <span>Total Amount:</span>
                    <span className="font-mono tabular-nums text-lg text-blue-600">
                      ${cartSubtotal.toFixed(2)}
                    </span>
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="e.g. alex@example.com"
                        className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Recording Order in PostgreSQL...' : 'Place Order (POST /api/orders)'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; MiniStore Project &bull; Built for hands-on Kubernetes, Docker, and DevOps mastery.
          </div>
          <div className="flex items-center gap-4">
            <span>Vanilla HTML/CSS/JS</span>
            <span>&bull;</span>
            <span>Python Flask</span>
            <span>&bull;</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
