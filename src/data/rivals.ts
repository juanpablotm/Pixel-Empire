import type { EraId } from '../core/model/era';
import type { RivalProfile, RivalTier } from '../core/model/rivals';

/**
 * Estudios rivales (Fase 9.5, docs/19 §9.5 y docs/04 §9): el roster de la
 * industria simulada. Los nombres son los que la gala usaba como sabor desde
 * la 8.10 (docs/18 V7) — ahora son estudios de verdad, con estado que
 * evoluciona (core/systems/rivals.ts).
 *
 * El tier es el de ENTRADA (luego crecen o decaen); `appearsInEra` escalona su
 * llegada: en E1 ya existe una industria establecida (tú eres el garaje, no el
 * mundo) y cada era suma estudios nuevos. Los números de comportamiento viven
 * en balance.rivals.
 */

export interface RivalDef {
  id: string;
  name: string;
  /** Tier con el que entra en escena (el runtime puede cambiarlo). */
  tier: RivalTier;
  profile: RivalProfile;
  /**
   * Géneros favoritos (sesgan sus lanzamientos). Si aún no existen en su era,
   * el rival tira de lo disponible — el filtro por era manda.
   */
  specialtyGenres: string[];
  appearsInEra: EraId;
}

export const rivalDefs: readonly RivalDef[] = [
  // La industria establecida de 1980: el coloso, dos medianos y dos garajes
  // como el tuyo (docs/06 §7: el listón de la gala ya existía antes que tú).
  {
    id: 'mango',
    name: 'Mango Interactive',
    tier: 'gigante',
    profile: 'fabrica',
    specialtyGenres: ['puzzle', 'plataformas'],
    appearsInEra: 'E1',
  },
  {
    id: 'ironKraken',
    name: 'Iron Kraken Games',
    tier: 'medio',
    profile: 'fabrica',
    specialtyGenres: ['estrategia', 'shooter'],
    appearsInEra: 'E1',
  },
  {
    id: 'lumen',
    name: 'Studio Lumen',
    tier: 'medio',
    profile: 'prestigio',
    specialtyGenres: ['rpg', 'aventura'],
    appearsInEra: 'E1',
  },
  {
    id: 'cincoPixeles',
    name: 'Cinco Pixeles',
    tier: 'indie',
    profile: 'oportunista',
    specialtyGenres: ['aventura', 'puzzle'],
    appearsInEra: 'E1',
  },
  {
    id: 'tortuga',
    name: 'Tortuga Bros.',
    tier: 'indie',
    profile: 'fabrica',
    specialtyGenres: ['puzzle', 'plataformas'],
    appearsInEra: 'E1',
  },
  // Las consolas traen sangre nueva (E2–E4).
  {
    id: 'wolfbyte',
    name: 'Wolfbyte Studios',
    tier: 'medio',
    profile: 'fabrica',
    specialtyGenres: ['shooter', 'deportivo'],
    appearsInEra: 'E2',
  },
  {
    id: 'havoc',
    name: 'Havoc & Sons',
    tier: 'medio',
    profile: 'oportunista',
    specialtyGenres: ['deportivo', 'carreras'],
    appearsInEra: 'E3',
  },
  {
    id: 'aurora',
    name: 'Aurora Machine',
    tier: 'gigante',
    profile: 'prestigio',
    specialtyGenres: ['rpg', 'terror'],
    appearsInEra: 'E4',
  },
  // La ola digital e indie (E5) y la era de los servicios (E6).
  {
    id: 'nimbus',
    name: 'Nimbus Softworks',
    tier: 'indie',
    profile: 'oportunista',
    specialtyGenres: ['simulacion', 'gestion'],
    appearsInEra: 'E5',
  },
  {
    id: 'peluche',
    name: 'Peluche Digital',
    tier: 'indie',
    profile: 'prestigio',
    specialtyGenres: ['aventura', 'ritmo'],
    appearsInEra: 'E5',
  },
  {
    id: 'badRobot',
    name: 'Bad Robot Bytes',
    tier: 'indie',
    profile: 'fabrica',
    specialtyGenres: ['puzzle', 'sandbox'],
    appearsInEra: 'E6',
  },
  {
    id: 'nocturno',
    name: 'Nocturno Games',
    tier: 'medio',
    profile: 'prestigio',
    specialtyGenres: ['terror', 'battleRoyale'],
    appearsInEra: 'E6',
  },
];

export function getRivalDef(id: string): RivalDef {
  const def = rivalDefs.find((r) => r.id === id);
  if (!def) throw new Error(`Estudio rival desconocido: ${id}`);
  return def;
}

/** Etiqueta legible del tier para el panel de Industria (docs/10). */
export const rivalTierLabels: Record<RivalTier, string> = {
  indie: 'Indie',
  medio: 'Estudio medio',
  gigante: 'Gigante',
};

/**
 * Estudios de relleno para la gala (docs/06 §7, 9.5): SOLO cuando la industria
 * simulada aún no tiene lanzamientos en el año (p. ej. un save recién migrado
 * a v16). Nombres fuera del roster para no atribuir juegos falsos a un rival
 * real. En juego normal la gala se llena con los lanzamientos reales.
 */
export const fallbackNomineeStudios: readonly string[] = [
  'Vega Doble',
  'Pixel Norte',
  'Marfil Games',
  'Chispa Estelar',
  'Kraken Azul',
  'Río Salvaje',
];

/**
 * Títulos para los juegos rivales (sabor; el PRNG los combina y numera las
 * secuelas). Amplía el pool que la gala usaba desde la 8.10: una partida
 * completa ve cientos de lanzamientos rivales y las repeticiones se vuelven
 * secuelas («Neón Roto 2») — la industria de las franquicias, deliberadamente.
 */
export const rivalGameTitles: readonly string[] = [
  'Últimos Faros',
  'Corazón de Óxido',
  'Vientos de Kessel',
  'La Caída de Arben',
  'Neón Roto',
  'Manifiesto',
  'El Jardín Vertical',
  'Sombras de Hierro',
  'Cazadores de Ecos',
  'Retorno a Val',
  'Vacío Azul',
  'Grito Silencioso',
  'La Última Sinfonía',
  'Rutas Perdidas',
  'Hijos del Trueno',
  'Quimera',
  'Ámbar',
  'El Puente de los Cuervos',
  'Baluarte',
  'Cenizas del Mañana',
  'Distrito Cero',
  'El Faro y la Tormenta',
  'Lobo Estepario',
  'Marea Negra',
  'Ocaso Carmesí',
  'Praderas de Acero',
  'Reino de Sal',
  'Séptimo Sello',
  'Tinta y Pólvora',
  'Umbral',
  'Venganza de Papel',
  'Zafiro Hueco',
  'La Cosecha Silente',
  'Motores del Alba',
  'Ciudad sin Nombre',
  'El Último Tren',
  'Fábulas del Vacío',
  'Gigantes Dormidos',
];
