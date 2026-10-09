import type { Language } from "@/lib/i18n";

interface BadgeMovie {
  id: number;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
}

type Label = Record<Language, string>;

const genreBadges: Record<number, Label> = {
  28: { "en-US": "Action Rush", "pt-BR": "Pura Ação" },
  12: { "en-US": "Big Adventure", "pt-BR": "Grande Aventura" },
  16: { "en-US": "Animated Charm", "pt-BR": "Encanto Animado" },
  35: { "en-US": "Feel-Good Laughs", "pt-BR": "Risadas Garantidas" },
  80: { "en-US": "Crime Spotlight", "pt-BR": "Destaque do Crime" },
  99: { "en-US": "Real Stories", "pt-BR": "Histórias Reais" },
  18: { "en-US": "Powerful Drama", "pt-BR": "Drama Intenso" },
  10751: { "en-US": "Family Night", "pt-BR": "Noite em Família" },
  14: { "en-US": "Fantasy Escape", "pt-BR": "Fuga Fantástica" },
  36: { "en-US": "History Lesson", "pt-BR": "Viagem no Tempo" },
  27: { "en-US": "Fright Night", "pt-BR": "Noite de Terror" },
  10402: { "en-US": "Music Lover's Pick", "pt-BR": "Para Amantes de Música" },
  9648: { "en-US": "Mystery Box", "pt-BR": "Caixa de Mistérios" },
  10749: { "en-US": "Heartwarming", "pt-BR": "Aquece o Coração" },
  878: { "en-US": "Sci-Fi Spotlight", "pt-BR": "Destaque Sci-Fi" },
  53: { "en-US": "Edge of Your Seat", "pt-BR": "Tensão Total" },
  10752: { "en-US": "War Story", "pt-BR": "Cenário de Guerra" },
  37: { "en-US": "Western Tale", "pt-BR": "Faroeste" },
};

const genericBadges: Label[] = [
  { "en-US": "Tonight's Feature", "pt-BR": "Sessão de Hoje" },
  { "en-US": "Fan Favorite", "pt-BR": "Favorito dos Fãs" },
  { "en-US": "Must-Watch", "pt-BR": "Imperdível" },
  { "en-US": "Hidden Gem", "pt-BR": "Joia Escondida" },
  { "en-US": "A Pick for Today", "pt-BR": "Escolha para Hoje" },
];

// Deterministic per movie so server and client render the same badge.
export function getMovieBadge(movie: BadgeMovie, language: Language): string {
  const year = Number(movie.release_date.slice(0, 4));
  const pick = (label: Label) => label[language];

  if (movie.vote_average >= 8.2) {
    return pick({ "en-US": "Masterpiece", "pt-BR": "Obra-prima" });
  }
  if (year > 0 && year < 1995 && movie.vote_average >= 7) {
    return pick({ "en-US": "Timeless Classic", "pt-BR": "Clássico Eterno" });
  }

  // Alternate genre-specific and generic tags so the stack feels varied.
  const genreLabel = movie.genre_ids
    .map((id) => genreBadges[id])
    .find((label) => label !== undefined);
  if (genreLabel && movie.id % 3 !== 0) {
    return pick(genreLabel);
  }
  return pick(genericBadges[movie.id % genericBadges.length]);
}
