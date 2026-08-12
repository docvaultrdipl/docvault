# License Tracker — Backend (Node.js + Express + PostgreSQL)

## 1. Database setup

Create a database (or use an existing one) and run the schema:

```bash
createdb license_tracker          # skip if the DB already exists
psql -U your_pg_user -d license_tracker -f schema.sql
```

This creates two tables:
- `users` (id, name, email, password_hash, role)
- `documents` (id, user_id, name, license_key, type, validity_start, validity_end, remarks, attachment_path, attachment_name)

Status is **not** stored in the table — it's calculated on every read directly
in SQL from `validity_end` (see `STATUS_CASE_SQL` in `src/routes/documents.routes.js`):
- `validity_end` in the past → `Expired`
- `validity_end` within 30 days → `Expiring Soon`
- otherwise → `Active`
- no `validity_end` set → `No Expiry`

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your real PostgreSQL credentials (`PGHOST`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE`, `PGPORT`) or set a single `DATABASE_URL`. Also set
a long random `JWT_SECRET`.

## 3. Install & run

```bash
npm install
npm run dev      # nodemon, auto-restarts on file changes
# or
npm start         # plain node
```

Server runs on `http://localhost:5000` by default.

## 4. Create your first user

There's no separate "admin seeding" — just call the register endpoint once:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@licensetracker.com","password":"admin123"}'
```

This returns a JWT `token` you can use immediately, or you can log in again later.

Consider removing/protecting `/api/auth/register` once your users exist, so
random people can't create accounts on your public API.

## 5. API reference

All `/api/documents` and `/api/profile` routes require:
```
Authorization: Bearer <token>
```

| Method | Route                  | Description                                  |
|--------|-------------------------|-----------------------------------------------|
| POST   | /api/auth/register      | Create a user, returns `{ token, user }`      |
| POST   | /api/auth/login         | Log in, returns `{ token, user }`             |
| GET    | /api/documents          | List the logged-in user's documents           |
| POST   | /api/documents          | Create a document (multipart if attaching file)|
| PUT    | /api/documents/:id      | Update a document                              |
| DELETE | /api/documents/:id      | Delete a document                              |
| GET    | /api/profile            | Get logged-in user's profile                   |
| PUT    | /api/profile            | Update profile (name)                          |

Creating/updating a document expects these fields (as JSON, or as
`multipart/form-data` fields with an `attachment` file part):
```
name, license_key, type, validity_start (YYYY-MM-DD), validity_end (YYYY-MM-DD), remarks
```

## 6. Connecting the React frontend

Right now the frontend keeps everything in React state (no API calls). To
wire it up:
1. Replace the mock login check in `LoginPage` with a `fetch('/api/auth/login', ...)` call, store the returned `token` (e.g. in React state/context — not localStorage per Claude's artifact rules, but fine in your own real app).
2. Replace `initialLicenses` state with a `useEffect` that calls `GET /api/documents` on mount.
3. In `handleLicenseFormSubmit`, call `POST /api/documents` or `PUT /api/documents/:id` instead of updating local state directly, then refresh the list.
4. Drop the frontend's `computeStatus()` — the backend now returns `status` directly on every document.

Happy to wire this integration up for you next if you'd like.
