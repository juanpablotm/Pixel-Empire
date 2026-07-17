import {
  clampHype,
  createFounder,
  createMarketState,
  defaultPolicies,
  estimateProject,
  initialCommunityState,
  initialLegacyStats,
  initialReputation,
  initialResearchState,
  insightKey,
  isStarterTheme,
  type GameState,
} from '../core';
import { eraForWeek } from '../data/eras';
import { defaultMonetization } from '../data/monetization';
import { researchNodes } from '../data/research';

/**
 * Serialización y carga de partidas (docs/08 §7): JSON plano + localStorage,
 * con `saveVersion` y migraciones para cambios futuros de esquema.
 */

export const SAVE_VERSION = 10;
export const SAVE_STORAGE_KEY = 'pixel-empire:save';

/** Formato del guardado: el GameState envuelto con metadatos de versión. */
export interface SaveFile {
  saveVersion: number;
  state: GameState;
}

/**
 * Migraciones: la entrada N transforma un save de versión N a N+1.
 * Al cambiar el esquema de GameState: subir SAVE_VERSION y añadir aquí la
 * migración desde la versión anterior.
 */
const migrations: Record<number, (file: SaveFile) => SaveFile> = {
  // v1 (Fase 0) → v2 (Fase 1): aparecen proyectos, juegos lanzados, historial y game over.
  1: (file) => ({
    saveVersion: 2,
    state: {
      ...file.state,
      projects: [],
      releasedGames: [],
      projectCounter: 0,
      negativeWeeks: 0,
      gameOver: null,
      log: [],
    },
  }),
  // v2 (Fase 1) → v3 (Fase 2): plantilla con el fundador, pool de candidatos,
  // etapa de escala y asignación/crunch en los proyectos.
  2: (file) => {
    const founder = createFounder(file.state.seed);
    return {
      saveVersion: 3,
      state: {
        ...file.state,
        studio: { ...file.state.studio, scaleStage: 1 },
        staff: [founder],
        candidates: [],
        projects: file.state.projects.map((p) => ({
          ...p,
          assignedStaff: [founder.id],
          crunch: false,
        })),
      },
    };
  },
  // v3 (Fase 2) → v4 (Fase 3): estado del mercado, hype en proyectos y
  // reseñas por segmento en los juegos lanzados (docs/04).
  3: (file) => ({
    saveVersion: 4,
    state: {
      ...file.state,
      market: createMarketState(file.state.week),
      projects: file.state.projects.map((p) => ({ ...p, hype: 0 })),
      releasedGames: file.state.releasedGames.map((g) => ({
        ...g,
        // Los juegos antiguos no tenían segmentos: todos heredan la reseña única.
        reviewsBySegment: {
          critica: g.review,
          prensa: g.review,
          hardcore: g.review,
          casual: g.review,
        },
        reviewMarket: { base: g.review, modaBonus: 0, hypePenalty: 0 },
        hypeAtRelease: 0,
        saturationAtRelease: 0,
      })),
    },
  }),
  // v4 (Fase 3) → v5 (Fase 4): reputación segmentada, deuda moral, préstamos,
  // escándalos/regulación, stats de legado, libro de caja y monetización
  // (los juegos y proyectos antiguos heredan el modelo premium honesto).
  4: (file) => {
    const stats = initialLegacyStats();
    const totalRevenue = file.state.releasedGames.reduce((sum, g) => sum + g.totalRevenue, 0);
    return {
      saveVersion: 5,
      state: {
        ...file.state,
        studio: {
          ...file.state.studio,
          reputation: initialReputation(),
          reputationDebt: 0,
          debtBySource: {},
          moralDrift: 0,
        },
        loanPrincipal: 0,
        scandals: [],
        regulation: { pressure: {}, enacted: [] },
        stats: {
          ...stats,
          totalRevenue,
          peakCapital: Math.max(stats.peakCapital, file.state.studio.capital),
        },
        cashflow: [],
        projects: file.state.projects.map((p) => ({
          ...p,
          monetization: defaultMonetization(),
          marketingUsed: [],
        })),
        releasedGames: file.state.releasedGames.map((g) => ({
          ...g,
          monetization: defaultMonetization(),
          mtxRevenue: 0,
        })),
      },
    };
  },
  // v5 (Fase 4) → v6 (Fase 5): capa social (sentimiento, feed, crisis,
  // bombing, dilemas) y campaña de creadores en los proyectos (docs/07).
  5: (file) => ({
    saveVersion: 6,
    state: {
      ...file.state,
      community: initialCommunityState(),
      projects: file.state.projects.map((p) => ({
        ...p,
        creatorCampaign: [],
        overPromised: false,
      })),
    },
  }),
  // v6 (Fase 5) → v7 (Fase 6): eras completas (la era se recalcula por la
  // semana: antes nunca avanzaba), investigación, políticas y premios.
  6: (file) => ({
    saveVersion: 7,
    state: {
      ...file.state,
      era: eraForWeek(file.state.week),
      research: initialResearchState(),
      policies: defaultPolicies(),
      studio: { ...file.state.studio, awards: [], awardHype: 0 },
    },
  }),
  // v7 (Fase 6) → v8 (Fase 8.2): coste atribuible del juego para el P&L del
  // aviso "sale del mercado" (docs/17 U4) y semana de inicio del proyecto.
  // Retroactivo: los juegos viejos estiman su coste por tamaño/plataforma (sin
  // marketing, desconocido); los proyectos en curso pierden su coste dev previo
  // (arrancan el contador ahora). Los nuevos guardan el dato real.
  7: (file) => ({
    saveVersion: 8,
    state: {
      ...file.state,
      projects: file.state.projects.map((p) => ({
        ...p,
        startWeek: p.startWeek ?? file.state.week,
      })),
      releasedGames: file.state.releasedGames.map((g) => ({
        ...g,
        cost: g.cost ?? estimateProject(g.size, g.platformId).cost,
      })),
    },
  }),
  // v8 (Fase 8.2) → v9 (Fase 8.4): progresión del conocimiento (docs/17 P1/P2).
  // Migración GRACIOSA: la partida no pierde nada de lo que ya hacía. Los temas
  // ya usados (juegos lanzados + proyectos en curso) quedan investigados; cada
  // combo lanzado queda "aprendido" (su pista predictiva); y si el estudio ya
  // lanzó algún juego, se dan por reveladas las 3 facetas globales (un estudio
  // con obra a sus espaldas conoce el mercado). El descubrimiento aplica solo a
  // partidas nuevas.
  8: (file) => {
    const s = file.state;
    const usedThemes = new Set<string>();
    const insights = new Set<string>();
    for (const g of s.releasedGames) {
      usedThemes.add(g.themeId);
      insights.add(insightKey(g.themeId, g.genreId));
    }
    for (const p of s.projects) usedThemes.add(p.themeId);
    const themes = [...usedThemes].filter((id) => !isStarterTheme(id));
    const revealNodes = researchNodes.filter((n) => n.reveals).map((n) => n.id);
    const unlocked =
      s.releasedGames.length > 0
        ? [...new Set([...(s.research.unlocked ?? []), ...revealNodes])]
        : (s.research.unlocked ?? []);
    return {
      saveVersion: 9,
      state: {
        ...s,
        research: {
          ...s.research,
          themes: [...(s.research.themes ?? []), ...themes],
          insights: [...(s.research.insights ?? []), ...insights],
          unlocked,
        },
      },
    };
  },
  // v9 (Fase 8.4) → v10 (Fase 8.8): la escala pasa de 4 a 5 etapas y el avance
  // se compra (docs/18 V4). Mapeo por identidad de rol, NO destructivo:
  // 1 Garaje → 1 · 2 Estudio pequeño → 2 · 3 Consolidado → 3 "Estudio" ·
  // 4 Corporación → 5 Corporación (una corporación no se degrada; asume el
  // overhead nuevo — el rediseño va precisamente contra su "riesgo cero").
  // Si la plantilla o los proyectos en vuelo superan los aforos nuevos, no se
  // recorta nada: los topes solo bloquean CRECER (patrón docs/17 B1), y los
  // gates de tamaño solo validan al INICIAR un proyecto, así que ningún juego
  // a medias se corrompe.
  9: (file) => ({
    saveVersion: 10,
    state: {
      ...file.state,
      studio: {
        ...file.state.studio,
        scaleStage: file.state.studio.scaleStage >= 4 ? 5 : file.state.studio.scaleStage,
      },
    },
  }),
};

/**
 * Saneado defensivo tras migrar (docs/17 B1/B2): una partida guardada por un
 * build anterior al clamp único pudo dejar el hype de un proyecto por encima
 * del tope; al cargar lo devolvemos a su rango. El aforo de la oficina no se
 * "repara" borrando plantilla (sería destructivo): la etapa actual manda y
 * hireBlockReason ya impide crecer por encima del tope venga de donde venga el
 * save. Idempotente sobre saves ya sanos.
 */
function sanitizeLoadedState(state: GameState): GameState {
  let touched = false;
  const projects = state.projects.map((p) => {
    const hype = clampHype(p.hype);
    if (hype !== p.hype) touched = true;
    return hype === p.hype ? p : { ...p, hype };
  });
  return touched ? { ...state, projects } : state;
}

function isSaveFile(value: unknown): value is SaveFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  if (typeof file['saveVersion'] !== 'number') return false;
  const state = file['state'];
  if (typeof state !== 'object' || state === null) return false;
  const s = state as Record<string, unknown>;
  return typeof s['seed'] === 'number' && typeof s['week'] === 'number';
}

export function serializeSave(state: GameState): string {
  const file: SaveFile = { saveVersion: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export function deserializeSave(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isSaveFile(parsed)) {
    throw new Error('Guardado inválido: formato desconocido');
  }
  let file = parsed;
  if (file.saveVersion > SAVE_VERSION) {
    throw new Error(
      `Guardado de una versión futura (v${file.saveVersion} > v${SAVE_VERSION})`,
    );
  }
  while (file.saveVersion < SAVE_VERSION) {
    const migrate = migrations[file.saveVersion];
    if (!migrate) {
      throw new Error(`No hay migración desde la versión v${file.saveVersion}`);
    }
    file = migrate(file);
  }
  return sanitizeLoadedState(file.state);
}

export function saveToLocalStorage(state: GameState, key = SAVE_STORAGE_KEY): void {
  localStorage.setItem(key, serializeSave(state));
}

/** Devuelve el estado guardado, o null si no hay guardado. Lanza si está corrupto. */
export function loadFromLocalStorage(key = SAVE_STORAGE_KEY): GameState | null {
  const json = localStorage.getItem(key);
  return json === null ? null : deserializeSave(json);
}

/** true si existe un guardado en este navegador (sin deserializarlo). */
export function hasSave(key = SAVE_STORAGE_KEY): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
