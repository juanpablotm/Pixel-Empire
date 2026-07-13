import { animate, motion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMotionDisabled } from '../motion';
import { ease, motionSec, spring } from '../theme/motionTokens';

/**
 * Primitivas framer-motion de la app (Fase 7D, docs/10 §4 y §6). Todas usan
 * los tokens de ui/theme/motionTokens.ts y se apagan solas con "Reducir
 * animaciones" / prefers-reduced-motion / entornos sin animación (tests):
 * el contenido final es idéntico, solo desaparece el movimiento.
 *
 * Presentación pura (docs/08): interpolan hacia valores que ya viven en el
 * estado; nunca los calculan ni tocan el tick.
 */

/**
 * Transición de pantalla (docs/10 §6): fundido + deslizamiento corto al
 * navegar. Solo anima la ENTRADA (key remonta el contenedor): sin exit ni
 * `AnimatePresence mode="wait"`, que se atasca con el doble montaje de
 * StrictMode en dev y dejaría la navegación congelada. Con movimiento
 * reducido renderiza los hijos sin envoltorio animado (cambio instantáneo).
 */
export function ScreenFade({ id, children }: { id: string; children: ReactNode }) {
  const off = useMotionDisabled();
  if (off) return <div className="flex flex-1 flex-col">{children}</div>;

  return (
    <motion.div
      key={id}
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionSec.fast, ease: ease.standard }}
    >
      {children}
    </motion.div>
  );
}

/* Coreografía escalonada (docs/10 §4.1): los hijos entran en cascada. */
const staggerGroup: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: motionSec.base, ease: ease.decel } },
};

/**
 * Contenedor de entradas escalonadas (docs/10 §6 "Tarjeta que entra"):
 * al montarse, sus StaggerItem entran en cascada (fast, escalonado).
 */
export function StaggerGroup({
  tag = 'div',
  className,
  children,
}: {
  tag?: 'div' | 'ul';
  className?: string;
  children: ReactNode;
}) {
  const off = useMotionDisabled();
  const Tag = tag === 'ul' ? motion.ul : motion.div;
  return (
    <Tag className={className} variants={staggerGroup} initial={off ? false : 'hidden'} animate="show">
      {children}
    </Tag>
  );
}

/** Elemento de un StaggerGroup: hereda la coreografía del padre. */
export function StaggerItem({
  tag = 'div',
  className,
  children,
}: {
  tag?: 'div' | 'li';
  className?: string;
  children: ReactNode;
}) {
  const Tag = tag === 'li' ? motion.li : motion.div;
  return (
    <Tag className={className} variants={staggerItem}>
      {children}
    </Tag>
  );
}

/**
 * Contador que "rueda" hasta el valor (docs/10 §6): dinero del HUD, caja,
 * puntos de investigación. Interpola entre el valor anterior y el nuevo con
 * los tokens; con movimiento reducido muestra el valor final al instante.
 */
export function RollingNumber({
  value,
  format = (v) => String(v),
  className,
}: {
  value: number;
  /** Recibe el valor ya redondeado a entero. */
  format?: (value: number) => string;
  className?: string;
}) {
  const off = useMotionDisabled();
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (off || from === value) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, {
      duration: motionSec.base,
      ease: ease.standard,
      onUpdate: (v) => setShown(v),
      onComplete: () => setShown(value),
    });
    return () => controls.stop();
  }, [value, off]);

  return <span className={className}>{format(Math.round(shown))}</span>;
}

/**
 * "Pop" con spring (docs/10 §4.2) para overlays y recompensas: entra con un
 * muelle suave. Con movimiento reducido renderiza el contenido directamente.
 */
export function PopIn({ className, children }: { className?: string; children: ReactNode }) {
  const off = useMotionDisabled();
  if (off) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}
