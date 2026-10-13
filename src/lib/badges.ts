import type { Language } from "@/lib/i18n";

interface BadgeMovie {
  id: number;
  genre_ids: number[];
  release_date: string;
  vote_average: number;
  vote_count?: number;
}

type Label = Record<Language, string>;

const genreBadges: Record<number, Label[]> = {
  28: [
    { "en-US": "Adrenaline Rush", "pt-BR": "Pura Adrenalina" },
    { "en-US": "Blockbuster Thrill", "pt-BR": "Emoção de Blockbuster" },
  ],
  12: [
    { "en-US": "Adrenaline Rush", "pt-BR": "Pura Adrenalina" },
    { "en-US": "Blockbuster Thrill", "pt-BR": "Emoção de Blockbuster" },
  ],
  16: [{ "en-US": "Animated Charm", "pt-BR": "Encanto Animado" }],
  35: [
    { "en-US": "Feel-Good Pick", "pt-BR": "Para Alegrar o Dia" },
    { "en-US": "Laughter Guaranteed", "pt-BR": "Risadas Garantidas" },
  ],
  80: [{ "en-US": "Crime Spotlight", "pt-BR": "Destaque do Crime" }],
  99: [{ "en-US": "Real Stories", "pt-BR": "Histórias Reais" }],
  18: [
    { "en-US": "Emotional Journey", "pt-BR": "Jornada Emocionante" },
    { "en-US": "Powerful Drama", "pt-BR": "Drama Intenso" },
  ],
  10751: [{ "en-US": "Family Night", "pt-BR": "Noite em Família" }],
  14: [{ "en-US": "Fantasy Escape", "pt-BR": "Fuga Fantástica" }],
  36: [{ "en-US": "History Lesson", "pt-BR": "Viagem no Tempo" }],
  27: [
    { "en-US": "Late-Night Chill", "pt-BR": "Arrepio de Madrugada" },
    { "en-US": "Edge-of-Your-Seat", "pt-BR": "Tensão Total" },
  ],
  10402: [{ "en-US": "Music Lover's Pick", "pt-BR": "Para Amantes de Música" }],
  9648: [{ "en-US": "Mystery Box", "pt-BR": "Caixa de Mistérios" }],
  10749: [
    { "en-US": "Heartwarming Pick", "pt-BR": "Aquece o Coração" },
    { "en-US": "Emotional Journey", "pt-BR": "Jornada Emocionante" },
  ],
  878: [
    { "en-US": "Future Classic", "pt-BR": "Clássico do Futuro" },
    { "en-US": "Sci-Fi Spotlight", "pt-BR": "Destaque Sci-Fi" },
  ],
  53: [
    { "en-US": "Edge-of-Your-Seat", "pt-BR": "Tensão Total" },
    { "en-US": "Late-Night Chill", "pt-BR": "Arrepio de Madrugada" },
  ],
  10752: [{ "en-US": "War Story", "pt-BR": "Cenário de Guerra" }],
  37: [{ "en-US": "Western Tale", "pt-BR": "Faroeste" }],
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

  const rating = movie.vote_average;
  const votes = movie.vote_count;
  const hasVotes = votes !== undefined;

  if (rating >= 8.3 && (!hasVotes || votes >= 1000)) {
    return pick({ "en-US": "Masterpiece", "pt-BR": "Obra-prima" });
  }
  if (rating >= 7.5 && hasVotes && votes >= 100 && votes < 1000) {
    return pick({ "en-US": "Hidden Gem", "pt-BR": "Joia Escondida" });
  }
  if (year > 0 && year < 1990 && rating >= 7.3) {
    return pick({ "en-US": "Vintage Classic", "pt-BR": "Clássico Vintage" });
  }
  if (year >= new Date().getFullYear() - 20 && rating >= 7.8) {
    return pick({ "en-US": "Modern Classic", "pt-BR": "Clássico Moderno" });
  }
  if (rating >= 7.2 && hasVotes && votes >= 10000) {
    return pick({ "en-US": "Crowd Pleaser", "pt-BR": "Agrada a Todos" });
  }

  // Alternate genre-specific and generic tags so the stack feels varied.
  const genreLabel = movie.genre_ids
    .flatMap((id) => {
      const options = genreBadges[id];
      return options ? [options[movie.id % options.length]] : [];
    })
    .at(0);
  if (genreLabel && movie.id % 3 !== 0) {
    return pick(genreLabel);
  }
  return pick(genericBadges[movie.id % genericBadges.length]);
}
