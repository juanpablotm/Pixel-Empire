/**
 * Gestión por políticas (docs/02 §4 y docs/10 §14): en la escala grande
 * (estudio consolidado y corporación) el jugador deja de gestionar persona a
 * persona y fija políticas que el estudio aplica cada semana en el tick.
 * Los efectos y costes viven en data/balance.ts (sección policies).
 */

/** Política salarial: coste semanal vs moral/lealtad de la plantilla. */
export type SalaryPolicy = 'austera' | 'mercado' | 'generosa';

export interface StudioPolicies {
  salary: SalaryPolicy;
  /** Prohíbe el crunch en todo el estudio (palanca de integridad a escala). */
  antiCrunch: boolean;
  /** Forma automáticamente al empleado más flojo cada pocas semanas. */
  autoTraining: boolean;
  /** Paga bonus automáticos a quien tenga la moral por los suelos. */
  autoBonus: boolean;
}
