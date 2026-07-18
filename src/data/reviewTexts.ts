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
  // --- Fase 9.1: techo dinámico, alcance y ajustes de mercado ---------------
  // {limite} lo compone review.ts según el techo parcial que manda (madurez /
  // estrella del rol clave / I+D / era); {techo}, {fatiga} y {banda} son números.
  ceiling: {
    good: {
      title: 'Sin techo a la vista',
      detail: 'Un estudio hecho y derecho: el listón de lo posible ronda {techo}',
    },
    ok: { title: 'Techo a la vista', detail: 'Hoy {limite} deja el listón de lo posible en {techo}' },
    bad: { title: 'Techo bajo', detail: 'Hoy {limite} deja el listón de lo posible en {techo}' },
  },
  scope: {
    good: { title: 'Ambición cubierta', detail: 'El equipo llena de sobra un proyecto {tamano}' },
    ok: { title: 'Alcance justo', detail: 'Al equipo le cuesta llenar un proyecto {tamano}' },
    bad: {
      title: 'La ambición queda grande',
      detail: 'Un proyecto {tamano} exige mucho más equipo del que tiene el estudio',
    },
  },
  eraBar: {
    good: {
      title: 'Adelantado a su tiempo',
      detail: 'Por encima de lo que el público de la época espera',
    },
    ok: {
      title: 'A la altura de su tiempo',
      detail: 'Cumple lo que el público de hoy espera, sin más',
    },
    bad: { title: 'Por detrás de su tiempo', detail: 'El público de hoy espera bastante más' },
  },
  fatigue: {
    good: { title: 'Fórmula fresca', detail: 'Nadie está cansado de esta combinación' },
    ok: {
      title: 'Fórmula repetida',
      detail: 'Otro {genero} de {tema} tan pronto; el público bosteza (−{fatiga})',
    },
    bad: {
      title: 'Fórmula agotada',
      detail: 'El mercado está harto de {genero} de {tema} (−{fatiga})',
    },
  },
  band: {
    good: {
      title: 'El humor del mercado, a favor',
      detail: 'A la crítica le pilló de buenas (+{banda})',
    },
    ok: { title: 'Gusto neutral', detail: 'Ni viento a favor ni en contra esta semana' },
    bad: {
      title: 'El humor del mercado, en contra',
      detail: 'A la crítica no le entró este juego (−{banda})',
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
  muyGrande: 'muy grande',
  aaa: 'AAA',
} as const;

/**
 * Motivos por los que un tamaño de proyecto está bloqueado (docs/17 E1). El
 * núcleo (projects.ts, sizeBlockReason) elige cuál mostrar según el requisito
 * que falte (etapa de escala o plantilla); la UI solo lo muestra y atenúa el
 * botón. Copy centralizado, como hireBlockedLabels para la contratación (B1).
 */
export const sizeBlockedLabels = {
  stage: (stageName: string) => `Necesitas ser ${stageName}`,
  staff: (n: number) => `Necesitas ${n} personas en plantilla`,
} as const;
