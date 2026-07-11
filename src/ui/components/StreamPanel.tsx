import { getCreator, archetypeLabels } from '../../data/creators';
import { liveBugChatLines, streamChatLines } from '../../data/communityTexts';
import type { ReleasedGame, StreamResult, StreamTier } from '../../core';

/**
 * El Directo del streamer (docs/10 §7.2, versión funcional de Fase 5): cómo
 * le fue a cada creador con clave. Chat simulado por plantillas; el sello
 * CLIP'D marca el bug viral. El pulido dramático llega en Fase 7.
 */

const tierBadge: Record<StreamTier, { label: string; className: string }> = {
  exito: { label: '🔥 Explosión', className: 'bg-emerald-900/70 text-emerald-300' },
  tibio: { label: '😐 Tibio', className: 'bg-slate-800 text-slate-400' },
  desastre: { label: '💀 Contraproducente', className: 'bg-red-900/70 text-red-300' },
};

/** Selección determinista de líneas de chat: sin RNG en la UI (docs/08). */
function chatFor(stream: StreamResult, index: number): string[] {
  const base = streamChatLines[stream.tier];
  const rotated = [...base.slice(index % base.length), ...base.slice(0, index % base.length)];
  const lines = rotated.slice(0, 4);
  if (stream.liveBug) lines.splice(1, 0, ...liveBugChatLines.slice(0, 3));
  return lines;
}

function factorTone(value: number): string {
  return value >= 0.75 ? 'text-emerald-400' : value >= 0.5 ? 'text-amber-300' : 'text-red-400';
}

function StreamCard({ stream, index }: { stream: StreamResult; index: number }) {
  const creator = getCreator(stream.creatorId);
  const badge = tierBadge[stream.tier];

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      {stream.liveBug && (
        <span className="absolute -right-2 -top-2 rotate-6 rounded bg-red-600 px-2 py-0.5 text-xs font-black tracking-widest text-white shadow-lg">
          CLIP&apos;D 📎
        </span>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100">{creator.name}</p>
          <p className="text-xs text-slate-500">{archetypeLabels[creator.archetype]}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* resultadoCreador = fit × calidad × bugs (docs/07 §3), legible. */}
      <p className="flex flex-wrap gap-x-3 text-xs tabular-nums text-slate-400">
        <span className={factorTone(stream.fit)}>fit {Math.round(stream.fit * 100)} %</span>
        <span className={factorTone(stream.qualityFactor)}>
          calidad {Math.round(stream.qualityFactor * 100)} %
        </span>
        <span className={factorTone(stream.bugFactor)}>
          estabilidad {Math.round(stream.bugFactor * 100)} %
        </span>
        <span className="text-slate-300">→ resultado {Math.round(stream.outcome * 100)} %</span>
      </p>

      {/* Chat en vivo simulado (docs/10 §7.2). */}
      <ul className="flex flex-col gap-0.5 rounded bg-slate-900 px-3 py-2 text-xs">
        {chatFor(stream, index).map((line, i) => (
          <li key={i} className={stream.liveBug && liveBugChatLines.includes(line) ? 'text-red-300' : 'text-slate-400'}>
            <span className="mr-1 font-semibold text-slate-600">chat:</span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StreamPanel({ game }: { game: ReleasedGame }) {
  const streams = game.streams ?? [];
  if (streams.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        «{game.name}» se lanzó sin campaña de creadores: nadie lo jugó en directo.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {streams.map((stream, i) => (
        <StreamCard key={stream.creatorId} stream={stream} index={i} />
      ))}
    </div>
  );
}
