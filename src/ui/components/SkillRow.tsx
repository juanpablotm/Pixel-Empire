import type { Specialty } from '../../core';
import { specialtyLabels } from '../../data/staffTexts';

/**
 * Fila de skills con la ESPECIALIDAD destacada (docs/10 §10.6): las cuatro
 * disciplinas con su nivel, marcando en cuál destaca la persona.
 *
 * El destaque NO puede ser un salto de luminosidad (docs/18 V1). Antes la
 * especialidad iba en text-ink y el resto en text-ink-mute, y eso solo se lee
 * en las pieles oscuras: en E3 (beige) los dos tokens quedaban a 1,38:1 —
 * invisible. Y no se arregla aclarando el mute, porque en E3 ese token ya roza
 * el mínimo AA contra el escritorio (ver la nota de .era-E3 en ui/index.css):
 * está encajonado entre dos requisitos opuestos.
 *
 * Así que la marca es una FORMA, no un tono: un chip con superficie propia y
 * borde, que se recorta igual sobre fósforo verde, beige de los 90 o cristal
 * de E7. El peso y la tinta fuerte acompañan; ninguna piel tiene que ceder
 * contraste. Presentación pura, compartida por la tarjeta de empleado y la de
 * candidato para que el destaque sea idéntico en ambas.
 */
export function SkillRow({
  specialty,
  skills,
}: {
  specialty: Specialty;
  skills: Record<Specialty, number>;
}) {
  return (
    // data-skill-row / data-specialty: anclaje estable para scripts/aa-audit.mjs,
    // que mide el contraste del destaque en las 7 pieles.
    <div data-skill-row className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
      {(Object.entries(specialtyLabels) as [Specialty, string][]).map(([spec, label]) => {
        const isSpecialty = spec === specialty;
        return (
          <span
            key={spec}
            data-specialty={isSpecialty ? '' : undefined}
            title={isSpecialty ? `Especialidad: ${label}` : undefined}
            className={
              isSpecialty
                ? 'rounded border border-line-hi bg-raised px-1.5 py-0.5 font-semibold text-ink-hi'
                : 'px-1.5 py-0.5'
            }
          >
            {label} <span className="tabular-nums">{Math.round(skills[spec])}</span>
            {isSpecialty && <span className="sr-only"> (especialidad)</span>}
          </span>
        );
      })}
    </div>
  );
}
