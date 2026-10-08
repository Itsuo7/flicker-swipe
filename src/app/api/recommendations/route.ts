import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { detectRequestLanguage } from "@/lib/language";
import { requireSessionUser } from "@/lib/api-auth";
import { getPersonalizedRecommendations } from "@/lib/recommendations";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { userId } = authResult;
    const url = request.nextUrl;
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    const excludeParam = url.searchParams.get("exclude") ?? "";
    const requestedPage = Number(pageParam ?? "1");
    const requestedLimit = Number(limitParam ?? "10");
    const excludedIds = excludeParam
      ? excludeParam.split(",").map(Number)
      : [];

    if (
      (pageParam !== null &&
        (!/^\d+$/.test(pageParam) ||
          !Number.isInteger(requestedPage) ||
          requestedPage < 1 ||
          requestedPage > 500)) ||
      (limitParam !== null &&
        (!/^\d+$/.test(limitParam) ||
          !Number.isInteger(requestedLimit) ||
          requestedLimit < 1 ||
          requestedLimit > 30)) ||
      excludedIds.length > 500 ||
      excludedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid recommendation pagination or exclusion parameters." },
        { status: 400 },
      );
    }

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 500)
        : 1;
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 30)
        : 10;
    const requestedLanguage = url.searchParams.get("language");
    const language = detectRequestLanguage(request.headers, requestedLanguage);

    const recommendations = await getPersonalizedRecommendations(
      userId,
      page,
      excludedIds,
      limit,
      language,
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Could not load personalized recommendations.", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load recommendations.",
      },
      { status: 500 },
    );
  }
}
