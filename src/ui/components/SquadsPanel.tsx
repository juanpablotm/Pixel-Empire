import { useState } from 'react';
import type { Squad } from '../../core';
import { balance } from '../../data/balance';
import { specialtyLabels } from '../../data/staffTexts';
import { useGameStore } from '../../state/store';
import { Avatar } from './Avatar';

/**
 * Subequipos (docs/18 V5, docs/10 §10.6): grupos nombrados que se asignan a un
 * proyecto de una sola acción, en vez de persona a persona. Solo muestra y
 * despacha: crear/renombrar/editar/disolver/asignar viven en
 * core/systems/squads.ts.
 *
 * Ojo con los selectores: `game.squads` es opcional, así que el `?? []` va en
 * el render. Hacerlo dentro del selector crearía un array nuevo por render y
 * Zustand compara por referencia → bucle infinito (trampa de la 8.5).
 */

function SquadCard({ squad }: { squad: Squad }) {
  const staff = useGameStore((s) => s.game.staff);
  const projects = useGameStore((s) => s.game.projects);
  const renameSquad = useGameStore((s) => s.renameSquad);
  const setSquadMembers = useGameStore((s) => s.setSquadMembers);
  const disbandSquad = useGameStore((s) => s.disbandSquad);
  const assignSquadToProject = useGameStore((s) => s.assignSquadToProject);

  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(squad.name);
  const [target, setTarget] = useState('');

  const members = staff.filter((e) => squad.memberIds.includes(e.id));
  const targetId = target !== '' ? target : (projects[0]?.id ?? '');
  const reason =
    members.length === 0
      ? 'Este subequipo no tiene a nadie'
      : projects.length === 0
        ? 'No hay ningún proyecto en desarrollo'
        : null;

  const commitRename = () => {
    const clean = draftName.trim();
    if (clean !== '' && clean !== squad.name) renameSquad(squad.id, clean);
    else setDraftName(squad.name);
    setRenaming(false);
  };

  return (
    <article
      aria-label={`Subequipo ${squad.name}`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            aria-label={`Nombre de ${squad.name}`}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftName(squad.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-line-hi bg-raised px-2 py-1 text-sm text-ink-hi"
          />
        ) : (
          <h4 className="font-semibold text-ink-hi">{squad.name}</h4>
        )}
        <span className="text-xs text-ink-mute">
          {members.length} {members.length === 1 ? 'persona' : 'personas'}
        </span>
      </div>

      {members.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {members.map((e) => (
            <span key={e.id} title={`${e.name} · ${specialtyLabels[e.specialty]}`}>
              <Avatar seed={e.avatarSeed} size={32} />
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-faint">Vacío: añade gente con «Editar».</p>
      )}

      {/* Editar miembros: quien entra aquí sale de su subequipo anterior. */}
      {editing && (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded border border-line bg-raised/40 p-2 scroll-slim">
          {staff.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                className="accent-action-hi"
                checked={squad.memberIds.includes(e.id)}
                onChange={(ev) =>
                  setSquadMembers(
                    squad.id,
                    ev.target.checked
                      ? [...squad.memberIds, e.id]
                      : squad.memberIds.filter((id) => id !== e.id),
                  )
                }
              />
              {e.name}
              <span className="text-ink-faint">{specialtyLabels[e.specialty]}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {projects.length > 1 && (
          <select
            aria-label={`Proyecto de destino para ${squad.name}`}
            value={targetId}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded border border-line-hi bg-raised px-2 py-1 text-xs text-ink"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={reason !== null}
          title={reason ?? `Mueve a las ${members.length} personas de una vez`}
          onClick={() => assignSquadToProject(squad.id, targetId)}
          className="rounded bg-action px-2 py-1 text-xs font-medium text-oncolor hover:bg-action-hi disabled:cursor-not-allowed disabled:bg-control disabled:text-ink-faint"
        >
          {projects.length > 1
            ? 'Asignar al proyecto'
            : `Asignar a «${projects[0]?.name ?? '—'}»`}
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded bg-control px-2 py-1 text-xs font-medium text-ink hover:bg-control-hi"
        >
          {editing ? 'Listo' : 'Editar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraftName(squad.name);
            setRenaming(true);
          }}
          className="rounded bg-control px-2 py-1 text-xs font-medium text-ink hover:bg-control-hi"
        >
          Renombrar
        </button>
        <button
          type="button"
          title="Deshace el grupo; nadie cambia de proyecto ni se va del estudio."
          onClick={() => disbandSquad(squad.id)}
          className="rounded bg-danger/15 px-2 py-1 text-xs font-medium text-danger-hi hover:bg-danger/25"
        >
          Disolver
        </button>
      </div>
      {reason && <p className="text-xs text-ink-faint">{reason}</p>}
    </article>
  );
}

export function SquadsPanel() {
  // Referencia del estado, nunca un array nuevo: el `?? []` va abajo.
  const squadsRaw = useGameStore((s) => s.game.squads);
  const createSquad = useGameStore((s) => s.createSquad);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const squads = squadsRaw ?? [];
  const full = squads.length >= balance.staff.squads.maxSquads;

  const commit = () => {
    const clean = name.trim();
    if (clean === '') return;
    createSquad(clean);
    setName('');
    setCreating(false);
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Subequipos">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">Subequipos</h3>
        {!creating && (
          <button
            type="button"
            disabled={full}
            title={full ? `Máximo ${balance.staff.squads.maxSquads} subequipos` : undefined}
            onClick={() => setCreating(true)}
            className="rounded-md bg-raised px-3 py-1.5 text-sm text-ink hover:bg-control disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            + Nuevo subequipo
          </button>
        )}
      </div>

      {creating && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-hi bg-panel/60 p-3">
          <input
            autoFocus
            aria-label="Nombre del subequipo"
            placeholder="Equipo A, Motor gráfico…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setName('');
                setCreating(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-line-hi bg-raised px-2 py-1 text-sm text-ink-hi"
          />
          <button
            type="button"
            onClick={commit}
            disabled={name.trim() === ''}
            className="rounded bg-action px-3 py-1 text-xs font-medium text-oncolor hover:bg-action-hi disabled:cursor-not-allowed disabled:bg-control disabled:text-ink-faint"
          >
            Crear
          </button>
          <button
            type="button"
            onClick={() => {
              setName('');
              setCreating(false);
            }}
            className="rounded bg-control px-3 py-1 text-xs font-medium text-ink hover:bg-control-hi"
          >
            Cancelar
          </button>
        </div>
      )}

      {squads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-hi bg-panel/40 p-4 text-sm text-ink-mute">
          Agrupa a tu gente bajo un nombre («Equipo A», «Motor gráfico») y asígnala a un proyecto de
          una sola vez, en vez de persona a persona. Agrupar no cambia nada del rendimiento: solo te
          ahorra clics.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {squads.map((squad) => (
            <SquadCard key={squad.id} squad={squad} />
          ))}
        </div>
      )}
    </section>
  );
}
