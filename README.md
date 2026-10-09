# Dockerized User Authentication Web Application with OTP Verification

A robust, production-ready, full-stack user authentication system built with **React**, **Node.js (Express)**, **SQLite**, **Redis**, and **Docker Compose**. The application features secure registration with 6-digit cryptographic email One-Time Passwords (OTP), HttpOnly JWT cookie sessions, brute-force protection, and rate limiting.

---

## Architecture & Service Responsibilities

```
                                  +-----------------------+
                                  |    Browser / Client   |
                                  +-----------+-----------+
                                              |
                          Port 5173           |           Port 5000
                              +---------------+---------------+
                              |                               |
                              v                               v
                   +--------------------+          +--------------------+
                   |  Frontend Service  |          |  Backend Service   |
                   |   (React + Vite)   |          |  (Node + Express)  |
                   +--------------------+          +---------+----------+
                                                             |
                                      +----------------------+----------------------+
                                      |                      |                      |
                                      v                      v                      v
                             +-----------------+    +-----------------+    +-----------------+
                             |  Redis Service  |    | Embedded SQLite |    |   SMTP Server   |
                             | (ioredis cache) |    | (better-sqlite3)|    | (e.g. Mailtrap) |
                             +-----------------+    +-----------------+    +-----------------+
```

### Services & Components

1. **Frontend (`frontend`)**:
   - Single-Page Application (SPA) built with React 18 and Vite.
   - Styled with modern, accessible **Vanilla CSS** (design tokens, glassmorphism, responsive grid/flexbox, zero framework bloat).
   - Manages authentication state using React Context (`AuthContext`).
   - Handles client-side validation, error banners, loading spinners, and an interactive 60-second OTP resend countdown.

2. **Backend (`backend`)**:
   - Centralized Express REST API with ES modules.
   - Enforces security with `helmet`, input sanitization, and strict CORS configuration.
   - Hashes passwords using `bcrypt` (10 salt rounds) before temporary caching or permanent storage.
   - Generates cryptographically secure 6-digit random OTPs (`crypto.randomInt`).
   - Dispatches transactional emails through `nodemailer`.
   - Manages user sessions via signed JWTs stored in `HttpOnly`, `SameSite=Lax/Strict` cookies.

3. **Database (SQLite)**:
   - Embedded directly in the backend process via `better-sqlite3` (no standalone DB server needed).
   - Automatically initializes `users` schema on startup.
   - Persisted across container restarts via a dedicated Docker named volume (`sqlite_data`).

4. **In-Memory Cache (Redis)**:
   - Standalone `redis:7-alpine` container running inside the internal Docker network.
   - Holds pending user registrations, active OTPs, failed attempt counters, and resend cooldowns.
   - Automated Redis health checks ensure the backend waits for Redis readiness before serving requests.

---

## Folder Structure

```
.
├── .env.example              # Template for environment variables
├── .gitignore                # Excludes secrets, databases, node_modules, and logs
├── docker-compose.yml        # Docker service orchestration (frontend, backend, redis)
├── README.md                 # Complete documentation
│
├── backend/
│   ├── Dockerfile            # Multi-stage production container build (node:20-alpine)
│   ├── .dockerignore
│   ├── package.json          # Backend dependencies and test scripts
│   ├── data/                 # Directory holding SQLite persistent database file
│   │   └── .gitkeep
│   ├── src/
│   │   ├── app.js            # Express application initialization and middleware
│   │   ├── index.js          # HTTP server listening and graceful shutdown
│   │   ├── config/
│   │   │   ├── db.js         # SQLite connection and schema migrations
│   │   │   └── redis.js      # Redis client configuration and error handlers
│   │   ├── controllers/
│   │   │   └── authController.js # Auth request handlers (register, login, verify, etc.)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js # JWT cookie authentication verification
│   │   │   └── errorHandler.js   # Centralized error handler
│   │   ├── routes/
│   │   │   ├── auth.js       # /api/auth endpoints
│   │   │   └── health.js     # /api/health endpoint
│   │   ├── services/
│   │   │   ├── authService.js    # Core authentication business logic & Redis state
│   │   │   └── emailService.js   # Nodemailer email dispatcher
│   │   └── utils/
│   │       ├── crypto.js     # Hashing and random OTP generator
│   │       └── validator.js  # Email and password validation logic
│   └── tests/
│       ├── auth.test.js      # E2E integration test for registration and OTP flow
│       ├── db.test.js        # SQLite table creation and constraint unit tests
│       ├── health.test.js    # Health check and Redis dependency tests
│       └── login.test.js     # Login, JWT cookies, and protected /me tests
│
└── frontend/
    ├── Dockerfile            # Frontend container build (node:20-alpine)
    ├── .dockerignore
    ├── index.html            # Vite HTML entry point
    ├── package.json          # Frontend dependencies (React, Vite)
    ├── vite.config.js
    └── src/
        ├── App.jsx           # Top-level router and view switcher
        ├── main.jsx          # React DOM entry point
        ├── index.css         # Custom CSS design system
        ├── context/
        │   └── AuthContext.jsx # Global user auth state and provider
        └── pages/
            ├── Dashboard.jsx # Protected dashboard view
            ├── Login.jsx     # User login form
            ├── Register.jsx  # User registration form
            └── VerifyOTP.jsx # 6-digit OTP verification view
```

---

## Prerequisites

- **Docker Desktop** (version 24.0+ recommended) or **Docker Engine & Docker Compose v2+**
- **Git**
- *(Optional)* **Node.js 20+** and **npm** if running services locally outside of Docker.

---

## Environment Configuration

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

### Environment Variables Reference

| Variable | Description | Default / Example | Required |
|---|---|---|:---:|
| `PORT` | Backend HTTP port | `5000` | No |
| `NODE_ENV` | Application environment (`development` / `production`) | `development` | No |
| `DB_PATH` | Path to SQLite database file | `/app/data/users.db` | Yes |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` | Yes |
| `JWT_SECRET` | Secret key for signing authentication JWT cookies | *(random 32+ char string)* | Yes |
| `SMTP_HOST` | Hostname of SMTP server | `sandbox.smtp.mailtrap.io` | Yes |
| `SMTP_PORT` | Port of SMTP server | `2525` | Yes |
| `SMTP_USER` | SMTP authentication username | *(your_smtp_username)* | Yes |
| `SMTP_PASS` | SMTP authentication password | *(your_smtp_password)* | Yes |
| `SMTP_FROM` | Sender address for outgoing emails | `noreply@example.com` | Yes |
| `VITE_API_URL`| Base URL of the backend API called by the frontend | `http://localhost:5000` | Yes |

---

## SMTP Setup Instructions (Mailtrap)

For testing email delivery locally without sending emails to real users, we recommend **Mailtrap Email Sandbox**:

1. Log in to [mailtrap.io](https://mailtrap.io).
2. In the left navigation menu, navigate to **Email Testing** → **Inboxes** → **My Inbox**.
3. Under the **SMTP Settings** tab, select **Show Credentials**.
4. Update your `.env` file with the provided values:
   ```env
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=<your_mailtrap_username>
   SMTP_PASS=<your_mailtrap_password>
   SMTP_FROM=noreply@authapp.local
   ```
> [!NOTE]
> In development mode, if SMTP credentials are left as placeholders or if delivery fails, the backend logs a `[DEV OTP BACKUP]` message to standard output with the OTP so you can continue testing uninterrupted.

---

## Docker Compose Startup & Shutdown

### 1. Build and Start Services
Start all containers in detached mode:
```bash
docker compose up --build -d
```

### 2. Verify Running Containers
Check the health status of all running services:
```bash
docker compose ps
```
You should see:
- `backend` running on port `5000`
- `frontend` running on port `5173`
- `redis` running on port `6379` (healthy)

### 3. View Logs
Follow real-time logs across all services:
```bash
docker compose logs -f
```
Or view logs for a specific service:
```bash
docker compose logs -f backend
```

### 4. Stopping the Application
Stop all running containers:
```bash
docker compose down
```

To stop containers and **wipe persistent volumes** (resets SQLite database and Redis cache):
```bash
docker compose down -v
```

---

## Authentication & OTP Workflow

```
[Client]                [Backend API]               [Redis]              [SQLite DB]
   |                          |                        |                      |
   |--- 1. POST /register --->|                        |                      |
   |    (name, email, pass)   |--- 2. Hash password    |                      |
   |                          |--- 3. Generate OTP     |                      |
   |                          |--- 4. Store pending -->|                      |
   |                          |    (TTL: 10 mins)      |                      |
   |                          |--- 5. Send OTP Email --+-> [Mailtrap SMTP]    |
   |<-- 202 Accepted ---------|                        |                      |
   |                          |                        |                      |
   |--- 6. POST /verify-otp ->|                        |                      |
   |    (email, otp)          |--- 7. Check OTP ------>|                      |
   |                          |--- 8. Delete keys ---->|                      |
   |                          |--- 9. Save user ----------------------------->|
   |<-- 201 Created ----------|                                               |
   |                          |                                               |
   |--- 10. POST /login ----->|                                               |
   |    (email, pass)         |--- 11. Verify pass -------------------------->|
   |                          |--- 12. Issue JWT HttpOnly cookie              |
   |<-- 200 OK (Set-Cookie) --|                                               |
   |                          |                                               |
   |--- 13. GET /me (Cookie)->|                                               |
   |                          |--- 14. Verify JWT token                       |
   |<-- 200 OK (User Data) ---|                                               |
```

### Redis Key Expiration (TTL) Behavior

| Key Format | TTL | Purpose |
|---|---|---|
| `pending:<email>` | 10 minutes | Holds serialized pending registration profile (`{ name, email, passwordHash }`). Users not completing verification within 10 minutes are expired. |
| `otp:<email>` | 5 minutes | Holds the active 6-digit verification code. |
| `otp_attempts:<email>` | 5 minutes | Tracks incorrect verification attempts. Exceeding 5 failed attempts locks the OTP and requires re-registration. |
| `otp_cooldown:<email>` | 60 seconds | Throttles OTP resend requests to prevent email spam and rate exhaustion. |

---

## API Endpoints Reference

### Public Endpoints

#### 1. Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Payload:**
  ```json
  {
    "name": "Alex Smith",
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`202 Accepted`):**
  ```json
  {
    "message": "Verification OTP sent to your email. Valid for 5 minutes."
  }
  ```

#### 2. Verify OTP
- **Method:** `POST`
- **Path:** `/api/auth/verify-otp`
- **Payload:**
  ```json
  {
    "email": "alex@example.com",
    "otp": "489201"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "message": "Registration verified and successful"
  }
  ```

#### 3. Resend OTP
- **Method:** `POST`
- **Path:** `/api/auth/resend-otp`
- **Payload:**
  ```json
  {
    "email": "alex@example.com"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "message": "New OTP sent to your email"
  }
  ```

#### 4. Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Payload:**
  ```json
  {
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`):**
  - Sets `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Path=/`
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": 1,
      "name": "Alex Smith",
      "email": "alex@example.com",
      "is_verified": 1,
      "created_at": "2026-10-09T14:00:00.000Z"
    }
  }
  ```

### Protected Endpoints

#### 5. Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Headers:** Requires valid `token` cookie.
- **Response (`200 OK`):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Alex Smith",
      "email": "alex@example.com",
      "is_verified": 1,
      "created_at": "2026-10-09T14:00:00.000Z"
    }
  }
  ```

#### 6. Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Response (`200 OK`):**
  - Clears `token` cookie (`Max-Age=0`).
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### System Health

#### 7. Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "database": "up",
    "redis": "up",
    "timestamp": "2026-10-09T14:00:00.000Z"
  }
  ```

---

## Testing Instructions

### 1. Automated Backend Test Suite
The backend contains automated tests verifying database initialization, unique constraints, OTP lifecycles, and login sessions.

Run the test suite inside the backend Docker container:
```bash
docker compose exec backend npm test
```

Expected output:
```
✔ Authentication Flow - Registration & OTP (7 subtests passed)
✔ Database Initialization and Unique Email Constraint (3 subtests passed)
✔ Health Check API (3 subtests passed)
✔ Login & Protected Routes (9 subtests passed)
ℹ tests 26
ℹ pass 26
ℹ fail 0
```

### 2. Frontend Build Verification
Verify that the React production bundle compiles cleanly:
```bash
docker compose exec frontend npm run build
```

---

## Troubleshooting

### 1. Docker Issues
- **Port 5000, 5173, or 6379 already in use**:
  Ensure no local services or prior Docker containers are bound to these ports:
  ```powershell
  # Check ports in PowerShell
  Get-NetTCPConnection -LocalPort 5000,5173,6379
  ```
  Change mapped ports in `docker-compose.yml` if needed.
- **Container health check failure for Redis**:
  Verify Redis is healthy by running `docker compose ps`. Inspect Redis logs using `docker compose logs redis`.

### 2. SQLite Issues
- **`SQLITE_CANTOPEN` or Permission Denied**:
  The SQLite database file requires directory write permissions. The Docker image creates `/app/data` and ensures ownership belongs to the unprivileged `node` user (`chown -R node:node /app`). If using external mounts, ensure appropriate filesystem permissions.
- **Corrupted or Locked Database**:
  To reset the database, stop containers and clear the persistent volume:
  ```bash
  docker compose down -v
  docker compose up -d
  ```

### 3. SMTP & Email Delivery Issues
- **Emails not appearing in Mailtrap**:
  Ensure you are using **Email Testing (Sandboxes)** and not production **Email API/SMTP**. With Sandboxes, check **Sandboxes → Inboxes → My Inbox**.
- **Connection timeouts**:
  Some ISPs or firewall rules block port `25` or `465`. Use port `2525` or `587`.

### 4. Redis Issues
- **`Connection refused: redis:6379`**:
  Ensure all containers are running on the shared `auth-network` bridge network defined in `docker-compose.yml`.

---

## License

This project is licensed under the MIT License.
