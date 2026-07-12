import type { CommunityPost } from '../../core';

/**
 * El Feed de la comunidad "Chirp" (docs/10 §7.3): posts generados por
 * plantillas con sentimiento coloreado y hashtags. Solo muestra.
 */

const moodStyles: Record<CommunityPost['mood'], string> = {
  positivo: 'border-ok/40 bg-ok/10 text-ink',
  negativo: 'border-danger/40 bg-danger/10 text-ink',
  neutro: 'border-line bg-panel/60 text-ink',
};

export function CommunityFeed({ posts, limit = 12 }: { posts: readonly CommunityPost[]; limit?: number }) {
  const visible = [...posts].reverse().slice(0, limit);

  if (visible.length === 0) {
    return <p className="text-sm text-ink-faint">El foro está en silencio. De momento.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {visible.map((post, i) => (
        <li
          key={`${post.week}-${i}`}
          className={`rounded-md border px-3 py-2 text-sm ${moodStyles[post.mood]}`}
        >
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs opacity-70">
            <span className="font-semibold">{post.author}</span>
            <span className="shrink-0 tabular-nums">S{post.week}</span>
          </div>
          <p>{post.text}</p>
          {post.hashtag && (
            <span className="mt-1 inline-block text-xs font-semibold opacity-80">{post.hashtag}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
