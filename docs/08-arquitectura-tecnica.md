# 08 — Arquitectura Técnica

Define **cómo se construye el código**. Objetivo: una simulación determinista, testeable y
data-driven, con la UI de React como una capa fina encima. Claude Code debe respetar esta arquitectura
en cada fase del roadmap (`11`).

---

## 1. Principios de arquitectura `[DECIDIDO]`

1. **Núcleo de simulación puro y aislado de React.** Toda la lógica de juego vive en TypeScript puro,
   sin dependencias de UI. React solo *lee* el estado y *despacha* acciones. Esto lo hace testeable y
   portable.
2. **Determinista y semilla-based.** Nada de `Math.random()` suelto. Un PRNG con semilla (guardada en
   el save) garantiza que la misma partida + mismas acciones = mismo resultado. Sostiene el pilar
   "mayormente determinista" y hace los tests fiables.
3. **Data-driven.** Géneros, temas, plataformas, features, rasgos, eras, creadores, curvas y pesos de
   balance viven en archivos de **datos/config** (ver `09`), no hardcodeados en la lógica. Balancear =
   editar datos, no reescribir código.
4. **Simulación por ticks.** El mundo avanza en pasos discretos (1 tick = 1 semana). Un tick es una
   función pura `(estado, acciones) → nuevoEstado`.
5. **Separación estado / vista / balance.** Tres capas: motor (lógica), estado (store), presentación (React).

## 2. Stack `[DECIDIDO]`

| Capa | Elección | Notas |
|------|----------|-------|
| Lenguaje | **TypeScript** (strict) | Tipado fuerte en todo el dominio. |
| UI | **React 18** | Componentes funcionales + hooks. |
| Build/dev | **Vite** | Rápido, simple, ideal para SPA. |
| Estado | **Zustand** `[DECIDIDO]` | Store minimalista; encaja con núcleo puro. (Alt: Redux Toolkit si se prefiere.) |
| Estilos | **Tailwind CSS** `[DECIDIDO]` | Utilidades para UI flat; iteración rápida en Claude Code. Ver `10`. |
| Gráficos de datos | **Recharts** `[DECIDIDO]` | Ventas, hype, moral en runtime. |
| Animación | **framer-motion** + **canvas-confetti** `[DECIDIDO]` | Springs, layout, `AnimatePresence`; celebraciones. Ver `10` §4. (Opcionales: tsParticles, lottie-web.) |
| Audio (opcional) | **Web Audio API** `[DECIDIDO · opcional]` | Blips procedurales, sin archivos. Ver `10` §12. |
| Iconos | **lucide-react** | Iconografía consistente (ver `10`). |
| Tests | **Vitest** + **Testing Library** | Unit del núcleo + component tests. |
| Persistencia | **localStorage** + export/import JSON | Ver §7. |

> Sin backend en el alcance inicial: es un juego single-player que corre entero en el cliente.

## 3. Estructura de carpetas `[DECIDIDO]`

```
src/
├─ core/                    # NÚCLEO DE SIMULACIÓN (TS puro, sin React)
│  ├─ engine/
│  │  ├─ tick.ts            # avanzar 1 semana: orquesta los subsistemas
│  │  ├─ rng.ts             # PRNG con semilla (deterministic)
│  │  └─ gameLoop.ts        # control de velocidad/pausa
│  ├─ systems/
│  │  ├─ quality.ts         # doc 03
│  │  ├─ market.ts          # doc 04
│  │  ├─ staff.ts           # doc 05
│  │  ├─ economy.ts         # doc 06
│  │  ├─ morale.ts          # doc 06 (dilema/escándalos)
│  │  └─ community.ts       # doc 07
│  ├─ model/                # tipos del dominio (Project, Employee, Platform...)
│  └─ index.ts              # API pública del núcleo
├─ data/                    # CONFIG DATA-DRIVEN (doc 09)
│  ├─ genres.ts  themes.ts  platforms.ts  features.ts
│  ├─ traits.ts  eras.ts    creators.ts   events.ts
│  └─ balance.ts            # todos los pesos/curvas de balance en un sitio
├─ state/                   # store (Zustand): estado + acciones que llaman al core
│  ├─ store.ts
│  └─ actions/
├─ ui/                      # REACT (doc 10)
│  ├─ screens/              # pantallas principales
│  ├─ components/           # tarjetas, medidores, paneles, gráficos
│  └─ theme/                # sistema de diseño
├─ save/                    # serialización/carga (doc §7)
└─ main.tsx
```

## 4. El bucle de simulación `[DECIDIDO]`

```ts
// Pseudocódigo del tick — función pura sobre el estado
function tick(state: GameState): GameState {
  const rng = makeRng(state.seed, state.week);   // determinista por semana
  let s = structuredClone(state);

  s = advanceMarket(s, rng);        // 04: mover popularidades, plataformas, eventos
  s = advanceProjects(s, rng);      // 02/03: progreso de desarrollo, acumular bugs
  s = advanceStaff(s, rng);         // 05: energía, moral, química, renuncias
  s = advanceSales(s, rng);         // 04/06: ventas de juegos ya lanzados
  s = advanceCommunity(s, rng);     // 07: sentimiento, hype, crisis en curso
  s = advanceEconomy(s, rng);       // 06: cobrar ingresos, pagar costes; bancarrota
  s = rollEvents(s, rng);           // eventos aleatorios de "sabor" (leaks, ferias...)

  s.week += 1;
  s = maybeAdvanceEra(s);           // 02: transición de era por tiempo
  return s;
}
```

- El `gameLoop` llama a `tick` a intervalos según la velocidad (Pausa/x1/x2/x4), o al pulsar "avanzar".
- Las **acciones del jugador** (concebir proyecto, contratar, responder crisis...) son funciones puras
  aparte que transforman el estado entre ticks; nunca mutan estado directamente en componentes React.

## 5. Modelo de estado (alto nivel) `[DECIDIDO]`

```ts
interface GameState {
  seed: number;
  week: number;                 // tiempo en ticks
  era: EraId;
  studio: Studio;               // capital, reputación[segmento], oficina, etapa de escala
  staff: Employee[];
  candidates: Employee[];       // pool de contratación
  projects: Project[];          // en desarrollo
  releasedGames: ReleasedGame[];// con su curva de ventas viva
  market: MarketState;          // popularidades, plataformas, saturación
  community: CommunityState;    // sentimiento, hype activo, crisis activas
  research: ResearchState;
  log: GameEvent[];             // historial para UI y para el Legado
}
```

Los tipos concretos de `Project`, `Employee`, `Platform`, etc. se detallan en `09`.

## 6. Estado (store) y React `[DECIDIDO]`

- El **store (Zustand)** contiene el `GameState` y expone acciones que delegan en `core`.
- Los componentes React se **suscriben con selectores** a las porciones que necesitan (evita
  re-renders masivos: la UI de un tycoon tiene mucho estado).
- Regla estricta: **ningún componente calcula lógica de juego**; solo lee estado derivado y despacha
  acciones. Los cálculos (calidad, ventas...) viven en `core`.

## 7. Guardado y carga `[DECIDIDO]`

- `GameState` es **serializable a JSON** (sin funciones ni clases con métodos en el estado; usar datos
  planos + funciones puras que operan sobre ellos).
- Autosave por era/lanzamiento en **localStorage**; export/import a archivo `.json` para respaldos.
- **Versionado del save:** incluir `saveVersion`; escribir migraciones cuando cambie el esquema.
- Como el estado es determinista, un save = semilla + week + estado; opcionalmente se puede guardar
  solo semilla + lista de acciones (replay), pero el snapshot completo es más simple y robusto.

## 8. Testing `[DECIDIDO]`

- **Unit (Vitest) del núcleo:** cada sistema con casos como los "ejemplos trabajados" de `03`/`06`.
  El determinismo hace estos tests estables (semilla fija → resultado fijo).
- **Tests de invariantes:** p. ej. "el capital nunca es NaN", "la reputación queda en [0,100]",
  "ningún tick lanza excepción sobre un estado válido".
- **Tests de balance/regresión:** simular partidas automatizadas (bot que juega una filosofía) y
  comprobar que los tres arquetipos (`01` §5) siguen siendo viables tras cambios de balance.
- **Component tests** de las pantallas clave.

## 9. Rendimiento `[DECIDIDO]`

- El coste está en la simulación de muchos juegos lanzados y empleados; mantener los ticks O(n) y
  evitar clones profundos innecesarios (usar updates inmutables selectivos si `structuredClone` pesa).
- La UI usa memoización y selectores finos. Los gráficos se renderizan bajo demanda, no cada tick.

## 10. Criterios de aceptación (para Claude Code)

- [ ] El núcleo (`core/`) no importa React en ningún archivo.
- [ ] Toda aleatoriedad pasa por el PRNG con semilla; no hay `Math.random()` en la lógica de juego.
- [ ] `tick(state)` es una función pura y determinista; misma entrada → misma salida.
- [ ] Los datos de contenido y balance viven en `data/`, separados de la lógica.
- [ ] El estado es serializable y hay save/load con versionado y export/import JSON.
- [ ] Hay tests unitarios del núcleo con semilla fija, incluidos los ejemplos trabajados de los docs.
- [ ] La UI de React nunca contiene lógica de simulación; solo lee estado y despacha acciones.
