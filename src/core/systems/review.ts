import { balance } from '../../data/balance';
import { getGenre } from '../../data/genres';
import { getTheme } from '../../data/themes';
import { audienceLabels, factorTexts, sizeLabels, verdicts } from '../../data/reviewTexts';
import type { Audience, ProjectSize } from '../model/project';
import type { FactorTone, QualityBreakdown, ReviewLine } from '../model/release';

/**
 * De Q a reseña legible (docs/03 §5). En Fase 1 la reseña pública es igual a Q:
 * las modas, el hype y los segmentos (docs/04) la modularán en la Fase 3.
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

/** Construye el desglose legible, una línea por factor (docs/03 §5). */
export function buildReviewLines(
  breakdown: QualityBreakdown,
  subject: ReviewSubject,
): ReviewLine[] {
  const vars = {
    tema: getTheme(subject.themeId).name,
    genero: getGenre(subject.genreId).name,
    publico: audienceLabels[subject.audience],
    tamano: sizeLabels[subject.size],
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
