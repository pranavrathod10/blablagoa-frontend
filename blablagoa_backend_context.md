# BlaBlaGoa — Frontend-Side View of the Backend

> **Scope.** This document captures everything the **frontend repo** knows
> (or assumes) about the backend, derived from:
> - `lib/api.ts` (the only place the frontend talks to the API)
> - `proxy.ts` (Clerk middleware)
> - actual usage inside each page under `app/(authenticated)/`
>
> It is **independent** of `BLABLAGOA_CONTEXT.md`, which is a hand-written
> design doc whose claims have not all been verified against the running
> backend. Where the two disagree, **this file describes what the frontend
> code actually does**, not what the design doc says.
>
> The backend itself lives in a **separate repository** that is not present
> in this workspace; nothing in this file edits or migrates backend code.

---

## 1. Where the frontend points to

| Setting | Value | Source |
|---|---|---|
| Base URL | `process.env.NEXT_PUBLIC_API_URL`, fallback `http://localhost:8000` | [`lib/api.ts`](lib/api.ts#L1-L2) |
| WebSocket URL | Same base, scheme rewritten `https→wss`, `http→ws` | [`lib/api.ts`](lib/api.ts#L218-L228) |
| Auth scheme | `Authorization: Bearer <Clerk JWT>` on every REST call | [`lib/api.ts`](lib/api.ts#L25-L41) |
| WS auth | JWT passed as `?token=...` query param (browsers can't set headers on WS upgrade) | [`lib/api.ts`](lib/api.ts#L218-L228) |
| Token refresh | `getToken({ skipCache: true })` is used on **every** call (no caching) | every page |
| Route gating | Clerk middleware in [`proxy.ts`](proxy.ts) — only `/`, `/sign-in*`, `/sign-up*` are public |

The frontend has **no retry, no exponential backoff, no global request
interceptor for 401/429** — every error becomes a thrown `Error(detail)`
that each page handles locally (most swallow it silently).

---

## 2. Endpoints actually called by this frontend

Verified by grepping every call site in `lib/api.ts` and the pages that
use them.

| Method | Path | Where it's called | Polled? |
|---|---|---|---|
| `POST` | `/users/register` | [dashboard/page.tsx](app/(authenticated)/dashboard/page.tsx) on first load (fallback when `/users/me` 404s) | no |
| `GET` | `/users/me` | dashboard, profile | no |
| `PATCH` | `/users/me` | profile (save), connect (radius slider) | on save / debounced 500ms |
| `PATCH` | `/discover/me/location` | connect ("Use current location") | one-shot |
| `PATCH` | `/discover/me/presence` | connect | **every 30s** while on page |
| `GET` | `/discover/nearby` | connect | on demand (location set / refresh / radius change) |
| `POST` | `/connections/` | connect (send-request modal) | one-shot |
| `GET` | `/connections/pending` | connect, activity | **every 10s** while on page |
| `GET` | `/connections/sent` | activity | **every 10s** while on page |
| `PATCH` | `/connections/{id}/respond` | connect, activity | on accept/reject |
| `GET` | `/sessions/active` | causerie | **every 15s** while on page |
| `GET` | `/sessions/{id}` | session/[id] (one-shot on mount) | no |
| `WS` | `/ws/session/{id}?token=...` | session/[id] | persistent for the 5-min session |

Endpoints listed in the design doc but **never called by this frontend**:
- `POST /users/me/avatar` — no UI exists for avatar upload (only an `avatar_url` field is read for display).
- `GET /health` — used by external cron, not by the app.

---

## 3. TypeScript ↔ backend response contract

The frontend's view of every backend response. **Any backend rename or
type change here will silently break this UI.**

```ts
// lib/api.ts
interface User {
  id: number; email: string; name: string;
  bio: string | null; avatar_url: string | null;
  date_of_birth: string | null;       // ISO date "YYYY-MM-DD"
  is_active: boolean; is_profile_complete: boolean;
  latitude: number | null; longitude: number | null;
  discovery_radius_km: number;        // default seems to be set server-side
  is_discoverable: boolean;
  last_seen: string | null;           // ISO datetime
  created_at: string;                 // ISO datetime
}

interface NearbyUser {
  id: number; name: string;
  bio: string | null; avatar_url: string | null;
  distance_km: number;                // rounded server-side, displayed verbatim
  is_online: boolean;                 // not currently rendered, but read
}

interface ConnectionRequest {
  id: number;
  sender_id: number; receiver_id: number;
  message: string;                    // NOT NULL on the server
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string; expires_at: string;   // expires_at = created_at + 1h
  responded_at: string | null;
  // Enriched server-side when relevant:
  sender_name?: string; sender_bio?: string;
  receiver_name?: string;
}

interface ChatSession {
  id: number; request_id: number;
  user_one_id: number; user_two_id: number;
  status: "active" | "ended" | "abandoned";
  started_at: string; expires_at: string;   // expires_at = started_at + 5min
  ended_at: string | null;
  other_user_name?: string;          // resolved server-side
}

interface RespondResult {
  status: string;
  session_id?: number;                // present only on accept
  expires_at?: string;
}
```

### WebSocket message shapes (from `session/[id]/page.tsx`)

Server → client messages always have a `type` field; client → server only
sends `{ content: string }`.

| `type` | Fields used by the UI |
|---|---|
| `session_info` | `your_user_id` (number) — needed to render "is me" |
| `message` | `id`, `sender_id`, `sender_name`, `content`, `sent_at` |
| `user_joined` | `user_name` — rendered as system bubble "X joined" |
| `user_left` | `user_name` — rendered as system bubble "X left" |
| `session_ended` | (any payload) — triggers the "Session ended" screen |

The frontend silently ignores any `type` it doesn't recognise.

---

## 4. Behavioural assumptions baked into the UI

These are things the frontend will break on if the backend changes them
without coordination.

| Assumption | Frontend relies on it where |
|---|---|
| `expires_at` on sessions is the **authoritative** end time | Countdown in `session/[id]` and `causerie` — both compute purely from this field |
| Server auto-expires stale pending requests when `/connections/pending` is called | activity / connect both rely on the list shrinking without an explicit action |
| Server auto-ends sessions past `expires_at` when `/sessions/active` is called | causerie polls every 15s and trusts the returned list |
| `POST /connections/` returns 4xx with a JSON `{detail: ...}` if a pending request already exists | connect surfaces `err.message` directly to the user |
| `PATCH /connections/{id}/respond` returns `{session_id}` when `action=accept` | both pages immediately `router.push(/session/{session_id})` |
| WebSocket connect succeeds only if the user is `user_one_id`/`user_two_id` of the session | session page doesn't double-check; trusts the upgrade |
| 30-second `last_seen` window means polling presence every 30s is enough to stay "online" | connect heartbeat interval |
| `discovery_radius_km` is stored per-user server-side | radius slider sends a PATCH instead of attaching `?radius=` to `/discover/nearby` |
| Reverse geocoding is the **client's** job (Nominatim) | connect calls `nominatim.openstreetmap.org` directly with `User-Agent: BlaBlaGoa/1.0` |

---

## 5. Implementation gaps vs. `BLABLAGOA_CONTEXT.md`

Items the design doc describes that **the frontend code does not yet
reflect**:

1. **Avatar upload** — no UI, no call to `POST /users/me/avatar`. `avatar_url`
   is read everywhere but rendered as just an initial letter inside a coloured
   circle. R2 is irrelevant to this repo today.
2. **WebSocket reconnect** — `session/[id]/page.tsx` `onclose` does call
   `setTimeout(() => init(), 2000)` but it references `sessionEnded` from a
   **stale closure** (the effect only runs once) and there is no backoff /
   max-retries / connectivity check. Practically: one reconnect attempt that
   may itself silently fail.
3. **Mobile responsive** — at time of writing only `/activity` is partially
   responsive. The current code uses `flex` (not `flex-col md:flex-row`),
   fixed widths (`w-72`), and large paddings on `connect`, `session`, the
   landing page, and the navbar. (Being fixed in this PR.)
4. **Error UX** — most catches are `catch {}` with no user feedback; a
   global toast / retry layer does not exist.
5. **No request cancellation** — when a user navigates away mid-fetch, the
   in-flight `fetch` continues and may `setState` after unmount. React 19
   tolerates this but it's wasted work.
6. **No request deduplication** — connect's heartbeat (30s) and pending-poll
   (10s) each call `getToken({ skipCache: true })` independently, meaning a
   token round-trip per poll.

---

## 6. What the frontend does NOT know about the backend

To be explicit, so future contributors don't assume otherwise:

- The Haversine SQL query, the `online_threshold` value (60s vs. 10min),
  `slowapi` rate-limit thresholds, `ConnectionManager` internals, Alembic
  migration state, R2 credentials — **none of this is observable from this
  repo**. Treat the design doc's claims about them as "probably true,
  verify in the backend repo before changing behaviour".
- There is no OpenAPI/JSON schema sync; the TS interfaces in `lib/api.ts`
  are maintained by hand.
- There is no shared types package; if you change a Pydantic model on the
  backend, you must hand-edit the matching TS interface here.

---

## 7. Crisp summary of this repo (frontend)

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind v4.
- **Auth:** `@clerk/nextjs` + `proxy.ts` (Clerk middleware; the middleware file
  is named `proxy.ts` — unusual — and the matcher excludes static assets +
  includes `/api`,`/trpc`).
- **Layouts:**
  - Root layout `app/layout.tsx` wraps with `ClerkProvider`.
  - `app/(authenticated)/layout.tsx` adds `Navbar` + `ErrorBoundary` (from
    `react-error-boundary`) + a fixed `max-w-6xl` content container.
- **Pages (7 total):**
  1. `/` — public landing, split-screen hero.
  2. `/sign-in`, `/sign-up` — Clerk catch-all routes.
  3. `/dashboard` — profile auto-register fallback + summary card.
  4. `/connect` — location set, radius slider (debounced 500ms), nearby
     list, send-request modal, **30s** presence heartbeat, **10s** incoming
     request poll, in-page floating request toast.
  5. `/activity` — Received/Sent tabs, **10s** poll, status badges.
  6. `/causerie` — list of active sessions with per-card countdown, **15s** poll.
  7. `/session/[id]` — WebSocket chat, server-authoritative countdown,
     auto-scroll, "session ended" screen.
  8. `/profile` — edit name/bio/DOB, dirty tracking, validation, live preview.
- **Shared UI:** `components/navbar.tsx` (currently desktop-only), plus
  shadcn-style primitives under `components/ui/` that aren't actually
  imported by any page yet.
- **API client:** single file `lib/api.ts` — one `fetchWithAuth` helper, no
  retries, no interceptor; every endpoint has a typed wrapper.
- **Build/Deploy:** Vercel auto-deploy on push to `main`. No custom CI.
- **Env vars consumed:** `NEXT_PUBLIC_API_URL`, plus the standard Clerk set.

### State patterns to know before editing

- `useRef` for the WebSocket and for the "expired-already-fired" flag.
- `useCallback` on fetchers in `/connect` because they're in `useEffect` deps.
- Debounced API on the radius slider via `useRef<NodeJS.Timeout>`.
- Polling intervals: 10s (requests), 15s (sessions), 30s (presence). All
  call `getToken({ skipCache: true })`, no caching.
- All `setInterval`s return a `clearInterval` cleanup — preserve this when
  refactoring.
