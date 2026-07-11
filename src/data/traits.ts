import type { Trait } from '../core/model/content';

/**
 * Rasgos de personalidad, lista base cerrada (docs/05 §3 y docs/09 §6).
 * Los rasgos modifican output, calidad, bugs, crunch y química; los efectos
 * de hype (estrella mediática) se activan en Fase 5 (docs/07).
 */
export const traits: readonly Trait[] = [
  {
    id: 'perfeccionista',
    name: 'Perfeccionista',
    description: 'Más calidad y menos bugs, pero más lento; el crunch le hunde la moral.',
    modifiers: { qualityBonus: 0.06, speed: 0.9, bugRisk: -0.01, crunchSensitivity: 1.5 },
  },
  {
    id: 'rapidoDescuidado',
    name: 'Rápido pero descuidado',
    description: 'Produce más por semana… y también más bugs.',
    modifiers: { speed: 1.15, bugRisk: 0.02 },
  },
  {
    id: 'visionario',
    name: 'Visionario',
    description: 'Aporta innovación; brilla en proyectos originales, se aburre clonando.',
    modifiers: { innovation: 0.03 },
  },
  {
    id: 'estrellaMediatica',
    name: 'Estrella mediática',
    description: 'Su nombre genera expectación; su ego choca con otras estrellas.',
    modifiers: { hypeBonus: 0.2 },
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Acelera el crecimiento de los juniors que trabajan a su lado.',
    modifiers: { mentorBonus: 0.5 },
  },
  {
    id: 'llaneroSolitario',
    name: 'Llanero solitario',
    description: 'Rinde bien, pero encaja mal en equipos grandes.',
    modifiers: { synergy: -0.04 },
  },
  {
    id: 'sensibleCrunch',
    name: 'Sensible al crunch',
    description: 'El crunch le afecta el doble (moral y energía).',
    modifiers: { crunchSensitivity: 2 },
  },
  {
    id: 'workaholic',
    name: 'Workaholic',
    description: 'Tolera el crunch mejor que nadie… hasta que colapsa.',
    modifiers: { crunchSensitivity: 0.5 },
  },
  {
    id: 'generalista',
    name: 'Generalista',
    description: 'Skills parejas en todas las disciplinas; nunca desentona.',
    modifiers: {},
  },
  {
    id: 'especialistaObsesivo',
    name: 'Especialista obsesivo',
    description: 'Domina su disciplina como nadie; del resto, ni le hables.',
    modifiers: { qualityBonus: 0.04 },
  },
];

export function getTrait(id: string): Trait {
  const trait = traits.find((t) => t.id === id);
  if (!trait) throw new Error(`Rasgo desconocido: ${id}`);
  return trait;
}
