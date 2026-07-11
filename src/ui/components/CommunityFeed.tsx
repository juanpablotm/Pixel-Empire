import type { CommunityPost } from '../../core';

/**
 * El Feed de la comunidad "Chirp" (docs/10 §7.3): posts generados por
 * plantillas con sentimiento coloreado y hashtags. Solo muestra.
 */

const moodStyles: Record<CommunityPost['mood'], string> = {
  positivo: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-100',
  negativo: 'border-red-800/60 bg-red-950/40 text-red-100',
  neutro: 'border-slate-800 bg-slate-900/60 text-slate-300',
};

export function CommunityFeed({ posts, limit = 12 }: { posts: readonly CommunityPost[]; limit?: number }) {
  const visible = [...posts].reverse().slice(0, limit);

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">El foro está en silencio. De momento.</p>;
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
