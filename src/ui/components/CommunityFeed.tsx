import type { CommunityPost } from '../../core';

/**
 * El Feed de la comunidad "Chirp" (docs/10 §7.3): posts generados por
 * plantillas con sentimiento coloreado y hashtags. Los posts nuevos entran
 * deslizándose (clave estable por índice del feed: solo anima lo que llega);
 * durante una crisis el muro se convierte en la "manguera" roja. Solo muestra.
 */

const moodStyles: Record<CommunityPost['mood'], string> = {
  positivo: 'border-ok/40 bg-ok/10 text-ink',
  negativo: 'border-danger/40 bg-danger/10 text-ink',
  neutro: 'border-line bg-panel/60 text-ink',
};

export function CommunityFeed({
  posts,
  limit = 12,
  urgent = false,
}: {
  posts: readonly CommunityPost[];
  limit?: number;
  /** Crisis o review bombing en marcha: el muro arde (docs/10 §7.3). */
  urgent?: boolean;
}) {
  // Clave = índice en el feed original (solo se añade por el final): los posts
  // ya vistos conservan su nodo y solo los recién llegados montan (y animan).
  const visible = posts
    .map((post, feedIndex) => ({ post, feedIndex }))
    .reverse()
    .slice(0, limit);

  if (visible.length === 0) {
    return <p className="text-sm text-ink-faint">El foro está en silencio. De momento.</p>;
  }

  return (
    <div className="relative">
      {urgent && (
        <p className="feed-rage mb-2 rounded-md border border-danger/50 bg-danger/15 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-danger-hi">
          🔥 La comunidad arde
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map(({ post, feedIndex }) => (
          <li
            key={feedIndex}
            className={`feed-post rounded-md border px-3 py-2 text-sm ${moodStyles[post.mood]}`}
          >
            <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs opacity-70">
              <span className="font-semibold">{post.author}</span>
              <span className="shrink-0 tabular-nums">S{post.week}</span>
            </div>
            <p>{post.text}</p>
            {post.hashtag && (
              <span
                className={`mt-1 inline-block text-xs font-semibold ${
                  post.mood === 'negativo' ? 'text-danger-hi' : post.mood === 'positivo' ? 'text-ok' : ''
                } opacity-90`}
              >
                {post.hashtag}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
