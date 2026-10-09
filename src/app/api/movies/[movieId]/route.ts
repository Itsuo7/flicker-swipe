import { NextResponse } from "next/server";
import { detectRequestLanguage } from "@/lib/language";
import { requireSessionUser } from "@/lib/api-auth";
import { getExpandedMovieDetails } from "@/lib/tmdb";

interface RouteContext {
  params: Promise<{ movieId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { movieId: rawMovieId } = await params;
    const movieId = Number(rawMovieId);
    if (!Number.isSafeInteger(movieId) || movieId <= 0) {
      return NextResponse.json(
        { error: "A positive movie ID is required." },
        { status: 400 },
      );
    }

    const requestedLanguage = new URL(request.url).searchParams.get("language");
    const language = detectRequestLanguage(request.headers, requestedLanguage);
    const details = await getExpandedMovieDetails(movieId, language);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Could not load expanded movie details.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load movie details.",
      },
      { status: 500 },
    );
  }
}
