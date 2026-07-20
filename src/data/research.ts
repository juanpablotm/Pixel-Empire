import type { ResearchNodeDef } from '../core/model/research';
import { features } from './features';
import { genres } from './genres';

/**
 * Árbol de investigación (docs/02 §3): los puntos 💡 se gastan aquí. Cada
 * nodo está gateado por era y a veces por otros nodos. Hay tres tipos de
 * recompensa: capacidades de estudio (bonus en `effects`, aplicados por
 * core/systems/research.ts), desbloqueos de contenido (los géneros/features
 * con `requiresResearch` apuntando al nodo; ver researchNodeUnlocks()) y —
 * desde la Fase 9.2 — TECNOLOGÍA DE MOTORES: los nodos de arquitectura
 * gatean qué generación de motor propio puedes construir
 * (balance.engines.generationGate) y otros habilitan capacidades del motor
 * (`requiresNode` en data/engines.ts). El motor en sí se CONSTRUYE aparte
 * (💰 + 💡 + semanas; core/systems/engines.ts).
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
  {
    id: 'teoriaDiseno',
    name: 'Teoría del diseño',
    description:
      'Qué mecánicas pide cada género: revela el encaje de cada feature con el género en la mesa de desarrollo.',
    cost: 14,
    era: 'E2',
    reveals: 'featureFit',
  },

  // --- Arquitectura de motores (Fase 9.2, docs/19 §9.2) ---------------------
  // Estos nodos NO construyen nada: desbloquean la CAPACIDAD de construir
  // motores propios de más generación (balance.engines.generationGate). La
  // obra en sí cuesta 💰 + 💡 + semanas en el taller de motores.
  {
    id: 'motorPropio1',
    name: 'Arquitectura de motores I',
    description:
      'Deja de reinventar la rueda: aprende a construir motores reutilizables (hasta la 3.ª generación).',
    cost: 12,
    era: 'E2',
  },
  {
    id: 'motorPropio2',
    name: 'Arquitectura de motores II',
    description:
      'Herramientas de equipo y pipelines serios: motores propios hasta la 5.ª generación.',
    cost: 40,
    era: 'E4',
    requiresNodes: ['motorPropio1'],
  },
  {
    id: 'motorPropio3',
    name: 'Arquitectura de motores III',
    description:
      'Pipeline de nueva generación: motores propios hasta la 7.ª generación.',
    cost: 80,
    era: 'E6',
    requiresNodes: ['motorPropio2'],
  },
  {
    id: 'tecnologia3d',
    name: 'Tecnología 3D',
    description:
      'Renderizado 3D en tiempo real: habilita la capacidad Gráficos 3D en tus motores.',
    cost: 30,
    era: 'E3',
    requiresNodes: ['motorPropio1'],
  },
  {
    id: 'kitBiplataforma',
    name: 'Kit biplataforma',
    description:
      'Exporta a una segunda plataforma: habilita la capacidad Biplataforma en tus motores.',
    cost: 25,
    era: 'E3',
    requiresNodes: ['motorPropio1'],
  },
  {
    id: 'pipelineMultiplataforma',
    name: 'Pipeline multiplataforma',
    description:
      'Compilar para todo a la vez: habilita la capacidad Multiplataforma (hasta 4) en tus motores.',
    cost: 60,
    era: 'E5',
    requiresNodes: ['kitBiplataforma'],
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
    description:
      'Netcode propio: desbloquea el multijugador online y la capacidad Online de tus motores.',
    cost: 60,
    era: 'E4',
  },
  {
    id: 'produccionAudio',
    name: 'Producción de audio',
    description:
      'Estudio de grabación y dirección de actores: desbloquea el doblaje completo.',
    cost: 30,
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
    description:
      'Infraestructura para cientos de jugadores a la vez: desbloquea el Battle Royale y OPERAR tus juegos como servicio en vivo (Fase 9.7).',
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
