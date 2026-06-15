# BPS Web Service

A two-part order management system:

- **Backend** – Spring Boot (Java 25) REST API + STOMP WebSocket, MySQL via JPA.
- **Frontend** – Angular 22 (standalone components + signals, SSR) with Bootstrap 5.

## Features

| Page | Roles | Description |
|------|-------|-------------|
| Login | everyone | Password-only login (no username). Role resolved from the matching `STAFF` row. |
| Form | ADMIN, SALE | Create an order: pick/search customer (auto-fills address/location), note, dynamic item list. |
| Order Dashboard | ADMIN, SALE, STAFF, DELIVERY | 7-day weekly board of order cards; change status via buttons with **real-time** updates over STOMP. |
| Filter Search History | ADMIN | Filter orders by customer + date range, results in a table. |
| Customers | ADMIN | Full CRUD for customers. |

## Backend

### Run

```
./gradlew bootRun
```

Configure the database in `src/main/resources/application.properties`. JPA `ddl-auto=update`
creates the tables (`customer`, `item`, `orders`, `staff`).

### Seed data

On first run (`DataSeeder`) default accounts are created if `STAFF` is empty:

| Role | Password |
|------|----------|
| ADMIN | `admin123` |
| SALE | `sale123` |
| STAFF | `staff123` |
| DELIVERY | `delivery123` |

### REST API

- `POST /api/auth/login` – `{ "password": "..." }` → role + name.
- `GET/POST/PUT/DELETE /api/customers` – customer CRUD (`?search=` by name).
- `POST /api/form/order` – create an order. `GET /api/form/latest-items?customerId=` – last items.
- `GET /api/dashboard/week?start=YYYY-MM-DD` – 7-day orders.
- `GET /api/dashboard/search?startDate=&endDate=&customerId=` – history.
- `PUT /api/dashboard/{id}/status` – `{ "status": "..." }`, broadcasts to `/topic/orders`.

Real-time: STOMP endpoint `/ws` (SockJS), topic `/topic/orders`.
Order statuses: `NEW`, `PREPARING`, `DELIVERING`, `DONE`.

## Frontend

```
cd angular
npm install
npm start        # dev server with proxy to backend (localhost:8080)
npm run build    # production build
```

The dev proxy (`proxy.conf.json`) forwards `/api` and `/ws` to the backend.
