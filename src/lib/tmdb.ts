import { defaultLanguage, type Language } from "@/lib/i18n";
import { normalizeLanguage } from "@/lib/language";

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
  vote_count?: number;
}

export interface TMDBMovieDetails extends Omit<TMDBMovie, "genre_ids"> {
  genres: { id: number; name: string }[];
  runtime?: number | null;
}

export interface TMDBExpandedMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  certification: string | null;
  genres: { id: number; name: string }[];
  cast: { id: number; name: string; character: string; profile_path: string | null }[];
  trailerKey: string | null;
  providers: {
    type: "flatrate" | "free" | "ads" | "rent" | "buy";
    results: { provider_id: number; provider_name: string; logo_path: string | null }[];
  }[];
}

interface TMDBFindResponse {
  movie_results: TMDBMovie[];
}

interface TMDBCreditsResponse {
  cast: TMDBExpandedMovieDetails["cast"];
}

interface TMDBVideosResponse {
  results: {
    key: string;
    site: string;
    type: string;
    official?: boolean;
  }[];
}

interface TMDBWatchProvidersResponse {
  results: Record<
    string,
    Partial<
      Record<
        "flatrate" | "free" | "ads" | "rent" | "buy",
        TMDBExpandedMovieDetails["providers"][number]["results"]
      >
    >
  >;
}

interface TMDBReleaseDatesResponse {
  results: {
    iso_3166_1: string;
    release_dates: { certification: string; type: number }[];
  }[];
}

const minimumVoteCount = 100;
const minimumVoteAverage = 3;
const bayesianPriorVotes = 1000;
const bayesianPriorMean = 6.5;
const decadeStarts = [1970, 1980, 1990, 2000, 2010, 2020];

export function isQualityMovie(movie: TMDBMovie): boolean {
  return (
    (movie.vote_count ?? 0) >= minimumVoteCount &&
    movie.vote_average > minimumVoteAverage
  );
}

// Weighted rating: pulls low-vote movies toward the mean so well-tested films rank first.
function qualityScore(movie: TMDBMovie): number {
  const votes = movie.vote_count ?? 0;
  return (
    (votes / (votes + bayesianPriorVotes)) * movie.vote_average +
    (bayesianPriorVotes / (votes + bayesianPriorVotes)) * bayesianPriorMean
  );
}

function decadeOf(movie: TMDBMovie): number {
  const year = Number(movie.release_date.slice(0, 4));
  return Number.isFinite(year) ? Math.floor(year / 10) * 10 : 0;
}

// Ranks each decade by quality, then interleaves decades so no single era dominates.
export function rankAndBalanceMovies(movies: TMDBMovie[]): TMDBMovie[] {
  const seen = new Set<number>();
  const byDecade = new Map<number, TMDBMovie[]>();
  for (const movie of movies) {
    if (seen.has(movie.id) || !isQualityMovie(movie)) {
      continue;
    }
    seen.add(movie.id);
    const decade = decadeOf(movie);
    byDecade.set(decade, [...(byDecade.get(decade) ?? []), movie]);
  }

  const queues = [...byDecade.values()].map((queue) =>
    queue.sort((a, b) => qualityScore(b) - qualityScore(a)),
  );
  const balanced: TMDBMovie[] = [];
  for (let index = 0; queues.some((queue) => index < queue.length); index += 1) {
    const round = queues
      .map((queue) => queue[index])
      .filter((movie): movie is TMDBMovie => Boolean(movie))
      .sort((a, b) => qualityScore(b) - qualityScore(a));
    balanced.push(...round);
  }
  return balanced;
}

async function discoverAcrossDecades(
  page: number,
  language: Language,
  extraParams: Record<string, string> = {},
): Promise<TMDBMovie[]> {
  const currentYear = new Date().getFullYear();
  const responses = await Promise.allSettled(
    decadeStarts.map((start) => {
      const query = new URLSearchParams({
        ...extraParams,
        page: String(page),
        sort_by: "vote_count.desc",
        "vote_count.gte": String(minimumVoteCount),
        "vote_average.gte": String(minimumVoteAverage + 0.1),
        "primary_release_date.gte": `${start}-01-01`,
        "primary_release_date.lte": `${Math.min(start + 9, currentYear)}-12-31`,
      });
      return fetchTMDB<{ results: TMDBMovie[] }>(
        `/discover/movie?${query.toString()}`,
        undefined,
        language,
      );
    }),
  );
  const fulfilled = responses.flatMap((response) =>
    response.status === "fulfilled" ? response.value.results : [],
  );
  if (fulfilled.length === 0) {
    const failure = responses.find((response) => response.status === "rejected");
    if (failure?.status === "rejected") {
      throw failure.reason;
    }
  }
  return rankAndBalanceMovies(fulfilled);
}

const tmdbBaseUrl = (
  process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3"
).replace(/\/+$/, "");

async function fetchTMDB<T>(
  path: string,
  signal?: AbortSignal,
  language: Language = defaultLanguage,
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    throw new Error("TMDB_READ_TOKEN must be set to make TMDb requests.");
  }

  const endpoint = new URL(`${tmdbBaseUrl}${path}`);
  endpoint.searchParams.set("language", normalizeLanguage(language));

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(
      `TMDb request failed with status ${response.status}: ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export async function getExpandedMovieDetails(
  tmdbId: number,
  language: Language = defaultLanguage,
): Promise<TMDBExpandedMovieDetails> {
  const moviePath = `/movie/${encodeURIComponent(tmdbId)}`;
  const [details, credits, videos, watchProviders, releaseDates] =
    await Promise.all([
      fetchTMDB<TMDBMovieDetails>(moviePath, undefined, language),
      fetchTMDB<TMDBCreditsResponse>(
        `${moviePath}/credits`,
        undefined,
        language,
      ),
      fetchTMDB<TMDBVideosResponse>(
        `${moviePath}/videos`,
        undefined,
        language,
      ),
      fetchTMDB<TMDBWatchProvidersResponse>(
        `${moviePath}/watch/providers`,
        undefined,
        language,
      ),
      fetchTMDB<TMDBReleaseDatesResponse>(
        `${moviePath}/release_dates`,
        undefined,
        language,
      ).catch(() => ({ results: [] }) as TMDBReleaseDatesResponse),
    ]);
  const certificationCountry = (code: string) =>
    releaseDates.results
      .find((item) => item.iso_3166_1 === code)
      ?.release_dates.filter((release) => release.certification.trim());
  const certificationReleases =
    certificationCountry(language === "pt-BR" ? "BR" : "US") ??
    certificationCountry("US") ??
    [];
  const certification =
    (
      certificationReleases.find((release) => release.type === 3) ??
      certificationReleases[0]
    )?.certification.trim() || null;
  const video =
    videos.results.find(
      (item) => item.site === "YouTube" && item.type === "Trailer",
    ) ??
    videos.results.find(
      (item) => item.site === "YouTube" && item.type === "Teaser",
    );
  const providerRegion =
    watchProviders.results[language === "pt-BR" ? "BR" : "US"] ??
    watchProviders.results.US;
  const providerTypes = ["flatrate", "free", "ads", "rent", "buy"] as const;

  return {
    id: details.id,
    title: details.title,
    overview: details.overview,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    release_date: details.release_date,
    runtime: details.runtime ?? null,
    vote_average: details.vote_average,
    certification,
    genres: details.genres,
    cast: credits.cast.slice(0, 12),
    trailerKey: video?.key ?? null,
    providers: providerTypes.flatMap((type) => {
      const results = providerRegion?.[type];
      return results?.length ? [{ type, results }] : [];
    }),
  };
}

export async function getMovieDetails(
  tmdbId: number,
  signal?: AbortSignal,
  language: Language = defaultLanguage,
): Promise<TMDBMovieDetails> {
  return fetchTMDB<TMDBMovieDetails>(
    `/movie/${encodeURIComponent(tmdbId)}`,
    signal,
    language,
  );
}

export async function getMovieByImdbId(
  imdbId: string,
  signal?: AbortSignal,
  language: Language = defaultLanguage,
): Promise<TMDBMovie | null> {
  const query = new URLSearchParams({
    external_source: "imdb_id",
  });
  const result = await fetchTMDB<TMDBFindResponse>(
    `/find/${encodeURIComponent(imdbId)}?${query.toString()}`,
    signal,
    language,
  );

  return result.movie_results[0] ?? null;
}

export async function getMoviesByGenres(
  genreIds: number[],
  page: number,
  language: Language = defaultLanguage,
): Promise<TMDBMovie[]> {
  return discoverAcrossDecades(page, language, {
    with_genres: genreIds.join("|"),
  });
}

export async function getPopularMovies(
  page: number,
  language: Language = defaultLanguage,
): Promise<TMDBMovie[]> {
  return discoverAcrossDecades(page, language);
}
