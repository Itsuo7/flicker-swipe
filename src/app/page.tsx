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
    <main className="flex-1 bg-[#f5f2ed] text-[#1c2524] dark:bg-zinc-950 dark:text-zinc-100">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 pb-10 pt-2 sm:px-8 md:grid-cols-[minmax(0,0.8fr)_minmax(370px,1fr)_minmax(0,0.8fr)] md:gap-4 md:py-8">
        <HomeCopy variant="desktop" />

        <div className="mx-auto w-full max-w-lg">
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
