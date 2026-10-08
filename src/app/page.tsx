import { Suspense } from "react";
import { headers } from "next/headers";
import { Deck } from "@/components/Deck";
import { getSwipeMovies } from "@/lib/swipe-movies";
import { HomeCopy } from "@/components/HomeCopy";
import { DeckSkeleton } from "@/components/DeckSkeleton";
import { getSessionUserId } from "@/lib/session";
import { detectRequestLanguage } from "@/lib/language";

export default function Home() {
  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-x-hidden bg-[#f5f2ed] text-[#1c2524] dark:bg-zinc-950 dark:text-zinc-100"
    >
      <section className="mx-auto flex min-h-[calc(100dvh-190px)] w-full max-w-7xl flex-1 flex-col items-center justify-center gap-2 px-3 py-2 sm:px-8 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(370px,1fr)_minmax(0,0.8fr)] lg:gap-4 lg:py-8">
        <HomeCopy variant="desktop" />

        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-col">
          <HomeCopy variant="mobile" />
          <Suspense fallback={<DeckSkeleton />}>
            <InitialDeck />
          </Suspense>
        </div>

        <HomeCopy variant="instructions" />
      </section>
    </main>
  );
}

async function InitialDeck() {
  const userId = await getSessionUserId();
  if (!userId) {
    return <HomeCopy variant="sign-in" />;
  }

  const requestHeaders = await headers();
  const language = detectRequestLanguage(requestHeaders);
  const movies = await getSwipeMovies(userId, 1, [], 10, language);
  return <Deck initialMovies={movies} initialLanguage={language} />;
}
