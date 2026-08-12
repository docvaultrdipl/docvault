# DocVault — License Tracker + Vehicle Insurance Tracker

A single company system combining:
- **Licenses (Documents)** — license/document expiry tracking
- **Vehicles (Insurance)** — RC / Tax / OD / TP / Pollution tracking

Both modules share one login, one PostgreSQL database, and one React app.

## Structure

```
docvault_complete/
├── backend/    Node.js + Express + PostgreSQL API
└── frontend/   React + Vite + Ant Design
```

## 1. Database setup

Create a database and run the schema:

```bash
createdb license_tracker
cd backend
psql -U your_pg_user -d license_tracker -f schema.sql
```

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
- Fill in your real PostgreSQL credentials (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) or set `DATABASE_URL`.
- Set a long random `JWT_SECRET`.
- (Optional, for email reminders) Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `ALERT_RECIPIENTS`.

Install and run:

```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000`.

### Create your first user (bootstrap)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"admin123"}'
```

The very first user automatically gets full permissions (Administrator). Every user after that must be created from the app itself (Profile → Create New User), by someone who has the "manage users" right.

### Scheduled email reminders (optional)

To send an expiry-digest email automatically on a schedule (daily/weekly), use the standalone script instead of the running server:

```bash
npm run send-alerts
```

Schedule it with Windows Task Scheduler or cron, e.g. daily at 8 AM. It reads the same `.env` and emails whoever is listed in `ALERT_RECIPIENTS`.

There's also a "Send Email Reminder Now" button inside the app's notification bell (for users with the "manage users" right) that sends the same digest on demand.

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173`. If your backend runs somewhere other than `http://localhost:5000`, update `API_BASE_URL` / `SERVER_ORIGIN` in `frontend/src/api.js`.

## Feature summary

- Shared login (email or username), granular per-user permissions (view/add/edit/delete per module, plus manage-users)
- Licenses & Vehicles: search, filters, color-coded status, Excel export/import, file attachments
- Dashboard with charts (license bar chart, vehicle donut chart), combined activity feed
- Per-record history/timeline
- Global search across both modules
- Renewal calendar with printable monthly report
- In-app notification bell + scheduled/on-demand email reminders
