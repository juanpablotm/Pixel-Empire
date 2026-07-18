# 09 — Esquemas de Datos y Tablas de Contenido

La "materia prima" del juego. Todo lo que aquí se define vive en `src/data/` como **datos editables**
(ver `08` §1, principio data-driven). Las tablas de valores concretos son el **baseline v1 cerrado** `[DECIDIDO]` (cifras firmes, ajustables solo en balance de playtest); los *esquemas* (formas de los tipos) son `[DECIDIDO]`.

---

## 1. Tipos del dominio (esquemas TypeScript)

### Proyecto / Juego
```ts
interface Project {
  id: string;
  name: string;
  themeId: string;
  genreId: string;
  subGenreId?: string;          // mezcla opcional
  platformIds: string[];        // la primera es la PRINCIPAL; el nº lo limita el motor (9.2)
  engineId?: string | null;     // motor propio, licenciado o null = artesanal (Fase 9.2)
  audience: 'hardcore' | 'amplio' | 'casual' | 'infantil';
  size: 'pequeno' | 'mediano' | 'grande' | 'aaa';
  phase: 0 | 1 | 2 | 3;         // 0 = concepción
  focusAllocation: FocusAllocation[];  // reparto de esfuerzo por fase
  chosenFeatures: string[];     // ids de features
  assignedStaff: string[];      // ids de empleados
  monetization: MonetizationConfig;    // ver doc 06
  price: number;
  progress: number;             // 0..1
  bugDebt: number;              // 0..1 (doc 03)
  budget: number;
}
```

### Juego lanzado
```ts
interface ReleasedGame {
  projectId: string;
  quality: number;              // Q, 0..100 (doc 03)
  breakdown: QualityBreakdown;  // descomposición legible (doc 03)
  reviewsBySegment: Record<Segment, number>;
  weeklySales: number[];        // curva viva (doc 04)
  totalRevenue: number;
  releaseWeek: number;
  saturationAtRelease: number;
  activeCrises: string[];       // doc 07
}
```

### Empleado
```ts
interface Employee {
  id: string;
  name: string;
  avatarSeed: string;           // avatar procedural (tarjetas RRHH y escena de oficina por código, doc 10)
  specialty: Specialty;         // 'diseno'|'tecnica'|'arte'|'audio'|'marketing'
  skills: Record<Specialty, number>;   // 0..100 cada una
  traits: string[];             // 1..3 ids de rasgos
  morale: number;               // 0..100
  energy: number;               // 0..100
  loyalty: number;              // 0..100
  salary: number;
  level: number; xp: number;
}
```

### Estudio
```ts
interface Studio {
  capital: number;
  reputation: Record<Segment, number>;   // vector segmentado (doc 06)
  reputationDebt: number;       // "deuda de reputación" oculta (doc 06)
  scaleStage: 1 | 2 | 3 | 4 | 5;  // garaje..corporación (doc 02, docs/18 V4-a)
  officeLevel: number;
  awards: Award[];              // solo los GANADOS (doc 06 §7)
  lastCeremony: AwardCeremony | null;  // el ranking de la última gala (docs/18 V7)
}

// Premios competitivos (docs/18 V7): la gala guarda su ranking para que la
// ceremonia LEA el resultado y no calcule reglas en la UI (doc 08 §1).
interface AwardCeremony {
  week: number; year: number; era: EraId;
  categories: AwardCategoryResult[];
  nominated: boolean;
}
interface AwardCategoryResult {
  categoryId: string;
  bar: number;                  // el listón de esa categoría ese año
  nominees: AwardNominee[];     // ranking ordenado; te incluye si te nominaron
  rank: number | null;          // tu puesto (1 = ganado); null = ni nominado
  gameId: string | null; gameName: string | null;
}
interface AwardNominee { studio: string; gameName: string; score: number; isPlayer: boolean; }

type Segment = 'critica' | 'hardcore' | 'casual' | 'prensa' | 'comunidad' | 'empleador';
```

## 2. Géneros `[DECIDIDO]`

Cada género define su balance ideal Diseño/Técnica (doc 03), ponderación de especialidades y era de aparición.

```ts
interface Genre {
  id: string; name: string;
  idealDesign: number;      // 0..1 (técnica = 1 - idealDesign como referencia)
  idealTech: number;
  specialtyWeights: Record<Specialty, number>;
  appearsInEra: EraId;
  requiresResearch?: string;
  // Desde 9.4 NO hay curva de popularidad por género (doc 04 §2): la base es
  // plana e igual para todo lo disponible; la variación la dan las fiebres.
}
```

Semilla de géneros: RPG, Shooter, Estrategia, Aventura, Simulación, Deportes, Carreras, Plataformas,
Puzzle/Casual, Terror, Sandbox, Battle Royale (E6+), Gestión, Ritmo.

| Género | Diseño | Técnica | Aparece |
|--------|:---:|:---:|:---:|
| RPG | 0.65 | 0.35 | E1 |
| Shooter | 0.40 | 0.60 | E2 |
| Estrategia | 0.55 | 0.45 | E1 |
| Aventura | 0.70 | 0.30 | E1 |
| Simulación | 0.50 | 0.50 | E2 |
| Puzzle/Casual | 0.60 | 0.40 | E1 |
| Terror | 0.60 | 0.40 | E3 |
| Battle Royale | 0.45 | 0.55 | E6 |

## 3. Temas `[DECIDIDO]`

```ts
interface Theme { id: string; name: string; appearsInEra: EraId; }
// Desde 9.4, sin curva de popularidad (doc 04 §2): base plana + fiebres.
```

Semilla: Fantasía, Ciencia ficción, Espacio, Militar, Zombis, Medieval, Deportes, Vida/Cotidiano,
Crimen, Terror sobrenatural, Piratas, Cyberpunk, Post-apocalíptico, Superhéroes, Historia/Épica.

**+2 temas por era (docs/18 V6, Fase 8.10).** El catálogo sube de 15 a **29** temas. Los 14 nuevos no
traen reglas propias: se integran solos con el gateo de arriba (era + 💡) por el hecho de existir.

| Era | Temas nuevos | Afinidad alta |
|-----|--------------|---------------|
| E1 | Mitología · Oeste | RPG/Aventura · Aventura/Shooter |
| E2 | Ninjas / artes marciales · Fantasía oscura | Plataformas/Ritmo · RPG/Terror |
| E3 | Terror psicológico · Espías / conspiración | Terror/Aventura · Aventura/Shooter |
| E4 | Supervivencia / naturaleza · Steampunk | Sandbox/Simulación · RPG/Estrategia |
| E5 | Vida social / citas · Cocina / restaurante | Simulación/Gestión · Gestión/Puzzle |
| E6 | Isla / battle royale · Urbano aumentado | Battle Royale/Shooter · Aventura/Carreras |
| E7 | Transhumanismo / IA · Colonización espacial | RPG/Terror · Estrategia/Simulación |

**Gateo por investigación (docs/17 P1).** Además de `appearsInEra`, un tema es **usable** solo si es
*starter* o está investigado con 💡. No lleva `requiresResearch` (a diferencia de géneros/features):
cada tema se desbloquea por separado. Los datos de balance viven en `data/balance.ts`:
`research.knowledge.starterThemes` (los libres) y `research.knowledge.themeCostByEra` (coste 💡 por la
era del tema). El estado guarda los investigados en `research.themes` (docs/08 §5).

**Nodos de conocimiento de mercado (docs/17 P2).** `ResearchNodeDef` gana un campo opcional
`reveals?: 'fit' | 'balance' | 'price'`: un nodo así revela globalmente esa **pista predictiva**
(medidor de Fit / balance ideal del género / precio recomendado). El estado guarda las pistas
aprendidas por combo en `research.insights` (combos `tema|género` de "Investigar resultados").

### Tabla de afinidad Tema × Género (fit, doc 03) `[DECIDIDO]`
Matriz con valores `MuyBueno=1.0 / Bueno=0.75 / Neutro=0.5 / Malo=0.25`. Ejemplos:

| | RPG | Shooter | Estrategia | Casual |
|---|:---:|:---:|:---:|:---:|
| Fantasía | 1.0 | 0.5 | 0.75 | 0.5 |
| Militar | 0.5 | 1.0 | 1.0 | 0.25 |
| Zombis | 0.75 | 1.0 | 0.5 | 0.5 |
| Vida/Cotidiano | 0.5 | 0.25 | 0.5 | 1.0 |

(La matriz completa se define en `data/affinity.ts`.)

## 4. Plataformas `[DECIDIDO]`

```ts
interface Platform {
  id: string; name: string;         // ficticia: "Gameling", "Playsystem"...
  manufacturer: string;
  releaseWeek: number; endWeek: number;
  lifecycleCurve: InstallBaseCurve; // base instalada por tiempo (doc 04)
  genreAffinity: Record<string, number>;  // fit género×plataforma
  audienceBias: Record<Project['audience'], number>;
  licenseCost: number;              // dev-kit/licencia (doc 06)
  requiresResearch?: string;
}
```

Semilla de plataformas por era (nombres ficticios reconocibles): PC Casero (E1), "Commo 64" (E1),
"Master V" (E2), "Gameling" portátil (E2), "Playsystem" (E3), "N-Cube" (E3), "Vortex 32" (E3),
"Playsystem 2" (E4), "Vertex" (E4), "Gameling Advance" (E4), móvil/smartphone (E5), "Playsystem 4" (E5),
"N-Switch" (E5), "CloudPlay" (E6), "Playsystem 5" (E6), "Vertex X" (E6), "Visor RV Mixta" (E7),
"Holo Deck" (E7).

**Más consolas escalonadas (9.4, docs/19 §9.4):** cada generación tiene 2–3 plataformas en competencia
que salen **en semanas distintas dentro de su era** (`releaseWeek` escalonado), no todas de golpe —
decisión de en cuál y cuándo lanzar. El **número de plataformas simultáneas** por lanzamiento lo limita
el motor (capacidades `biplataforma`/`multiplataforma` de 9.2, §4.1); la demanda suma sus bases
instaladas (doc 04 §6–7).

### 4.2 Fiebres de mercado (Fase 9.4, docs/19 §9.4) `[DECIDIDO · baseline v1]`

La popularidad de género/tema es **plana** (doc 04 §2); la variación temporal la dan las fiebres, que
viven en `GameState.market.fevers` (serializable). Definición y disparadores en `data/balance.ts`
(`market.popularity` base/banda, `market.fevers` probabilidad/duración/intensidad/hitFever/saturación);
lógica pura en `core/systems/market.ts`:

```ts
interface Fever {
  id: string;                       // `f-<semana>-<target>-<targetId>`
  target: 'genre' | 'theme';
  targetId: string;
  startWeek: number; peakWeek: number; endWeek: number;   // sube start→peak, decae peak→end
  intensity: number;                // boost de pop en el pico (se suma a la base, clamp 0..1)
  source: 'organica' | 'hit';       // orgánica (PRNG) o encendida por un HIT (reseña ≥ 85)
}
// MarketState gana `fevers?: Fever[]` (solo las activas; el tick poda las que expiran). Save v15.
```

### 4.1 Motores (Fase 9.2, docs/19 §9.2) `[DECIDIDO · baseline v1]`

El motor es el término tecnológico del techo (`03` §3.1). Vive en `data/engines.ts` (capacidades y
catálogo licenciable) + `balance.engines` (niveles/costes por generación) y, los propios, en el estado:

```ts
type EngineCapabilityId = 'graficos3d' | 'online' | 'fisicas' | 'biplataforma' | 'multiplataforma';

interface EngineCapabilityDef {
  id: EngineCapabilityId; name: string; description: string;
  techBonus: number;            // puntos de nivel que suma al motor
  era: EraId; requiresNode?: string;   // gateo: era + nodo de I+D
  buildCostMoney: number; buildCostPoints: number;  // sobrecoste en la obra
  maxPlatforms?: number;        // bi = 2, multi = 4 (sin kit, 1)
}

interface LicensedEngineDef {    // catálogo de terceros (desde E3; se renueva por eras)
  id: string; name: string; vendor: string;
  appearsInEra: EraId; retiresInEra?: EraId;
  generation: number; techLevel: number;    // FIJO: también envejece
  capabilities: EngineCapabilityId[];
  upfrontFee: number;           // cuota POR JUEGO al concebir
  royaltyPct: number;           // fracción de ingresos brutos, para siempre
}

interface OwnedEngine {          // en GameState.engines (serializable)
  id: string; name: string;
  generation: number;           // 1..7 (≈ era en la que es puntero)
  techLevel: number;            // base de la generación + capacidades
  capabilities: EngineCapabilityId[];
  builtWeek: number;
}

interface EngineBuild {          // GameState.engineBuild: la obra en curso (una a la vez)
  upgradeOf: string | null;     // mejora de un motor existente, o obra nueva
  name: string; generation: number; capabilities: EngineCapabilityId[];
  weeksLeft: number; totalWeeks: number;
}
```

Las features pueden exigir capacidad de motor (`Feature.requiresEngineCapability`: el multijugador
online y el cross-play piden `online`). Los juegos lanzados congelan `engineId`/`engineName`,
`royaltyPct` y acumulan `royaltyPaid` (para el P&L).

## 5. Features `[DECIDIDO · afinidad por género desde 9.3]`

```ts
type FeatureAffinity = 'encaja' | 'neutro' | 'noEncaja';

interface Feature {
  id: string; name: string;
  qualityValue: number;         // aporte a featureScore (doc 03), ponderado por encaje
  timeCost: number;
  bugRisk: number;              // suma a bugDebt (× misfitBugMult si no encaja)
  requiresEra?: EraId; requiresResearch?: string;
  requiresEngineCapability?: EngineCapabilityId;  // 9.2: el motor gatea (online…)
  fitsGenres?: string[];        // 9.3: géneros donde ENCAJA (verde, valor entero)
  clashesGenres?: string[];     // 9.3: donde NO encaja (rojo: resta y multiplica bugs)
                                // lo no listado es neutro (ámbar, medio valor)
  variantGroup?: string;        // 9.3: variantes excluyentes de un trade-off
}
```

La afinidad feature×género vive **en los datos**, no en la lógica: `featureGenreAffinity()` la lee y
`balance.quality.featureAffinity` pone los multiplicadores (1 / 0.5 / −0.25 y `misfitBugMult` 1.75,
sobre `balance.development.featureBugScale`). Ejemplos: mundo abierto **encaja** en RPG/aventura/
sandbox y **no pega** en puzle/ritmo/deportes; el online encaja en shooter/deportes/battle royale y
no pega en aventura narrativa. **Variantes** (`variantGroup`, elegir una desmarca la otra):
`mundoAbierto` = artesanal (caro/lento/calidad) vs procedural (barato/rápido/repetitivo);
`voces` = voz digitalizada (barata) vs doblaje completo (caro, E4 + *Producción de audio*).

Ejemplos de catálogo: "Mundo abierto artesanal", "Mundo procedural" (E5+), "Multijugador local",
"Multijugador online" (E4+), "Final ramificado", "Físicas avanzadas", "Sistema de crafteo",
"Editor de niveles" (E2+), "Modo carrera" (E2+), "Banda sonora original" (E2+), "Doblaje completo"
(E4+), "Modo foto" (E6+), "Cross-play" (E6+), "Compañero con IA" (E7).

## 6. Rasgos de personalidad `[DECIDIDO]`

```ts
interface Trait {
  id: string; name: string; description: string;
  modifiers: Partial<{
    speed: number; qualityBonus: number; bugRisk: number; innovation: number;
    crunchSensitivity: number; synergy: number; hypeBonus: number; mentorBonus: number;
  }>;
}
```

Semilla: Perfeccionista, Rápido-pero-descuidado, Visionario, Estrella mediática, Mentor,
Llanero solitario, Sensible al crunch, Workaholic, Generalista, Especialista-obsesivo (ver doc 05).

## 7. Eras `[DECIDIDO]`

```ts
interface Era {
  id: EraId; name: string;
  startWeek: number;
  qualityStandard: number;      // el "listón" que sube con las eras (doc 03/04)
  unlocks: { genres: string[]; themes: string[]; features: string[]; platforms: string[];
             monetization: string[]; creatorArchetypes: string[] };
  transitionEvent: string;      // texto/efectos del cambio de era
}
```

Las 7 eras (E1–E7) según doc 02 §5. Cada una desbloquea contenido y sube `qualityStandard`.

## 8. Creadores de contenido `[DECIDIDO]`

```ts
interface Creator {
  id: string; name: string; archetype: CreatorArchetype;
  reach: number;                        // tamaño de audiencia
  targetSegments: Partial<Record<Segment, number>>;  // a qué público llega
  demandingness: number;                // cuán duro juzga
  genreAffinity: Record<string, number>;
  acquisitionCost: number;              // dificultad de conseguir la clave
  appearsInEra: EraId;
}
```

Arquetipos (doc 07): Variedades masivo, Competitivo hardcore, VTuber, Crítico de culto,
Influencer casual. En E1–E3, "creadores" = revistas/prensa especializada.

## 9. Configuración de monetización `[DECIDIDO]`

```ts
interface MonetizationConfig {
  model: 'premium' | 'f2p' | 'premium+dlc' | 'premium+mtx';
  aggressiveness: number;       // 0..1 (0 = honesto, 1 = exprimidor)
  hasLootBoxes: boolean;
  hasBattlePass: boolean;
  dayOneDLC: boolean;
}
```

Impacta ingresos (↑ con agresividad) y reputación por segmento (↓, sobre todo hardcore/comunidad) y
la deuda de reputación (doc 06). Algunas opciones se desbloquean/prohíben por era (regulación, doc 04/06).

## 10. Eventos `[DECIDIDO]`

```ts
interface GameEventDef {
  id: string; type: 'market' | 'leak' | 'crisis' | 'staff' | 'award' | 'era';
  trigger: TriggerCondition;    // condición legible (no puro azar)
  choices?: EventChoice[];      // dilemas con efectos por opción
  weight: number;               // el azar solo elige "sabor", no arruina decisiones
}
```

Cubre: leaks, ferias/expos, booms/recesiones, nacimiento de modas, escándalos, cambios regulatorios,
eventos de staff (renuncias, romances de oficina, peticiones). Ver docs 04, 06, 07.

## 11. Balance central `[DECIDIDO]`

Un único `data/balance.ts` reúne todos los pesos y curvas globales: pesos de calidad (`wF,wB,wC,wD`),
`k` de saturación, coeficientes de hype, umbrales de burnout, escalas de reputación, curvas de ventas,
etc. **Regla:** si un número afecta el balance, va aquí, no disperso en la lógica.

## 12. Criterios de aceptación (para Claude Code)

- [ ] Existen los tipos del dominio en `core/model/` tal como se esquematizan aquí.
- [ ] Los datos de contenido (géneros, temas, plataformas, features, rasgos, eras, creadores, eventos)
      están en `data/` como estructuras editables, no hardcodeados en la lógica.
- [ ] Existe una matriz de afinidad tema×género y tablas de fit género×plataforma.
- [ ] Todo parámetro de balance está centralizado en `data/balance.ts`.
- [ ] El contenido está gateado por era donde corresponde (`appearsInEra` / `unlocks`).
