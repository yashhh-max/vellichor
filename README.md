# Vellichor — Restaurant Reservation Management System

A full-stack restaurant reservation system with a polished, cinematic frontend.
The system emphasizes two things above all else:

1. **Correctness of the reservation conflict logic** — including a database-level
   guarantee that the same table can't be double-booked at the same date and time.
2. **Form and dashboard usability** — the booking flow must never feel like it's
   being compromised by animation.

The visual polish (custom cursor, Lenis smooth scroll, scroll-scrub section,
staggered hero reveal) is layered on top of a working product.

---

## Stack

**Backend** — Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt.
**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, GSAP + ScrollTrigger,
Lenis (smooth scroll), Framer Motion (micro-interactions), Axios, React Router.

---

## Repository layout

```
assignment/
├── backend/      # Express API
└── frontend/     # Vite + React + TS client
```

The two run as separate services. The Vite dev server proxies `/api/*` to the
backend on port 5000, so the frontend can use same-origin URLs in dev and
across-host URLs in production (set `VITE_API_URL`).

---

## Quick start

### 0. Prerequisites

- Node.js 18+ (tested on 24.x)
- A running MongoDB. The fastest options:
  - **Local**: install MongoDB Community and run `mongod` on the default port.
  - **Docker**: `docker run --name mongo -p 27017:27017 -d mongo:7`
  - **Atlas**: create a free cluster and copy the connection string.

### 1. Backend

```bash
cd backend
cp .env.example .env       # then edit MONGO_URI / JWT_SECRET
npm install
npm run seed               # creates 5 tables, 1 admin, 1 customer, 1 sample reservation
npm run dev                # starts on http://localhost:5001
```

Seed credentials (printed by the seed script too):

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| admin    | `admin@example.com`    | `admin123`  |
| customer | `customer@example.com` | `customer123` |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

In local development, the frontend and backend run as separate processes. Set
`VITE_API_URL=http://localhost:5001/api` in `frontend/.env.local` so the dev server can communicate with the backend.

In production (unified Vercel deployment), leave `VITE_API_URL` unset/empty. The Axios instance automatically falls back to same-origin relative routing `/api`.

### 3. Verify with curl

```bash
# health
curl http://localhost:5001/api/health

# log in as the seeded admin
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

See the "Curl test plan" section below for the full reservation conflict test.

---

## API surface

### Auth (public)
- `POST /api/auth/register` — `{ name, email, password }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET  /api/auth/me` — `Authorization: Bearer <token>` → `{ user }`

### Tables
- `GET  /api/tables` — public list (used by the booking form)

### Customer reservations (auth required)
- `POST   /api/reservations` — `{ tableId, date, timeSlot, guests }`
- `GET    /api/reservations/me` — own reservations
- `DELETE /api/reservations/:id` — cancel own reservation

### Admin (auth + `role: "admin"` required)
- `GET    /api/admin/tables`
- `POST   /api/admin/tables` — `{ tableNumber, capacity }`
- `GET    /api/admin/reservations[?date=YYYY-MM-DD][&status=confirmed|cancelled]`
- `PATCH  /api/admin/reservations/:id` — `{ status?, guests?, date?, timeSlot? }`

All errors return `{ message, errors? }`. The frontend maps non-2xx responses to
a typed `ApiError` and surfaces the message in-line.

---

## Reservation & availability logic

This is the most important part of the system. There are two layers of
protection against double-booking, and the API gives friendly messages at each.

### Layer 1 — application-level pre-check

In `controllers/reservationController.js → createReservation`, before inserting
we run:

```js
const conflict = await Reservation.findOne({
  table: tableId,
  date,
  timeSlot,
  status: 'confirmed',
});
if (conflict) return res.status(409).json({ message: '...' });
```

This produces a clear, user-readable error message and is what the dashboard
animates on (`fade / shake` on the form).

### Layer 2 — database-level unique partial index

In `models/Reservation.js`:

```js
reservationSchema.index(
  { table: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' },
  }
);
```

This is the real correctness guarantee. It exists to win the race condition:
if two requests pass the pre-check simultaneously, the second `INSERT` will be
rejected by MongoDB with a `DuplicateKey` error (E11000), which the controller
catches and remaps to a `409`.

The `partialFilterExpression: { status: 'confirmed' }` is crucial — it means
**cancelled reservations don't occupy the slot**, so the same table/date/time
can be re-booked after a cancel.

### Other rules

- `capacity >= guests` is enforced in the controller. The booking returns
  `400: "Table X seats up to N; please pick a larger table"` if violated.
- `date >= today` is enforced. Past dates return `400`.
- `timeSlot` and `date` are validated against strict regex (`HH:MM`, `YYYY-MM-DD`).
- Customers can only cancel **their own** reservations; the controller
  filters by `{ _id: id, user: req.user._id }`.
- Admin updates go through the same unique index — so an admin trying to move
  a reservation into a slot that's already taken will get a `409`, not silent
  corruption.

---

## Role-based access

`requireAuth` reads `Authorization: Bearer <token>`, verifies the JWT, and
loads the user into `req.user`. `requireRole(role)` checks `req.user.role` and
returns `403` if it doesn't match.

In the API:

- `requireAuth` is applied to every `/api/reservations/*` and `/api/admin/*` route.
- `requireRole('admin')` is applied to **every** `/api/admin/*` route via
  `router.use(requireAuth, requireRole('admin'))`.

In the frontend, `<ProtectedRoute role="admin">` redirects unauthenticated
users to `/auth` and authenticated customers away from `/admin` to `/dashboard`.

The customer dashboard, admin panel, and the landing page are all
functionally-first — there is **no** scroll-scrub animation in the booking or
admin flows. Animation is reserved for hero, marketing, and micro-interactions.

---

## Frontend motion system

- **Custom cursor** (`components/Cursor.tsx`): a small dot + larger ring, both
  driven by RAF. Hovering any element with `data-cursor-hover` scales the
  ring and switches to the accent color. Hidden on coarse-pointer devices.
- **Lenis smooth scroll** (`hooks/useLenis.ts`): initialized once in `App`,
  wired to GSAP's `ScrollTrigger.update()` so scrub animations stay in sync.
  Respects `prefers-reduced-motion`.
- **Hero** (`components/Hero.tsx`): staggered headline reveal with masked
  lines (`overflow-hidden` + `yPercent`), animated particle backdrop, scroll cue.
- **How It Works** (`components/HowItWorks.tsx`): a single 200vh sticky stage
  with one GSAP timeline + ScrollTrigger `scrub: 0.6`, animating clip-path
  reveal and crossfades across 3 steps. Inline SVG art with built-in fallbacks.
- **All animated elements** animate only `transform`, `opacity`, `clip-path`,
  and `autoAlpha`. `will-change: transform` is set on the cursor and large
  surfaces. No layout-thrashing properties are touched.
- **Grain overlay**: SVG `feTurbulence` data-URI with `mix-blend-mode: overlay`
  at 0.14 opacity, applied per section.

---

## Project structure (frontend)

```
src/
├── App.tsx                   # Routes + Lenis + providers
├── main.tsx                  # React root
├── components/
│   ├── Cursor.tsx            # custom cursor
│   ├── Hero.tsx              # landing hero
│   ├── HowItWorks.tsx        # scroll-scrub section
│   ├── Navbar.tsx            # top nav
│   └── ProtectedRoute.tsx    # auth gate
├── hooks/
│   ├── useLenis.ts
│   └── usePageMeta.ts
├── lib/
│   ├── api.ts                # axios instance + ApiError helper
│   ├── auth.tsx              # AuthProvider + useAuth
│   ├── time.ts               # TIME_SLOTS + formatters
│   └── types.ts              # shared TS types
├── pages/
│   ├── Admin.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Landing.tsx
│   └── NotFound.tsx
└── styles/
    └── index.css             # Tailwind + design tokens
```

## Project structure (backend)

```
backend/
├── server.js                 # entry, CORS, route mounting, error handler
├── seed.js                   # populates dev data
├── config/db.js              # mongoose connect
├── controllers/              # auth, reservation, table, admin
├── middleware/               # auth, validate, errorHandler
├── models/                   # User, Table, Reservation
└── routes/                   # auth, reservations, tables, admin
```

---

## Deployment

### Backend (Render, Railway, Fly, etc.)

1. Create a new Node service pointing at `backend/`.
2. Build command: `npm install`. Start command: `npm start`.
3. Environment variables:
   - `PORT` (Render sets this; we read it)
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `JWT_EXPIRES_IN` — e.g. `7d`
   - `CLIENT_ORIGIN` — the deployed frontend origin (e.g. `https://your-app.vercel.app`)
4. CORS is already configured to allow `CLIENT_ORIGIN` plus `localhost:5173` /
   `localhost:3000` for local dev.

### Unified Monorepo Deployment (Vercel)

The repository is configured for unified deployment (frontend + backend inside a single Vercel project) using the [vercel.json](file:///c:/Users/yashw/OneDrive/Desktop/assignment/vercel.json) config file at the root.

1. Import the repository root folder on Vercel.
2. Vercel will automatically discover the services:
   - **frontend**: served from `/` (using Vite preset)
   - **backend**: served from `/api/*` (routing backend API endpoints)
3. Set the following environment variables on the Vercel project:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your production random secret string
   - `JWT_EXPIRES_IN` = `7d`
4. Leave `VITE_API_URL` unset (empty). The frontend automatically routes API calls relatively to `/api` on the same host.
5. In this unified production state, CORS is completely bypassed because the frontend and backend share the exact same host and origin.

### Local Development fallback
- Backend runs on `http://localhost:5001`.
- Frontend runs on `http://localhost:5173` and requires `VITE_API_URL=http://localhost:5001/api` in a local `.env` or `.env.local` to override the same-origin relative fallback.
- Local development has permissive CORS enabled for `localhost` ports.

---

## Curl test plan (the conflict logic)

```bash
# 0. health
curl http://localhost:5001/api/health

# 1. log in (save the token)
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"customer123"}' \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).token))")
echo "TOKEN=$TOKEN"

# 2. pick a table
TABLE_ID=$(curl -s http://localhost:5001/api/tables \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).tables[0]._id))")
echo "TABLE_ID=$TABLE_ID"

# 3. first reservation should be 201
curl -i -X POST http://localhost:5001/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"tableId\":\"$TABLE_ID\",\"date\":\"2026-12-01\",\"timeSlot\":\"19:00\",\"guests\":2}"

# 4. SAME reservation again should be 409
curl -i -X POST http://localhost:5001/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"tableId\":\"$TABLE_ID\",\"date\":\"2026-12-01\",\"timeSlot\":\"19:00\",\"guests\":2}"
# → 409 "That table is already booked..."

# 5. capacity violation: 5 guests on a 2-top
curl -i -X POST http://localhost:5001/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"tableId\":\"$TABLE_ID\",\"date\":\"2026-12-01\",\"timeSlot\":\"20:00\",\"guests\":5}"
# → 400 "Table X seats up to 2..."

# 6. past date
curl -i -X POST http://localhost:5001/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"tableId\":\"$TABLE_ID\",\"date\":\"2020-01-01\",\"timeSlot\":\"19:00\",\"guests\":1}"
# → 400 "Date must be today or in the future"

# 7. unauth → 401
curl -i http://localhost:5001/api/reservations/me

# 8. customer trying to hit admin → 403
curl -i http://localhost:5001/api/admin/reservations \
  -H "Authorization: Bearer $TOKEN"

# 9. cancel and rebook to prove partial index works
RES_ID=... # from step 3
curl -X DELETE "http://localhost:5001/api/reservations/$RES_ID" \
  -H "Authorization: Bearer $TOKEN"
# step 3's payload should now succeed with 201 again
```

---

## Assumptions

- A "reservation" occupies one table for a 30-minute time slot on a single
  date. No multi-slot or multi-table bookings.
- The customer is booking for themselves; there's no "guest list" beyond the
  party-size field.
- Admin cancellations are a soft delete (`status: 'cancelled'`); records are
  preserved for audit.
- Time slots are hard-coded in `lib/time.ts` (`TIME_SLOTS`). The set is small
  enough that exposing it as admin config would be premature.
- Authentication is JWT-in-localStorage. It's a portfolio app — for a
  production deployment I'd consider an httpOnly cookie to harden against
  XSS-driven token theft.

## Known limitations

- **No live availability check** before submitting. The frontend only
  prevents picking a table you know is full if a previous reservation appears
  in your own list — across all users, the conflict is detected server-side
  and surfaced as a 409. A future iteration could add a `GET
  /api/reservations?date=…&timeSlot=…` endpoint and grey out taken tables.
- **No rate limiting** on auth endpoints. In production you'd want
  `express-rate-limit` (or a CDN-level rule) on `/api/auth/*`.
- **No password reset** flow.
- **No email confirmations** when booking or cancelling.
- **No timezone awareness** — date/time are stored as strings. A user in
  Tokyo booking at "19:00" gets 19:00 server time, not 19:00 local.

## Areas for improvement

- Add a "guests" autocomplete that ranks tables by capacity fit.
- Replace the hard-coded time slots with admin-configurable slot durations
  and availability windows.
- Move JWTs to httpOnly cookies + CSRF protection.
- Add structured logging (pino) and request tracing.
- Add integration tests around the conflict logic (a small Jest suite would
  lock the partial-index + 409 behavior in).
- Server-side rendering of the landing page for SEO.
- Add `NotFound` to admin/dashboard routes that the role guard hides.
- Lazy-load Framer Motion and GSAP on landing only; the dashboard has
  minimal motion and could ship with a smaller bundle.

---

## License

Portfolio / educational use. No license declared.
