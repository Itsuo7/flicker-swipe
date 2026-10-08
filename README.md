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

- **Discover:** Browse a responsive, animated movie deck with mouse, touch, action buttons, or keyboard.
- **Decide:** Like a movie, pass, or add it to Watch Later. Open the details view for synopsis, cast, and available trailers.
- **Personalize:** Combine explicit swipe choices and imported IMDb ratings into genre-based taste signals.
- **Import:** Upload an IMDb ratings CSV. Existing movie cache entries are reused; uncached titles are resolved through TMDb.
- **Manage:** Review taste insights and activity in your profile, and reset your activity when you want to start over.
- **Sign in:** Connect with Google or GitHub. Private app data and API operations are scoped to the authenticated account.

## Product experience

### Movie discovery


The Discover page presents one movie at a time with a layered deck for the next titles. Swipe or use the controls to record a choice:

| Input | Action |
| --- | --- |
| Swipe left or `←` | Pass |
| Swipe right or `→` | Like |
| Swipe up | Save for later |
| `↑` or `Space` | Open or toggle expanded movie details |
| `Esc` | Collapse the expanded view |

The expanded view keeps decision controls available alongside localized movie details and trailers when TMDb provides them.

### Taste profile and recommendations

FlickerSwipe builds a genre preference summary from two sources:

- **Positive signals:** a `LIKE` swipe or an IMDb rating of **7 or higher**.
- **Negative signals:** a `DISLIKE` swipe or an IMDb rating of **5 or lower**.

Movies rated 6 do not contribute to these positive or negative rating thresholds. Genre scores are calculated from movie metadata retrieved from TMDb. The discovery feed avoids movies already swiped on or present in the user's imported ratings, so familiar titles are not repeatedly offered.

### IMDb import

Upload the CSV export from IMDb's ratings list. The importer validates the expected columns and movie rows, filters invalid entries, resolves IMDb IDs to TMDb records, and updates existing ratings if a CSV is imported again. Individual TMDb lookup failures are skipped and counted instead of preventing other valid rows from importing.

## How it works

```text
Browser
  ├─ Server-rendered pages ── authenticated session + user-scoped database queries
  └─ Interactive components ── swipe gestures, keyboard controls, language preference
                                     │
                                  App Router API
                         session check → validate input
                                     │
                 ┌───────────────────┴────────────────────┐
                 │                                        │
          Drizzle ORM / PostgreSQL                  TMDb API
     users · movie cache · ratings           discovery · details · genres
          swipe history / sessions
```

The app uses Next.js App Router and React Server Components for server-side data access, with client components for interactive controls. Drizzle ORM provides typed PostgreSQL queries. Auth.js manages OAuth sign-in, while protected API handlers resolve the active user from the session rather than trusting a user ID submitted by the browser.

### Import pipeline and resilience

The import route:

1. Requires an authenticated session and validates the multipart upload.
2. Enforces a **10 MB** file limit and a **20,000-row** CSV limit.
3. Parses the IMDb CSV and checks its required columns.
4. Looks up existing movie cache entries using IMDb IDs in groups of **50**.
5. Resolves uncached titles through TMDb in parallel batches of **10**, with a request timeout.
6. Upserts movie cache records and user ratings in batches of **100** inside a database transaction.
7. Reports imported and skipped rows, elapsed time, and whether recommendation cache warming succeeded.

These bounded batches limit query parameter growth and reduce per-row database round trips. Cache warming is best-effort: an import can complete even if that follow-up step fails.

## Technology

| Layer | Technologies |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript 5 |
| UI and interaction | Tailwind CSS 4, Framer Motion, Lucide React |
| Authentication | Auth.js v5, Google and GitHub OAuth, Drizzle adapter |
| Database | PostgreSQL (Neon-compatible), Drizzle ORM, `postgres` |
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

Use a strong `AUTH_SECRET` outside local development. When deploying, configure the same server-side variables in the hosting environment and update `AUTH_URL` and the OAuth callback URLs to the deployed origin.

### 3. Apply migrations

Apply the checked-in SQL migrations, in order, to an existing database:

```powershell
psql $env:DATABASE_URL -f .\drizzle\0001_auth.sql
psql $env:DATABASE_URL -f .\drizzle\0002_movie_cache_imdb_id.sql
```

The first migration adds Auth.js account/session support and profile fields to `users`. The second adds the IMDb ID field and unique index used for cached movie lookups.

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
│   ├── api/             Auth, swipe, recommendations, import, profile, reset
│   ├── profile/         Profile dashboard
│   ├── upload/          IMDb import experience
│   └── watchlist/       Saved and liked movies
├── components/          Deck, movie cards, details, profile, and shared UI
├── db/                  Drizzle schema and PostgreSQL client
└── lib/                 Auth helpers, TMDb, taste, locale, and feed logic
drizzle/                 Checked-in SQL migrations
```

## Authentication and privacy

Profile, swipe, recommendation, IMDb import, and activity reset APIs require a valid Auth.js session. Unauthenticated API requests receive `401 Unauthorized`. The Watchlist page redirects signed-out visitors to the profile page to connect an OAuth provider.

User identity is derived server-side from the session; API handlers do not accept a client-provided user ID as authorization. The legacy `test-user-1` demo record may remain in an existing database, but it is not an unauthenticated fallback and its data is not automatically reassigned to OAuth accounts.

## Localization and attribution

TMDb requests use either `pt-BR` or `en-US`. The app normalizes Portuguese locales such as `pt-PT` to `pt-BR`, uses `en-US` for other locales, and supports a saved language preference.

This product uses the TMDb API but is not endorsed or certified by TMDb.

## License

This repository does not currently include a license file. All rights reserved unless the maintainer grants permission otherwise.
