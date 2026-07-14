import { getCreator, archetypeLabels } from '../../data/creators';
import { liveBugChatLines, streamChatLines } from '../../data/communityTexts';
import type { ReleasedGame, StreamResult, StreamTier } from '../../core';
import { hashString } from '../motion';
import { Avatar } from './Avatar';
import { GameCover } from './GameCover';

/**
 * El Directo del streamer (docs/10 §7.2, innovación I4): panel tipo Twitch
 * donde el creador "juega tu juego en vivo": pantalla con sello EN DIRECTO,
 * espectadores, y un chat que va entrando mensaje a mensaje (stagger CSS).
 * El bug en directo congela el vídeo en estática y estampa el CLIP'D.
 * Determinista: chat por plantillas y hashes, sin RNG en la UI (docs/08).
 */

const tierBadge: Record<StreamTier, { label: string; className: string }> = {
  exito: { label: '🔥 Explosión', className: 'bg-ok/20 text-ok' },
  tibio: { label: '😐 Tibio', className: 'bg-raised text-ink-mute' },
  desastre: { label: '💀 Contraproducente', className: 'bg-danger/20 text-danger-hi' },
};

/** Nicks y colores del chat (sabor visual determinista, docs/10 §7.2). */
const CHAT_HANDLES = [
  'pixel_pau',
  'rgb_rita',
  'NoScopeNico',
  'combo_bro',
  'lurker42',
  'gg_ana',
  'tecla_travi',
  'modo_foto',
];
const HANDLE_COLORS = ['#5b8ef5', '#43b96f', '#a06bf0', '#f09a3f', '#e8b44a', '#22d3ee'];

/** Selección determinista de líneas de chat: sin RNG en la UI (docs/08). */
function chatFor(stream: StreamResult, index: number): string[] {
  const base = streamChatLines[stream.tier];
  const rotated = [...base.slice(index % base.length), ...base.slice(0, index % base.length)];
  const lines = rotated.slice(0, 4);
  if (stream.liveBug) lines.splice(1, 0, ...liveBugChatLines.slice(0, 3));
  return lines;
}

function factorTone(value: number): string {
  return value >= 0.75 ? 'text-ok' : value >= 0.5 ? 'text-warn' : 'text-danger';
}

/** La "pantalla" del directo: gameplay, sello LIVE, espectadores y el clip fatal. */
function StreamScreen({ stream, game }: { stream: StreamResult; game: ReleasedGame }) {
  const creator = getCreator(stream.creatorId);
  const viewers = Math.round(creator.reach * (0.4 + stream.outcome));

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-[#0b0e14]">
      {/* el "gameplay": la portada en juego + ecualizador de actividad */}
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <div className="-rotate-3">
          <GameCover game={game} width={52} />
        </div>
        <div className="flex h-10 items-end gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`stream-play block w-1.5 rounded-sm ${stream.tier === 'desastre' ? 'bg-danger/70' : 'bg-skin-accent/80'}`}
              style={{
                height: `${10 + ((hashString(`${stream.creatorId}:${i}`) >> 4) % 22)}px`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${0.55 + (i % 3) * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-danger-deep px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-oncolor">
        <span className="stream-live-dot h-1.5 w-1.5 rounded-full bg-oncolor" aria-hidden />
        En directo
      </span>
      <span className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs tabular-nums text-white/90">
        👁 {viewers.toLocaleString('es-ES')}
      </span>

      <span className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/50 py-0.5 pl-0.5 pr-2 text-xs text-white/90">
        <Avatar seed={creator.id} size={22} />
        {creator.name}
      </span>

      {/* Bug en directo (docs/07 §3): el vídeo "se congela" y cae el sello */}
      {stream.liveBug && (
        <>
          <div
            aria-hidden
            className="stream-static absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 5px, rgba(255,255,255,0.05) 5px 6px)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="stream-clip rounded border-4 border-danger-hi px-3 py-1 text-2xl font-black tracking-widest text-danger-hi shadow-lg">
              CLIP&apos;D 📎
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function StreamCard({ stream, game, index }: { stream: StreamResult; game: ReleasedGame; index: number }) {
  const creator = getCreator(stream.creatorId);
  const badge = tierBadge[stream.tier];
  const lines = chatFor(stream, index);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-scrim p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-hi">{creator.name}</p>
          <p className="text-xs text-ink-faint">{archetypeLabels[creator.archetype]}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <StreamScreen stream={stream} game={game} />

      {/* resultadoCreador = fit × calidad × bugs (docs/07 §3), legible. */}
      <p className="flex flex-wrap gap-x-3 text-xs tabular-nums text-ink-mute">
        <span className={factorTone(stream.fit)}>fit {Math.round(stream.fit * 100)} %</span>
        <span className={factorTone(stream.qualityFactor)}>
          calidad {Math.round(stream.qualityFactor * 100)} %
        </span>
        <span className={factorTone(stream.bugFactor)}>
          estabilidad {Math.round(stream.bugFactor * 100)} %
        </span>
        <span className="text-ink">→ resultado {Math.round(stream.outcome * 100)} %</span>
        {stream.salesBoost > 0 && (
          <span className="text-ok">+{Math.round(stream.salesBoost * 100)} % al pico</span>
        )}
      </p>

      {/* Chat en vivo: los mensajes van llegando (docs/10 §7.2). */}
      <ul className="flex flex-col gap-1 rounded bg-panel px-3 py-2 text-xs">
        {lines.map((line, i) => {
          const isBugLine = stream.liveBug && liveBugChatLines.includes(line);
          const h = hashString(`${stream.creatorId}:${index}:${i}`);
          return (
            <li
              key={i}
              className={`stream-chat-line ${isBugLine ? 'text-danger-hi' : 'text-ink-mute'}`}
              style={{ animationDelay: `${(0.4 + i * 0.55).toFixed(2)}s` }}
            >
              <span
                className="mr-1 font-semibold"
                style={{ color: HANDLE_COLORS[h % HANDLE_COLORS.length] }}
              >
                {CHAT_HANDLES[h % CHAT_HANDLES.length]}:
              </span>
              {line}
              {isBugLine && ' 📎'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StreamPanel({ game }: { game: ReleasedGame }) {
  const streams = game.streams ?? [];
  if (streams.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        «{game.name}» se lanzó sin campaña de creadores: nadie lo jugó en directo.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {streams.map((stream, i) => (
        <StreamCard key={stream.creatorId} stream={stream} game={game} index={i} />
      ))}
    </div>
  );
}
