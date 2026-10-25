# MiniStore 🛒

A beginner-friendly, 3-tier online shopping application built specifically for learning **Docker, Kubernetes, and DevOps fundamentals**.

---

## Architecture Overview

MiniStore demonstrates the classic 3-tier cloud-native architecture pattern:

```text
  [ User Browser ]
         │ (HTTP :80)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Tier: Nginx Web Server & Reverse Proxy          │
│    - Serves static assets (HTML5, CSS3, Vanilla JS)         │
│    - Proxies all /api/* requests to backend:5000            │
│    - Single browser origin (No CORS required)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ (HTTP :5000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend Tier: Python Flask REST API                      │
│    - GET  /api/health (Liveness & DB connection probe)      │
│    - GET  /api/products (Catalog listing & stock)           │
│    - GET  /api/products/<id> (Single product detail)        │
│    - POST /api/orders (Transactional checkout & stock decr) │
│    - Reads database credentials from environment variables  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (TCP :5432)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Database Tier: PostgreSQL Relational Database            │
│    - Tables: products, orders, order_items                  │
│    - Automatically seeded with sample catalog on startup    │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
ministore/
├── backend/
│   ├── app.py              # Flask REST API implementation with SQL queries
│   ├── Dockerfile          # Lightweight Python 3.11-slim container image
│   └── requirements.txt    # Python dependencies (Flask, psycopg2-binary)
├── database/
│   └── init.sql            # PostgreSQL schema and initial catalog seed
├── frontend/
│   ├── app.js              # Vanilla JS: relative API calls, cart state, UI
│   ├── Dockerfile          # Lightweight Nginx Alpine container image
│   ├── index.html          # Semantic HTML5 shopping interface
│   ├── nginx.conf          # Nginx configuration (serves UI + proxies /api)
│   └── style.css           # Clean, responsive CSS stylesheet
├── k8s/
│   └── README.md           # Reserved for Kubernetes manifests
└── README.md               # Complete setup, testing, and DevOps guide
```

---

## Environment Variables

The backend accepts configuration exclusively via standard environment variables. No credentials are hardcoded into application code or browser JavaScript.

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` (or `postgres` in Docker) | Hostname or IP of the PostgreSQL database server |
| `DB_PORT` | `5432` | TCP port where PostgreSQL listens |
| `DB_NAME` | `ministoredb` | Database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database user password |
| `PORT` | `5000` | HTTP port for the Flask backend web server |

---

## Running with Docker (Step-by-Step)

To run the full 3-tier application locally using Docker, execute the following commands in sequence:

### Step 1: Create a Shared Docker Network

Create a user-defined bridge network so containers can discover each other by container name (DNS):

```bash
docker network create ministore-net
```

### Step 2: Start PostgreSQL Database Container

Run the official PostgreSQL container on the network, mounting `database/init.sql` to initialize the database automatically:

```bash
docker run -d \
  --name postgres \
  --network ministore-net \
  -e POSTGRES_DB=ministoredb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -v $(pwd)/ministore/database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro \
  postgres:16-alpine
```

### Step 3: Build & Run the Backend Container

Navigate to the `ministore/backend/` directory, build the image, and run it connected to the database:

```bash
# Build the Python Flask image
docker build -t ministore-backend ./ministore/backend

# Run backend container connected to ministore-net
docker run -d \
  --name backend \
  --network ministore-net \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=ministoredb \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e PORT=5000 \
  ministore-backend
```

### Step 4: Build & Run the Frontend Container

Build the frontend Nginx image and publish port 80 to your machine:

```bash
# Build the Nginx frontend image
docker build -t ministore-frontend ./ministore/frontend

# Run frontend container exposed on localhost:8080
docker run -d \
  --name frontend \
  --network ministore-net \
  -p 8080:80 \
  ministore-frontend
```

Now open **http://localhost:8080** in your browser!

---

## Testing the Application

### 1. Web Browser UI
- Visit `http://localhost:8080`.
- Check the top right health indicator (should display `API & DB Online`).
- Click **Add to Cart** on any sample product.
- Open the cart drawer, enter customer details (`Jane Doe`, `jane@example.com`), and click **Place Order**.
- Observe the order receipt and immediate inventory decrement.

### 2. Testing REST API Endpoints via `curl`

Verify Health Check:
```bash
curl -i http://localhost:8080/api/health
```
Expected response: `HTTP 200 OK`
```json
{"database":"connected","service":"ministore-backend","status":"ok"}
```

List Products:
```bash
curl -i http://localhost:8080/api/products
```

Get a Specific Product:
```bash
curl -i http://localhost:8080/api/products/1
```

Create an Order (Checkout):
```bash
curl -i -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "DevOps Learner",
    "customer_email": "learner@example.com",
    "items": [
      {"product_id": 1, "quantity": 1},
      {"product_id": 3, "quantity": 2}
    ]
  }'
```
Expected response: `HTTP 201 Created`
```json
{
  "customer_email": "learner@example.com",
  "customer_name": "DevOps Learner",
  "items_count": 2,
  "message": "Order created successfully",
  "order_id": 1,
  "status": "confirmed",
  "total_price": 65.5
}
```

---

## How Components Communicate

1. **Browser to Frontend (Nginx)**: The user's browser sends an HTTP GET request to `http://localhost:8080/`. Nginx serves `index.html`, `style.css`, and `app.js` directly from `/usr/share/nginx/html`.
2. **Browser to Backend via Nginx Reverse Proxy**: When the browser fetches `/api/products` or posts to `/api/orders`, the request goes to port `8080` (Nginx). Nginx matches `location /api/` and transparently proxies the request to `http://backend:5000` through Docker's internal network. This eliminates cross-origin issues (CORS) entirely and keeps internal network topologies hidden from clients.
3. **Backend to Database**: Flask queries PostgreSQL using the `psycopg2` driver over TCP port `5432` using parameterized SQL queries (`%s`), preventing SQL injection and managing transaction integrity.

---

## Stopping and Cleaning Up Containers

To stop and clean up all containers and network:

```bash
docker stop frontend backend postgres
docker rm frontend backend postgres
docker network rm ministore-net
```
