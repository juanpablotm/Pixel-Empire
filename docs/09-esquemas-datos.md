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
  platformIds: string[];
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
  scaleStage: 1 | 2 | 3 | 4;    // garaje..corporación (doc 02)
  officeLevel: number;
  awards: Award[];
}

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
  basePopularityCurve: PopularityCurve;   // doc 04
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
interface Theme { id: string; name: string; appearsInEra: EraId; basePopularityCurve: PopularityCurve; }
```

Semilla: Fantasía, Ciencia ficción, Espacio, Militar, Zombis, Medieval, Deportes, Vida/Cotidiano,
Crimen, Terror sobrenatural, Piratas, Cyberpunk, Post-apocalíptico, Superhéroes, Historia/Épica.

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

Semilla de plataformas por era (nombres ficticios reconocibles): PC casero (E1), "Commo 64" (E1),
"Gameling" portátil (E2), "Master V" (E2), "Playsystem" (E3), "N-Cube" (E3), PC online (E4),
"Playsystem 2" (E4), móvil/smartphone (E5), tiendas digitales (E5), "cloud/streaming" (E6), RV/mixta (E7).

## 5. Features `[DECIDIDO]`

```ts
interface Feature {
  id: string; name: string;
  qualityValue: number;         // aporte a featureScore (doc 03)
  timeCost: number;
  bugRisk: number;              // suma a bugDebt
  affinitySegment?: Segment;    // a qué público le encanta
  requiresEra?: EraId; requiresResearch?: string;
}
```

Ejemplos: "Mundo abierto", "Multijugador local", "Multijugador online" (E4+), "Final ramificado",
"Físicas avanzadas", "Sistema de crafteo", "Modo foto" (E6+), "Cross-play" (E6+).

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
