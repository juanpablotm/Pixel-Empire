import type { ResearchNodeDef } from '../core/model/research';
import { features } from './features';
import { genres } from './genres';

/**
 * Árbol de investigación (docs/02 §3): los puntos 💡 se gastan aquí. Cada
 * nodo está gateado por era y a veces por otros nodos. Hay dos tipos de
 * recompensa: capacidades de estudio (bonus en `effects`, aplicados por
 * core/systems/research.ts) y desbloqueos de contenido (los géneros/features
 * con `requiresResearch` apuntando al nodo; ver researchNodeUnlocks()).
 */
export const researchNodes: readonly ResearchNodeDef[] = [
  // --- Inteligencia de mercado (docs/17 P2): revela el ATAJO PREDICTIVO -----
  // Comprar la faceta la revela para SIEMPRE y para todo (global). Es una
  // decisión con coste de oportunidad: esos 💡 no van a motores/QA. El desglose
  // de reseña a posteriori nunca se paga (Pilar 2): esto solo compra saberlo
  // antes. Alternativa orgánica y por combo: "Investigar resultados" (P2).
  {
    id: 'analisisMercado',
    name: 'Análisis de mercado',
    description:
      'Un estudio de precios del sector: revela el precio recomendado de cada tamaño de juego al concebirlo.',
    cost: 6,
    era: 'E1',
    reveals: 'price',
  },
  {
    id: 'estudioGeneros',
    name: 'Estudio de géneros',
    description:
      'Diseccionas qué hace grande a cada género: revela su balance Diseño/Técnica ideal en la mesa de desarrollo.',
    cost: 10,
    era: 'E1',
    reveals: 'balance',
  },
  {
    id: 'redAfinidades',
    name: 'Red de afinidades',
    description:
      'Cruzas datos de miles de lanzamientos: el medidor de Fit deja de ser difuso para cualquier combinación tema×género.',
    cost: 16,
    era: 'E2',
    reveals: 'fit',
  },

  // --- Motores propios (docs/02 §3): producción más rápida -----------------
  {
    id: 'motorPropio1',
    name: 'Motor propio I',
    description: 'Deja de reinventar la rueda: tu primer motor reutilizable. +10 % de producción.',
    cost: 25,
    era: 'E2',
    effects: { devOutput: 0.1 },
  },
  {
    id: 'motorPropio2',
    name: 'Motor propio II',
    description: 'Motor 3D con herramientas de equipo. +15 % de producción extra.',
    cost: 70,
    era: 'E4',
    requiresNodes: ['motorPropio1'],
    effects: { devOutput: 0.15 },
  },
  {
    id: 'motorPropio3',
    name: 'Motor propio III',
    description: 'Pipeline de nueva generación. +20 % de producción extra.',
    cost: 140,
    era: 'E6',
    requiresNodes: ['motorPropio2'],
    effects: { devOutput: 0.2 },
  },

  // --- QA y calidad ---------------------------------------------------------
  {
    id: 'qaProfesional',
    name: 'QA profesional',
    description: 'Un equipo de testers de verdad: el pulido rinde un 30 % más.',
    cost: 35,
    era: 'E3',
    effects: { qaEfficiency: 0.3 },
  },
  {
    id: 'qaAutomatizado',
    name: 'QA automatizado',
    description: 'Tests que corren solos por la noche. +40 % extra al pulido.',
    cost: 90,
    era: 'E5',
    requiresNodes: ['qaProfesional'],
    effects: { qaEfficiency: 0.4 },
  },

  // --- Marketing (capacidades de estudio, docs/02 §3) -----------------------
  {
    id: 'marketingDirigido',
    name: 'Marketing dirigido',
    description: 'Estudios de mercado y anuncios con puntería: el hype crece un 20 % más rápido.',
    cost: 30,
    era: 'E3',
    effects: { hypeGain: 0.2 },
  },
  {
    id: 'marketingViral',
    name: 'Marketing viral',
    description: 'Campañas hechas para compartirse. +30 % extra de hype.',
    cost: 80,
    era: 'E5',
    requiresNodes: ['marketingDirigido'],
    effects: { hypeGain: 0.3 },
  },

  // --- I+D sobre I+D ---------------------------------------------------------
  {
    id: 'laboratorioIdeas',
    name: 'Laboratorio de ideas',
    description: 'Tiempo protegido para experimentar: la investigación rinde un 50 % más.',
    cost: 40,
    era: 'E2',
    effects: { researchSpeed: 0.5 },
  },

  // --- Tecnologías que desbloquean contenido --------------------------------
  {
    id: 'tecnologiaOnline',
    name: 'Tecnología online',
    description: 'Netcode propio: desbloquea el multijugador online.',
    cost: 60,
    era: 'E4',
  },
  {
    id: 'generacionProcedural',
    name: 'Generación procedural',
    description: 'Mundos que se construyen solos: desbloquea el género Sandbox y los mundos procedurales.',
    cost: 70,
    era: 'E5',
  },
  {
    id: 'serviciosOnline',
    name: 'Juegos como servicio',
    description: 'Infraestructura para cientos de jugadores a la vez: desbloquea el Battle Royale.',
    cost: 100,
    era: 'E6',
    requiresNodes: ['tecnologiaOnline'],
  },
  {
    id: 'infraestructuraCloud',
    name: 'Infraestructura cloud',
    description: 'Servidores elásticos en la nube: desbloquea el cross-play.',
    cost: 110,
    era: 'E6',
    requiresNodes: ['serviciosOnline'],
  },
  {
    id: 'iaGenerativa',
    name: 'IA generativa',
    description: 'Modelos que improvisan diálogo y mundo: desbloquea el compañero con IA.',
    cost: 150,
    era: 'E7',
  },
];

export function getResearchNode(id: string): ResearchNodeDef {
  const node = researchNodes.find((n) => n.id === id);
  if (!node) throw new Error(`Nodo de investigación desconocido: ${id}`);
  return node;
}

/**
 * Qué contenido desbloquea un nodo (derivado de `requiresResearch` en el
 * contenido: una sola fuente de verdad; docs/09 §7).
 */
export function researchNodeUnlocks(nodeId: string): { genres: string[]; features: string[] } {
  return {
    genres: genres.filter((g) => g.requiresResearch === nodeId).map((g) => g.id),
    features: features.filter((f) => f.requiresResearch === nodeId).map((f) => f.id),
  };
}
