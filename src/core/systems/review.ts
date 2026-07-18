import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { audienceLabels, factorTexts, sizeLabels, verdicts } from '../../data/reviewTexts';
import { specialtyLabels } from '../../data/staffTexts';
import type { ReviewMarketInfo } from '../model/market';
import type { Audience, ProjectSize } from '../model/project';
import type { FactorTone, QualityBreakdown, ReviewLine } from '../model/release';
import type { Specialty } from '../model/staff';

/**
 * De Q a reseña legible (docs/03 §5). Desde 9.1 el desglose también explica
 * el techo dinámico, el encaje de alcance y los ajustes de mercado (listón de
 * la época, fatiga de fórmula y banda de gusto): la nota deja de ser una
 * calculadora, pero SIEMPRE se puede explicar en una frase (Pilar 2).
 */

interface ReviewSubject {
  themeId: string;
  genreId: string;
  audience: Audience;
  size: ProjectSize;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

/** Tono ✔/~/✘ de un factor 0..1 con los umbrales genéricos del desglose. */
function tone01(value: number): FactorTone {
  if (value >= balance.reviews.goodThreshold) return 'good';
  if (value >= balance.reviews.okThreshold) return 'ok';
  return 'bad';
}

function toneWith(value: number, good: number, ok: number): FactorTone {
  if (value >= good) return 'good';
  if (value >= ok) return 'ok';
  return 'bad';
}

/** Qué limita hoy el techo, en palabras (para la línea 'ceiling' del desglose). */
function ceilingLimitLabel(binding: NonNullable<QualityBreakdown['capBinding']>, rol: string): string {
  switch (binding) {
    case 'madurez':
      return 'la juventud del estudio';
    case 'talento':
      return `la falta de una estrella de ${rol}`;
    // Desde 9.2 el término tecnológico es el MOTOR del proyecto (la clave
    // 'tech' se conserva por los desgloses guardados).
    case 'tech':
      return 'un motor que se queda corto para esta ambición';
    case 'era':
      return 'la tecnología de la época';
  }
}

/**
 * Construye el desglose legible, una línea por factor (docs/03 §5). Con el
 * contexto de 9.1 añade las líneas de techo dinámico y alcance (si el
 * breakdown las trae) y las de mercado (listón de época, fatiga, banda).
 */
export function buildReviewLines(
  breakdown: QualityBreakdown,
  subject: ReviewSubject,
  market?: ReviewMarketInfo,
): ReviewLine[] {
  const rol =
    breakdown.keySpecialty !== undefined
      ? specialtyLabels[breakdown.keySpecialty as Specialty]
      : '';
  const vars = {
    tema: getTheme(subject.themeId).name,
    genero: getGenre(subject.genreId).name,
    publico: audienceLabels[subject.audience],
    tamano: sizeLabels[subject.size],
    techo: String(breakdown.qualityCap),
    limite:
      breakdown.capBinding !== undefined ? ceilingLimitLabel(breakdown.capBinding, rol) : '',
    fatiga: String(Math.round(market?.fatiga ?? 0)),
    banda: String(Math.abs(market?.banda ?? 0)),
  };
  const r = balance.reviews;

  const tones: { factor: ReviewLine['factor']; tone: FactorTone }[] = [
    { factor: 'fit', tone: tone01(breakdown.fit) },
    { factor: 'balance', tone: tone01(breakdown.balanceScore) },
    { factor: 'features', tone: tone01(breakdown.featureScore) },
    {
      factor: 'polish',
      tone: toneWith(breakdown.polishScore, r.polishGoodThreshold, r.polishOkThreshold),
    },
    { factor: 'team', tone: toneWith(breakdown.teamFactor, r.teamGoodThreshold, r.teamOkThreshold) },
    {
      factor: 'innovation',
      tone: toneWith(breakdown.innovationMod, r.innovationGoodThreshold, r.innovationOkThreshold),
    },
  ];

  // Techo dinámico y alcance (9.1): solo cuando el breakdown trae el contexto
  // (los juegos de saves previos no lo llevan y su desglose sigue válido).
  if (breakdown.capParts !== undefined) {
    tones.push({
      factor: 'ceiling',
      tone: toneWith(breakdown.qualityCap, r.ceilingGoodThreshold, r.ceilingOkThreshold),
    });
  }
  if (breakdown.alcance01 !== undefined) {
    tones.push({
      factor: 'scope',
      tone: toneWith(breakdown.alcance01, r.scopeGoodThreshold, r.scopeOkThreshold),
    });
  }

  // Ajustes de mercado (9.1): listón de la época (sin revelar el número),
  // fatiga de fórmula (solo si pega) y banda de gusto (siempre, es la que
  // explica por qué la nota no es una calculadora).
  if (market !== undefined) {
    const eraDelta = market.eraDelta ?? 0;
    tones.push({
      factor: 'eraBar',
      tone: eraDelta >= r.eraBarGoodDelta ? 'good' : eraDelta >= r.eraBarOkDelta ? 'ok' : 'bad',
    });
    const fatiga = market.fatiga ?? 0;
    if (fatiga >= 1) {
      tones.push({ factor: 'fatigue', tone: fatiga < r.fatigueBadPoints ? 'ok' : 'bad' });
    }
    const banda = market.banda ?? 0;
    tones.push({ factor: 'band', tone: banda > 0 ? 'good' : banda === 0 ? 'ok' : 'bad' });
  }

  return tones.map(({ factor, tone }) => {
    const text = factorTexts[factor][tone];
    return {
      factor,
      tone,
      title: text.title,
      detail: interpolate(text.detail, vars),
    };
  });
}

/** Frase-veredicto por banda de reseña (data/reviewTexts.ts). */
export function reviewVerdict(review: number): string {
  const entry = verdicts.find((v) => review >= v.min);
  return entry ? entry.text : verdicts[verdicts.length - 1].text;
}
