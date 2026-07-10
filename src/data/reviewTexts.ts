import type { FactorTone, QualityFactor } from '../core/model/release';

/**
 * Textos del desglose de reseña (docs/03 §5) y frases-veredicto. Contenido
 * editable: las plantillas admiten {tema}, {genero}, {publico} y {tamano},
 * que el núcleo interpola al lanzar (core/systems/review.ts).
 */

/** Frase-veredicto por banda de reseña (se usa la primera cuyo min ≤ reseña). */
export const verdicts: readonly { min: number; text: string }[] = [
  { min: 90, text: 'Una obra maestra que definirá el género.' },
  { min: 80, text: 'Una joya honesta con algún defecto.' },
  { min: 65, text: 'Un buen juego con margen de mejora.' },
  { min: 50, text: 'Correcto, pero olvidable.' },
  { min: 35, text: 'Flojo: buenas ideas mal ejecutadas.' },
  { min: 0, text: 'Un desastre difícil de defender.' },
];

interface LineText {
  title: string;
  detail: string;
}

/** Título y detalle de cada línea del desglose, por factor y tono ✔/~/✘. */
export const factorTexts: Record<QualityFactor, Record<FactorTone, LineText>> = {
  fit: {
    good: {
      title: 'Encaje excelente',
      detail: '{tema} + {genero} + público {publico} se refuerzan entre sí',
    },
    ok: {
      title: 'Encaje razonable',
      detail: '{tema} + {genero} funciona, sin ser una combinación redonda',
    },
    bad: {
      title: 'Concepto que no encaja',
      detail: '{tema} + {genero} para público {publico} no convence a nadie',
    },
  },
  balance: {
    good: { title: 'Buen equilibrio', detail: 'Diseño/Técnica casi ideal para {genero}' },
    ok: {
      title: 'Equilibrio mejorable',
      detail: 'El reparto Diseño/Técnica se aleja del ideal de {genero}',
    },
    bad: {
      title: 'Desequilibrado',
      detail: 'Reparto Diseño/Técnica muy alejado de lo que pide {genero}',
    },
  },
  features: {
    good: {
      title: 'Alcance bien aprovechado',
      detail: 'Contenido a la altura de un proyecto {tamano}',
    },
    ok: { title: 'Alcance correcto', detail: 'Bien para un proyecto {tamano}, sin sobrar nada' },
    bad: {
      title: 'Contenido escaso',
      detail: 'Demasiado poco juego para un proyecto {tamano}',
    },
  },
  polish: {
    good: { title: 'Pulido impecable', detail: 'Sin bugs visibles; se nota el QA' },
    ok: { title: 'Algunos bugs', detail: 'Faltó pulido en la recta final' },
    bad: { title: 'Plagado de bugs', detail: 'El QA brilló por su ausencia' },
  },
  team: {
    good: { title: 'Equipo inspirado', detail: 'El buen ánimo se nota en el detalle' },
    ok: { title: 'Ejecución solvente', detail: 'Trabajo cumplidor, sin brillo extra' },
    bad: { title: 'Equipo sobrepasado', detail: 'La ejecución no acompañó a las ideas' },
  },
  innovation: {
    good: { title: 'Aire fresco', detail: 'Una combinación poco vista; la crítica lo agradece' },
    ok: { title: 'Ni innovador ni refrito', detail: 'Terreno conocido, ejecutado con oficio' },
    bad: {
      title: 'Poco innovador',
      detail: 'Otro {genero} de {tema}; el mercado empieza a cansarse',
    },
  },
};

/** Etiquetas legibles para interpolar en los textos. */
export const audienceLabels = {
  hardcore: 'Hardcore',
  amplio: 'Amplio',
  casual: 'Casual',
  infantil: 'Infantil',
} as const;

export const sizeLabels = {
  pequeno: 'pequeño',
  mediano: 'mediano',
  grande: 'grande',
  aaa: 'AAA',
} as const;
