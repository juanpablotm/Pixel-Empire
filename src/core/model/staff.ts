/**
 * Tipos del personal (docs/05 y docs/09 §1). El fundador es un empleado más
 * (salario 0, no renuncia); burnedOut/weeksLowEnergy son estado interno del
 * mecanismo de burnout (docs/05 §4). Todo serializable (docs/08 §7).
 */

/** Especialidades/roles del estudio (docs/05 §2). */
export type Specialty = 'diseno' | 'tecnica' | 'arte' | 'audio' | 'marketing';

/** Tramo salarial: junior / senior / estrella [DECIDIDO, docs/12 §6]. */
export type SalaryTier = 'junior' | 'senior' | 'estrella';

export interface Employee {
  id: string;
  name: string;
  /** Semilla del avatar procedural determinista (docs/10 §9). */
  avatarSeed: string;
  specialty: Specialty;
  /** Nivel 0–100 en cada disciplina, no solo la principal (docs/05 §1). */
  skills: Record<Specialty, number>;
  /** 1–3 ids de rasgos (data/traits.ts). */
  traits: string[];
  morale: number;
  energy: number;
  loyalty: number;
  /** 💰 por semana; el fundador no cobra (salario 0). */
  salary: number;
  level: number;
  /** Progreso hacia el siguiente nivel (se consume al subir). */
  xp: number;
  /** El fundador no puede ser despedido ni renuncia. */
  founder: boolean;
  /** Estado de burnout: energía sostenidamente baja (docs/05 §4). */
  burnedOut: boolean;
  /** Semanas consecutivas con la energía bajo el umbral de burnout. */
  weeksLowEnergy: number;
}

/** Descomposición legible del Factor E (docs/03: competencia × moral × sinergia). */
export interface TeamFactorResult {
  teamFactor: number;
  /** Competencia media ponderada por el género, 0..1. */
  competence01: number;
  competenceFactor: number;
  moraleFactor: number;
  synergyFactor: number;
  /** Nº de pares afines / en conflicto de la química (docs/05 §5). */
  affinities: number;
  conflicts: number;
}
