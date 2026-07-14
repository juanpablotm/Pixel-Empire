import { describe, expect, it } from 'vitest';
import { IMPORTANT_NOTICES, TOAST_HIDDEN_TYPES, type NoticeKind } from './notifications';

/**
 * Clasificación de dos niveles (docs/17 U4): el catálogo es la fuente de verdad
 * data-driven. Estos tests fijan la baseline aprobada.
 */
describe('clasificación de notificaciones (docs/17 U4)', () => {
  it('todos los avisos del catálogo son de nivel importante', () => {
    for (const spec of Object.values(IMPORTANT_NOTICES)) {
      expect(spec.level).toBe('importante');
    }
  });

  it('los cuatro avisos nuevos usan el modal genérico; crisis/era/premio su beat', () => {
    const modal: NoticeKind[] = ['marketExit', 'staffLeft', 'bankruptcyWarning', 'scaleUp'];
    for (const kind of modal) expect(IMPORTANT_NOTICES[kind].surface).toBe('modal');
    const beat: NoticeKind[] = ['crisis', 'era', 'award'];
    for (const kind of beat) expect(IMPORTANT_NOTICES[kind].surface).toBe('beat');
  });

  it('los tipos de log importantes no se duplican como toast menor', () => {
    // "ventas" (sale de las tiendas) pasa a ser el modal de P&L; su beat tapa el toast.
    expect(TOAST_HIDDEN_TYPES.has('ventas')).toBe(true);
    expect(TOAST_HIDDEN_TYPES.has('era')).toBe(true);
    // Un evento menor rutinario sí sigue siendo toast.
    expect(TOAST_HIDDEN_TYPES.has('comunidad')).toBe(false);
  });
});
