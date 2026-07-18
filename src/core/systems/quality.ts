import { balance } from '../../data/balance';
import { getAudienceGenreAffinity, getThemeGenreAffinity } from '../../data/affinity';
import { getFeature } from '../../data/features';
import { getGenre } from '../../data/genres';
import { getPlatform } from '../../data/platforms';
import type { EraId } from '../model/era';
import type { Audience, Project } from '../model/project';
import type { QualityBreakdown } from '../model/release';
import type { CeilingContext } from './maturity';

/**
 * Sistema de Calidad Transparente (docs/03): produce la Calidad Real Q (0–100)
 * y su descomposición legible. Funciones puras; los pesos viven en data/balance.ts.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Concepto mínimo para calcular el Fit en vivo durante la concepción. */
export interface ConceptDraft {
  themeId: string;
  genreId: string;
  platformId: string;
  audience: Audience;
}

export interface FitResult {
  fit: number;
  parts: { themeGenre: number; genrePlatform: number; audience: number };
}

/** Factor A — Fit (docs/03): media ponderada de las afinidades del concepto. */
export function computeFit(concept: ConceptDraft): FitResult {
  const platform = getPlatform(concept.platformId);
  const parts = {
    themeGenre: getThemeGenreAffinity(concept.themeId, concept.genreId),
    genrePlatform: platform.genreAffinity[concept.genreId] ?? 0.5,
    audience: getAudienceGenreAffinity(concept.audience, concept.genreId),
  };
  const w = balance.quality.fitWeights;
  const fit =
    (w.themeGenre * parts.themeGenre +
      w.genrePlatform * parts.genrePlatform +
      w.audience * parts.audience) /
    (w.themeGenre + w.genrePlatform + w.audience);
  return { fit, parts };
}

/** Banda del medidor de Fit: orienta sin exponer el número crudo (docs/03 factor A). */
export type FitBand = 'verde' | 'ambar' | 'rojo';

export function fitBand(fit: number): FitBand {
  if (fit >= balance.reviews.fitMeter.verde) return 'verde';
  if (fit >= balance.reviews.fitMeter.ambar) return 'ambar';
  return 'rojo';
}

/** Contexto que la calidad necesita y que no vive en el proyecto. */
export interface QualityContext {
  era: EraId;
  /** Factor E: teamFactor real del equipo asignado (core/systems/staff.ts). */
  teamFactor: number;
  /** Lanzamientos previos del estudio con la misma combinación tema×género. */
  comboRepeats: number;
  /** Aporte de rasgos del equipo (Visionarios) al innovationMod (docs/05 §3). */
  innovationBonus?: number;
  /**
   * Techo dinámico + encaje de alcance (Fase 9.1, core/systems/maturity.ts).
   * Opcional: sin él solo aplica la envolvente de era (tests de composición
   * y breakdowns antiguos siguen valiendo); releaseProject SIEMPRE lo pasa.
   */
  ceiling?: CeilingContext;
}

/** Nivel de bugs actual: clamp(deudaBugs − inversiónQA, 0, 1) (docs/03 factor D). */
export function computeBugLevel(bugDebt: number, qaInvested: number): number {
  return clamp(bugDebt - qaInvested, 0, 1);
}

/** Balance real de Diseño (dReal) según los puntos acumulados; 0.5 si aún no hay trabajo. */
export function realDesignShare(designPoints: number, techPoints: number): number {
  const total = designPoints + techPoints;
  return total > 0 ? designPoints / total : 0.5;
}

/**
 * Calidad Real Q (docs/03 §3, techo dinámico desde 9.1):
 *   base = (wF·fit + wB·balance + wC·features + wD·polish) / Σw
 *   Q = 100 × clamp(base × teamFactor × innovationMod × alcanceFactor, 0, 1),
 *   con techoQ = min(capEra, capMadurez, capTalento, capTech).
 */
export function computeQuality(
  project: Project,
  ctx: QualityContext,
): { q: number; breakdown: QualityBreakdown } {
  const genre = getGenre(project.genreId);

  // Factor A — Fit
  const { fit, parts: fitParts } = computeFit(project);

  // Factor B — Balance Diseño/Técnica
  const dReal = realDesignShare(project.designPoints, project.techPoints);
  const tReal = 1 - dReal;
  const balanceScore =
    1 - (Math.abs(dReal - genre.idealDesign) + Math.abs(tReal - genre.idealTech)) / 2;

  // Factor C — Features y alcance
  const featureValue = project.chosenFeatureIds.reduce(
    (sum, id) => sum + getFeature(id).qualityValue,
    0,
  );
  const featureScore = Math.min(1, featureValue / balance.quality.featureScopeTarget[project.size]);

  // Factor D — Pulido / bugs
  const bugLevel = computeBugLevel(project.bugDebt, project.qaInvested);
  const polishScore = 1 - bugLevel;

  // Modificador de innovación (0.9–1.15)
  const inn = balance.quality.innovation;
  const innovationMod = clamp(
    inn.freshCombo - inn.repeatStep * ctx.comboRepeats + (ctx.innovationBonus ?? 0),
    inn.min,
    inn.max,
  );

  const w = balance.quality.weights;
  const base =
    (w.fit * fit + w.balance * balanceScore + w.features * featureScore + w.polish * polishScore) /
    (w.fit + w.balance + w.features + w.polish);

  // Techo dinámico (9.1): el mínimo de los parciales manda, y se nombra.
  const capEra = balance.quality.capByEraSize[ctx.era]?.[project.size] ?? 100;
  const ceiling = ctx.ceiling;
  let qualityCap = capEra;
  let capBinding: 'era' | 'madurez' | 'talento' | 'tech' = 'era';
  if (ceiling) {
    const caps = [
      { cap: ceiling.capMadurez, binding: 'madurez' },
      { cap: ceiling.capTalento, binding: 'talento' },
      { cap: ceiling.capTech, binding: 'tech' },
    ] as const;
    for (const { cap, binding } of caps) {
      if (cap < qualityCap) {
        qualityCap = cap;
        capBinding = binding;
      }
    }
    qualityCap = Math.round(qualityCap);
  }

  const alcanceFactor = ceiling?.alcanceFactor ?? 1;
  const qRaw = 100 * clamp(base * ctx.teamFactor * innovationMod * alcanceFactor, 0, 1);
  const q = Math.round(Math.min(qRaw, qualityCap));

  return {
    q,
    breakdown: {
      fit,
      fitParts,
      balanceScore,
      dReal,
      dIdeal: genre.idealDesign,
      featureScore,
      polishScore,
      bugLevel,
      teamFactor: ctx.teamFactor,
      innovationMod,
      base,
      qualityCap,
      ...(ceiling
        ? {
            capParts: {
              era: capEra,
              madurez: Math.round(ceiling.capMadurez),
              talento: Math.round(ceiling.capTalento),
              tech: Math.round(ceiling.capTech),
            },
            capBinding,
            keySpecialty: ceiling.keySpecialty,
            alcance01: ceiling.alcance01,
            alcanceFactor: ceiling.alcanceFactor,
          }
        : {}),
    },
  };
}
