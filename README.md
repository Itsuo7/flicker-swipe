# FlickerSwipe

**A personalized movie discovery app built around the way people actually choose what to watch: one movie at a time.**

FlickerSwipe combines a swipeable discovery deck with a viewer's IMDb ratings to shape movie recommendations. Like a film, pass on it, or save it for later; import an IMDb ratings export to give recommendations a head start; and explore a profile that makes those preferences visible.

> Built by [Theo Yoshimura](https://github.com/Itsuo7). Movie metadata and imagery are provided by [TMDb](https://www.themoviedb.org/).

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-purple?logo=authdotjs)

---

## At a glance

- **Discover:** Browse a responsive, animated movie deck with mouse, touch, action buttons, or keyboard. Each card carries a dynamic badge ("Masterpiece", "Sci-Fi Spotlight", "Hidden Gem", …).
- **Decide:** Like a movie, pass, or add it to Watch Later. Open the details view for the synopsis, an auto-playing trailer embed, content rating, a compact cast list, and a Share button.
- **Personalize:** Combine explicit swipe choices and imported IMDb ratings into genre-based taste signals.
- **Import:** Upload an IMDb ratings CSV. Existing movie cache entries are reused; uncached titles are resolved through TMDb.
- **Manage:** Review taste insights and activity in your profile, and reset your activity when you want to start over.
- **Sign in or continue as guest:** Connect with Google or GitHub, or browse as a guest with a cookie-based identity. Private app data and API operations are scoped to the active account or guest.

## Product experience

### Movie discovery

The Discover page presents one movie at a time with a layered deck for the next titles. Swipe or use the controls to record a choice:

| Input | Action |
| --- | --- |
| Swipe left or `←` | Pass |
| Swipe right or `→` | Like |
| Swipe up | Save for later |
| Click / tap a card | Open expanded movie details |
| `Esc` | Close the expanded view |

Taps are told apart from drags with an 8px movement threshold, so a swipe never opens the details view by accident. Only the top card receives pointer events, and the whole deck is locked while a card animates out; the card data advances only when Framer Motion's `onExitComplete` fires. This prevents rapid swipes and clicks from queueing conflicting actions or leaving the stack unresponsive. A watchdog timer releases the lock if an animation is ever interrupted.

The expanded view is a scrollable, mobile-first modal (`w-[95vw] max-w-lg`, `max-h-[85dvh]`) with a sticky action bar. It shows the trailer when TMDb provides one, the release year and certification (for example PG-13 or R, from TMDb's `release_dates` for the BR or US region), runtime, rating, genres, and the top five cast members with a "Show more" toggle. The **Share** button uses the native Web Share API where available and otherwise copies the TMDb page link to the clipboard with a "Link copied!" confirmation.

### Recommendation quality

Candidates come from TMDb `/discover/movie` queries run in parallel across six decades (1970s–2020s) so the feed is not biased towards the current year. Movies are filtered and ranked as follows:

- Dropped if `vote_count < 100` or `vote_average <= 3`.
- Ranked within each decade by a Bayesian-weighted score that combines `vote_average` and `vote_count`, so well-tested films outrank obscure or brand-new ones.
- Interleaved across decades for variety.

TMDb responses are cached with Next.js fetch caching (one hour), so the multi-decade fan-out is not repeated on every refresh. Cached rows are served first; when fewer than five are available, the server refreshes the cache in the background and the client retries a bounded number of times (at most 10) before giving up.

### Taste profile

FlickerSwipe builds a genre preference summary from two sources:

- **Positive signals:** a `LIKE` swipe or an IMDb rating of **7 or higher**.
- **Negative signals:** a `DISLIKE` swipe or an IMDb rating of **5 or lower**.

Movies rated 6 do not contribute to these thresholds. Genre scores come from movie metadata retrieved from TMDb, using up to the 200 most recent signals of each kind. The discovery feed avoids movies already swiped on or present in the user's imported ratings.

### IMDb import

Upload the CSV export from IMDb's ratings list. The importer validates the expected columns and movie rows, filters invalid entries, resolves IMDb IDs to TMDb records, and updates existing ratings if a CSV is imported again. Individual TMDb lookup failures are skipped and counted instead of preventing other valid rows from importing.

## How it works

```text
Browser
  ├─ Server-rendered pages ── session or guest identity + user-scoped database queries
  └─ Interactive components ── swipe gestures, keyboard controls, language preference
                                     │
                                  App Router API
                     identity check → validate input → act
                                     │
                 ┌───────────────────┴────────────────────┐
                 │                                        │
          Drizzle ORM / PostgreSQL                  TMDb API
     users · movie cache · ratings           discovery · details · genres
          swipe history / sessions           certifications · trailers
```

The app uses Next.js App Router (with `cacheComponents` enabled) and React Server Components for server-side data access, with client components for interactive controls. Drizzle ORM provides typed PostgreSQL queries. Auth.js manages OAuth sign-in, with a custom sign-in page at `/login`.

### Identity: accounts and guests

`getSessionUserId()` in `src/lib/session.ts` is the single source of identity for API routes and pages. It returns the Auth.js user ID when signed in; otherwise it falls back to an `httpOnly` `guest_id` cookie (`guest-<uuid>`) created by `POST /api/guest` when the user picks **Continue as guest**. The matching `users` row is created on demand. Handlers never trust a user ID sent by the browser. Guest data is not migrated when a guest later signs in.

### Swipes and cache freshness

- `POST /api/swipe` upserts into `swipe_history` with `INSERT … ON CONFLICT (user_id, movie_id) DO UPDATE`, backed by a unique index, so rapid or repeated swipes can never create duplicate rows. If the movie is not yet in `movie_cache`, its details are fetched from TMDb server-side; client-supplied movie data is not trusted.
- After a write, the route calls `revalidatePath` for `/`, `/watchlist` and `/profile`, and the client calls `router.refresh()` so the Router Cache shows the new data immediately. The Watchlist grid resyncs when its server data changes.

### Import pipeline and resilience

The import route:

1. Requires an active identity and validates the multipart upload.
2. Enforces a **10 MB** file limit and a **20,000-row** CSV limit.
3. Parses the IMDb CSV and checks its required columns.
4. Looks up existing movie cache entries using IMDb IDs in groups of **50**.
5. Resolves uncached titles through TMDb in parallel batches of **10**, with a request timeout.
6. Upserts movie cache records and user ratings in batches of **100** inside a database transaction.
7. Reports imported and skipped rows, elapsed time, and whether recommendation cache warming succeeded.

The route sets `maxDuration = 60` for Vercel. Cache warming is best-effort: an import can complete even if that follow-up step fails.

## Technology

| Layer | Technologies |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript 5 |
| UI and interaction | Tailwind CSS 4, Framer Motion, Lucide React |
| Authentication | Auth.js v5, Google and GitHub OAuth, Drizzle adapter, cookie-based guest mode |
| Database | PostgreSQL (Neon-compatible), Drizzle ORM, `postgres` (`prepare: false`, `max: 5`) |
| Movie metadata | TMDb API |
| Import parsing | PapaParse |


## Run locally

### Requirements

- Node.js **20 or newer**
- npm
- PostgreSQL database (for example, [Neon](https://neon.tech/))
- TMDb API read access token
- Credentials for at least one OAuth provider (Google or GitHub)

### 1. Install

From the project root:

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root. Do not commit real credentials.

```dotenv
DATABASE_URL=postgresql://...
TMDB_READ_TOKEN=your_tmdb_read_access_token

AUTH_SECRET=replace_with_a_long_random_secret
AUTH_URL=http://localhost:3000

AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

Set credentials for at least one provider. Provider IDs and secrets can also use the conventional names `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_ID`, and `GITHUB_SECRET`. Register the matching callback URL with each provider:

- Google: `http://localhost:3000/api/auth/callback/google`
- GitHub: `http://localhost:3000/api/auth/callback/github`

Use a strong `AUTH_SECRET` outside local development; without it, auth is disabled and only guest mode is available.

### Deploying to Vercel

- Set `DATABASE_URL`, `TMDB_READ_TOKEN`, `AUTH_SECRET`, `AUTH_URL` and the OAuth variables in the project environment, and register the deployed origin's callback URLs with Google and GitHub.
- Use Neon's **pooled** connection string (the host contains `-pooler`). The database client is configured with `prepare: false` and `max: 5` for serverless use.
- Run the SQL migrations against the production database before the first deploy.
- The IMDb import route sets `maxDuration = 60`; your Vercel plan's function limit may cap this.

### 3. Apply migrations

Apply the checked-in SQL migrations, in order, to an existing database:

```powershell
psql $env:DATABASE_URL -f .\drizzle\0001_auth.sql
psql $env:DATABASE_URL -f .\drizzle\0002_movie_cache_imdb_id.sql
psql $env:DATABASE_URL -f .\drizzle\0003_swipe_history_unique.sql
```

The first migration adds Auth.js account/session support and profile fields to `users`. The second adds the IMDb ID field and unique index used for cached movie lookups. The third removes duplicate `swipe_history` rows (keeping the most recent per user and movie) and adds the unique `(user_id, movie_id)` index that the swipe upsert relies on. Run it before deploying the current swipe route.

### 4. Start the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build |

## Project structure

```text
src/
├── app/                 App Router pages, layout, and API routes
│   ├── api/             Auth, guest, swipe, recommendations, import, profile, reset
│   ├── login/           Custom sign-in page (OAuth + guest)
│   ├── profile/         Profile dashboard
│   ├── upload/          IMDb import experience
│   └── watchlist/       Saved and liked movies
├── components/          Deck, swipe cards, details modal, navbar, login, profile
├── db/                  Drizzle schema and PostgreSQL client
└── lib/                 Session/guest identity, TMDb, ranking, badges, taste, i18n
drizzle/                 Checked-in SQL migrations
```

## Authentication and privacy

Profile, swipe, recommendation, movie-details, IMDb import, and activity reset APIs require an identity: a valid Auth.js session or a guest cookie. Requests with neither receive `401 Unauthorized`. The Watchlist page redirects visitors without an identity to `/login`, and Auth.js is configured to send all sign-in flows to the custom `/login` page. The login `callbackUrl` is reduced to a same-site path to avoid open redirects.

User identity is derived server-side; API handlers do not accept a client-provided user ID as authorization. The legacy `test-user-1` demo record may remain in an existing database, but it is not used as a fallback.

## Localization and attribution

TMDb requests use either `pt-BR` or `en-US`. The app normalizes Portuguese locales such as `pt-PT` to `pt-BR`, uses `en-US` for other locales, and supports a saved language preference.

This product uses the TMDb API but is not endorsed or certified by TMDb.

## License

This repository does not currently include a license file. All rights reserved unless the maintainer grants permission otherwise.
