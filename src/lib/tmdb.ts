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
  const [details, credits, videos, watchProviders] = await Promise.all([
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
  ]);
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
  const query = new URLSearchParams({
    with_genres: genreIds.join("|"),
    page: String(page),
  });
  const result = await fetchTMDB<{ results: TMDBMovie[] }>(
    `/discover/movie?${query.toString()}`,
    undefined,
    language,
  );

  return result.results;
}

export async function getPopularMovies(
  page: number,
  language: Language = defaultLanguage,
): Promise<TMDBMovie[]> {
  const query = new URLSearchParams({ page: String(page) });
  const result = await fetchTMDB<{ results: TMDBMovie[] }>(
    `/movie/popular?${query.toString()}`,
    undefined,
    language,
  );

  return result.results;
}
