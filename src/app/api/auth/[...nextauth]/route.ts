import { authSecret, handlers } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";

function missingSecretResponse() {
  return NextResponse.json(
    { error: "Set AUTH_SECRET or NEXTAUTH_SECRET to enable authentication." },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  if (!authSecret) {
    if (request.nextUrl.pathname.endsWith("/session")) {
      return NextResponse.json(null);
    }
    return missingSecretResponse();
  }
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!authSecret) {
    return missingSecretResponse();
  }
  return handlers.POST(request);
}
