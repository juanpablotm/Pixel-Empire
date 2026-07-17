/**
 * Subequipos: grupos nombrados de empleados (docs/18 V5). Son una COMODIDAD DE
 * ASIGNACIÓN, no una entidad de simulación: nada del cálculo de rendimiento
 * (output, química, teamFactor, burnout) los lee. La verdad de quién trabaja en
 * qué sigue siendo `Project.assignedStaff`, y siguen contando las personas
 * reales. Todo serializable (docs/08 §7).
 */
export interface Squad {
  id: string;
  name: string;
  /** Ids de empleados. Un empleado pertenece a un subequipo como mucho. */
  memberIds: string[];
}
