# YolYoldaş

YolYoldaş is an Azerbaijani ride-sharing MVP for finding intercity trips with compatible routes. The repository contains a Vite/React client and an Express/Prisma API. The client defaults to a persistent local demo so the presentation works without a database or external AI credentials.

## Project layout

```text
src/                         React 19 client
  components/                Navigation, ride cards, Leaflet map
  data/                      Consistent fictional Azerbaijan demo routes
  pages/                     Home, search, ride details, publish, auth, dashboard, chat, profile
  services/                  API, auth, rides, bookings, matching, chat
  store/                     Persisted Zustand demo session and ride state
server/                      Express API (ES modules)
  prisma/schema.prisma       PostgreSQL data model
  prisma/migrations/         Initial schema and PostGIS indexes
  prisma/seed.js             Reproducible demo accounts and rides
  src/controllers/            HTTP request adapters
  src/routes/                 Express API routes
  src/services/              Auth, ride, booking, matching, routing, AI, location, chat
  src/sockets/                JWT-authenticated Socket.IO rooms
```

## Frontend demo

From this directory:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. Keep `VITE_USE_MOCK_API=true` for the local presentation mode. Demo rides and session state persist in browser storage. Login accepts any email and a password of at least four characters; the role selector switches between passenger and driver views. This local session is not secure authentication.

The Leaflet map uses OpenStreetMap tiles. Demo marker positions are fictional and visibly labeled. Browser location is requested only after selecting “Yerimi xəritədə göstər”; denial leaves the Baku view in place. Mock matching uses fixed city-to-city route stops and deterministic scores.

## Backend setup

Requirements: Node.js 20+, PostgreSQL with PostGIS enabled, and npm. From `server/`:

```sh
npm install
Copy-Item .env.example .env
# Edit DATABASE_URL and set a long random JWT_SECRET.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The API listens on port 4000 by default. Configure `CORS_ORIGIN` for the client URL and set `VITE_USE_MOCK_API=false` plus `VITE_API_BASE_URL=http://localhost:4000/api` in the client `.env.local` to use API-backed registration, login, ride search/creation, ride details, dashboard bookings, and messaging. API-backed routes require the registered role: drivers publish and manage rides; passengers request seats.

### Demo API accounts

All seeded accounts use password `demo1234`:

| Role | Email |
| --- | --- |
| Passenger | `sernisin@yolyoldas.demo` |
| Driver | `elvin@yolyoldas.demo` |
| Driver | `rashad@yolyoldas.demo` |
| Driver | `aysel@yolyoldas.demo` |
| Driver | `murad@yolyoldas.demo` |
| Driver | `nihat@yolyoldas.demo` |
| Driver | `kamran@yolyoldas.demo` |

The seed creates a pending passenger request for Elvin's Bakı–Qəbələ trip so the accept/reject flow can be shown. Use the passenger account to inspect it, then sign in as Elvin to respond.

## Environment variables

Client (`.env.local`):

- `VITE_API_BASE_URL` — API base URL, normally `http://localhost:4000/api`.
- `VITE_USE_MOCK_API` — `true` for local demo mode, `false` for API requests.

Server (`server/.env`):

- `PORT` — API port, default `4000`.
- `CORS_ORIGIN` — comma-separated allowed browser origins.
- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — secret of at least 32 characters.
- `OSRM_URL` — OSRM-compatible routing base URL.
- `OPENAI_API_KEY` — optional, server only; AI intent parsing and grounded match explanations gracefully fall back when unset.
- `OPENAI_MODEL` — optional model name, default `gpt-4o-mini`.

Never place database credentials or OpenAI keys in a `VITE_` variable.

## Deploy one Render web service

The `render.yaml` Blueprint builds the Vite client and Express server together. Express serves the built client and the `/api` routes from one Render URL. Connect the repository in Render and use the Blueprint; if the actual Git repository has this project inside a `neurobridge-demo/` subfolder, set that as Render's Root Directory.

Set `DATABASE_URL` to the Supabase PostgreSQL **Session pooler** connection string (port `5432`) and deploy. The start command applies pending Prisma migrations before starting the server. Render generates `JWT_SECRET`; the Vite variables are set for production API mode. `OPENAI_API_KEY` is optional.

After deployment, open `https://<your-service>.onrender.com/api/health`. Free Render services can sleep while idle and may take a short time to wake on the next request.

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/rides`, `GET /api/rides/nearby`, `GET /api/rides/:id`, `GET /api/rides/:id/route`
- `POST /api/rides`, `PATCH /api/rides/:id`, `POST /api/rides/match`
- `POST /api/bookings`, `GET /api/bookings/me`, `PATCH /api/bookings/:id/accept`, `PATCH /api/bookings/:id/reject`
- `POST /api/locations/update`, `GET/POST /api/messages/:bookingId`
- `POST /api/ai/search`, `GET /api/health`

Booking acceptance decrements available seats in a serializable transaction. Chat is limited to participants in an accepted booking. Location updates require an authenticated driver; nearby results are time-limited and rounded before exposure. Socket.IO authenticates JWT sessions and authorizes accepted-booking rooms.

## Checks

```sh
npm run lint
npm test
npm run build
cd server
npm run db:generate
npm run db:migrate
```

Client lint, matching tests, and production build passed. Prisma client generation/schema validation and the API health endpoint also passed. A live database migration/seed and end-to-end browser session require a configured PostgreSQL/PostGIS instance and were not run here.

## Current scope and limitations

- Local demo mode is the default and stores app state in this browser only.
- The API and Prisma schema cover auth, ride CRUD, bookings, location updates, route matching, AI-assisted intent parsing, and authorized chat. Configure PostgreSQL, PostGIS, OSRM, and optionally OpenAI to activate those integrations.
- API-backed auth, ride search/detail/create, booking request/decisions, dashboard data, and accepted-booking messages over REST and Socket.IO are wired in the current client. Profile edits and location sharing remain local/not exposed in the UI.
- No identity verification or real-time vehicle tracking is claimed. Seed users, ratings, prices, and demo positions are fictional.
- Prisma's vulnerable `deepmerge-ts` dependency was overridden to the patched 8.0.2 release. The npm advisory endpoint reset the connection during the final audit recheck, so the post-override audit status could not be confirmed remotely.
