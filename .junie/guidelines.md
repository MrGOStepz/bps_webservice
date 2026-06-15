# Project Guidelines — BPS Web Service

> Purpose: give AI assistants a compact, accurate map of this project so they can work
> effectively without re-scanning the whole repo. Keep this file up to date when structure
> or conventions change.

## 1. Overview
BPS Web Service is a two-part order-management application:
- **Backend** — Spring Boot REST API + STOMP WebSocket (real-time order dashboard).
- **Frontend** — Angular 22 SPA (standalone components, signals, SSR) styled with Bootstrap 5.

Full functional spec lives in `overview.md` (read it for feature/business details).

## 2. Tech Stack
| Area      | Technology |
|-----------|------------|
| Language  | Java 25 (backend), TypeScript (frontend) |
| Backend   | Spring Boot 4.1.0, Spring Web MVC, Data JPA/JDBC, WebSocket (STOMP), Lombok |
| Build     | Gradle (wrapper: `gradlew` / `gradlew.bat`) |
| Database  | MySQL (config in `src/main/resources/application.properties`) |
| Frontend  | Angular 22 (standalone + signals), SSR, Bootstrap 5 + bootstrap-icons |
| Realtime  | STOMP over SockJS (`@stomp/stompjs`, `sockjs-client`) |
| FE build  | Angular CLI (`@angular/build`), npm 11 |

## 3. Repository Layout
```
bps_webservice/
├── build.gradle, settings.gradle, gradlew[.bat]   # backend build
├── overview.md                                    # functional spec (source of truth)
├── README.md
├── src/main/java/com/mrgostepz/bps/webservice/     # backend root package
│   ├── BpsWebserviceApplication.java               # Spring Boot entry point
│   ├── config/        # WebConfig (CORS + ObjectMapper bean), WebSocketConfig (STOMP /ws)
│   ├── controller/    # Auth, Customer, Form, OrderDashboard, HelloWorld
│   ├── service/       # AuthService, OrderService
│   ├── repository/    # Spring Data JPA repositories
│   ├── entity/        # Customer, Item, OrderEntity(→table `orders`), Staff
│   ├── dto/           # request/response DTOs
│   └── (DataSeeder)   # seeds default role accounts
├── src/main/resources/application.properties       # datasource + JPA config
└── angular/                                         # frontend
    ├── package.json, angular.json, proxy.conf.json
    └── src/app/
        ├── app.routes.ts          # route table (login + Shell with child pages)
        ├── app.config.ts          # providers (router, http, hydration)
        ├── app.routes.server.ts   # SSR render mode
        ├── guards/auth.guard.ts   # pageGuard(role-based)
        ├── services/              # auth, customer, order, websocket
        ├── models/models.ts       # shared types (Customer, OrderItem, OrderCard, OrderStatus...)
        └── pages/                 # login, shell, dashboard, form, history, customer
```

## 4. Backend Notes
- Base API path: `/api/**` (CORS enabled in `WebConfig`).
- WebSocket: STOMP endpoint `/ws` (SockJS), broadcast topic `/topic/orders`.
- **Spring Boot 4 does NOT auto-provide an `ObjectMapper`** — it is defined explicitly as a
  `@Bean` in `WebConfig`. Do not remove it.
- Schema additions beyond `overview.md`:
  - `STAFF.role` — drives password→role login (Admin/Sale/Staff/Delivery).
  - `ORDER.status` — values `NEW, PREPARING, DELIVERING, DONE`; updated via REST and broadcast over WebSocket.
- `OrderEntity` maps to table `orders` (`ORDER` is a reserved word).
- Lombok is used; annotation processing required.
- DB: MySQL at host in `application.properties`, `ddl-auto=update`. A live MySQL is
  required to run `bootRun`/tests.

## 5. Frontend Notes
- Angular 22 standalone components + signals (no NgModules).
- Auth is password-only → resolves a role; `pageGuard('<page>')` protects routes and
  `AuthService.canAccess()` drives navbar visibility in `Shell`.
- Pages: `login`, `dashboard` (7-day live order board), `form` (new order),
  `history` (filter search), `customers` (CRUD). `Shell` hosts the navbar + `<router-outlet>`.
- `WebSocketService` is browser-guarded (SSR-safe).
- Bootstrap CSS/JS + icons wired in `angular.json`; dev proxy forwards `/api` and `/ws`
  to the backend (`proxy.conf.json`).
- SSR output mode is `server` (on-demand server render).

## 6. Build & Run Commands
Backend (run from repo root):
```
./gradlew compileJava        # compile
./gradlew bootRun            # run (needs live MySQL)
./gradlew test               # tests (needs live MySQL)
```
Frontend (run from `angular/`):
```
npm install                  # install deps
npm start                    # dev server with proxy
npm run build                # production build (browser + SSR bundles)
```

## 7. Conventions
- Follow existing code style of the surrounding file/module (indentation, naming, imports).
- Backend: package root `com.mrgostepz.bps.webservice`; group by layer (controller/service/repository/entity/dto/config).
- Frontend: one folder per page under `pages/`, component classes use PascalCase
  (e.g. `Login`, `Dashboard`, `FormPage`, `CustomerPage`); shared types in `models/models.ts`.
- Keep comments sparse — match the low comment frequency already present in the codebase.

## 8. Default Seed Accounts (dev only)
Login passwords seeded per role (change for real use):
`admin123` (Admin), `sale123` (Sale), `staff123` (Staff), `delivery123` (Delivery).
