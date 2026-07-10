# CLAUDE.md — Guía de trabajo para Claude Code

Proyecto: **Pixel Empire: Game Studio Tycoon**. Simulador de gestión de un estudio de
videojuegos inspirado en *Game Dev Tycoon*, cuyo eje es el dilema **Reputación ↔ Capital**.

Este archivo es tu manual operativo. El **diseño completo** vive en los documentos `00`–`12`, dentro de
la carpeta **`docs/`**. Antes de escribir código para cualquier sistema, **lee su documento**. Si algo
no está en los docs ni aquí, es una decisión nueva: pregúntame antes de improvisar.

---

## 1. Cómo usar la documentación

Lee siempre primero `docs/00-vision-y-pilares.md` y `docs/01-gdd.md` para el marco mental. Todos los
documentos viven en `docs/`. Luego, según la tarea:

| Vas a trabajar en... | Lee antes |
|----------------------|-----------|
| Cualquier cosa | `00` visión, `01` GDD, **este archivo** |
| Bucle de juego, tiempo, eras | `02` |
| Cálculo de calidad / reseñas | `03` + `09` |
| Mercado, modas, ventas | `04` + `09` |
| Personal, moral, equipo | `05` + `09` |
| Dilema moral, economía, escándalos | `06` + `09` |
| Comunidad, streamers, crisis | `07` + `09` |
| Arquitectura, estado, tests | `08` |
| Tipos y tablas de contenido | `09` |
| UI, animación, visual | `10` |
| **Orden de construcción** | `11` (fuente de verdad) |
| Valores concretos / decisiones cerradas | `12` |

**`11-roadmap-fases.md` manda el orden.** Se construye **fase a fase**, sin saltar.

---

## 2. Reglas de arquitectura (NO negociables — ver `08`)

1. **Núcleo puro aislado de React.** Toda la lógica de juego vive en `src/core/` en TypeScript puro.
   Ningún archivo de `core/` importa React. La UI **solo muestra**; nunca calcula reglas de juego.
2. **Determinista y con semilla.** Prohibido `Math.random()` en la lógica. Toda aleatoriedad pasa por el
   PRNG con semilla (`core/engine/rng.ts`). Misma semilla + mismas acciones = mismo resultado.
3. **`tick(state)` es una función pura.** Avanzar el mundo es `(estado) → nuevoEstado`, sin efectos
   secundarios ni mutación in situ.
4. **Data-driven.** Géneros, temas, plataformas, features, rasgos, eras, creadores, eventos y **todo el
   balance** viven en `src/data/`. Ningún número de balance hardcodeado en la lógica: va en
   `src/data/balance.ts`. Balancear = editar datos, no reescribir código.
5. **Estado serializable.** `GameState` es JSON plano (sin clases con métodos). Save/load con
   `saveVersion` y migraciones.
6. **Animación desacoplada del núcleo.** Las animaciones usan CSS/rAF/framer-motion, **nunca** el tick de
   simulación (ver `10` §4).

## 3. Estructura de carpetas (ver `08` §3)

```
src/
├─ core/     # simulación pura (engine/, systems/, model/) — sin React
├─ data/     # contenido + balance.ts (data-driven)
├─ state/    # store Zustand: estado + acciones que llaman a core/
├─ ui/       # React: screens/, components/, theme/
├─ save/     # serialización/carga
└─ main.tsx
```

## 4. Stack

TypeScript (strict) · React 18 · Vite · Zustand · Tailwind CSS · Recharts · framer-motion +
canvas-confetti · lucide-react · Vitest + Testing Library. Sin backend (corre entero en el cliente).

---

## 5. Flujo de trabajo por fase

Para cada fase del roadmap (`11`):

1. **Leer** el/los documentos del sistema principal de la fase + `09` (esquemas) + `08` (arquitectura).
2. **Implementar** primero el núcleo (`core/`) y sus datos; luego el estado; por último la UI.
3. **Escribir tests** (Vitest, semilla fija) que cubran los "ejemplos trabajados" y los criterios de
   aceptación (CA) del documento.
4. **No avanzar** a la siguiente fase hasta que los CA se cumplan y los tests estén verdes.

### Fase actual: **Fase 1 — Bucle núcleo (el corazón jugable)** (ver `11`)
Objetivo: fundar un estudio en el garaje, hacer un juego de principio a fin y recibir su reseña.
Sistemas: `02` (bucle + garaje), `03` (calidad), economía mínima de `06`. Antes de codificar, leer
`02`, `03`, `06` (economía mínima), `09` (esquemas) y `08` (arquitectura).

## 6. Comandos

```
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (Vite, puerto 5173)
npm run build      # typecheck (tsc --noEmit) + build de producción
npm run preview    # sirve el build de producción
npm run test       # tests (Vitest, una pasada)
npm run test:watch # tests en watch
npm run lint       # typecheck (tsc --noEmit)
```

## 7. Convenciones de código

- **TypeScript strict**; nada de `any` salvo justificación. Tipos del dominio en `core/model/`.
- Nombres de dominio según el **glosario** de `01` §8 (Fit, Calidad real, Segmento, Palanca, Tick, Era...).
- Funciones puras y pequeñas en `core/`; efectos y navegación solo en `ui/` y `state/`.
- Componentes React funcionales con hooks; suscripción al store por **selectores finos** (evitar
  re-renders masivos). Ningún componente calcula lógica de juego.
- Commits pequeños y por fase; cada PR/commit deja los tests verdes.

## 8. Guardarraíles (antes de codificar, comprobar)

- ¿Estoy metiendo lógica de juego en un componente React? → **No**, va en `core/`.
- ¿Usé `Math.random()`? → **No**, usa el PRNG con semilla.
- ¿Hardcodeé un número de balance? → **No**, va en `data/balance.ts`.
- ¿Voy a cambiar algo marcado `[DECIDIDO]` en los docs o en `12`? → **Pregunta primero.**
- ¿La reputación es un escalar? → **No**, es un vector por **segmento** (`06`/`09`).
- ¿Terminé la fase sin tests? → **No**, la fase no está lista sin CA + tests verdes.

## 9. Definición de "hecho" por fase

Una fase está completa cuando: (a) cumple todos sus CA en `11`; (b) tiene tests con semilla fija que los
verifican; (c) respeta las reglas de arquitectura de §2; (d) todo número de balance está en `data/`.

---

*Recuerda: eres libre de proponer mejoras, pero el diseño está cerrado como baseline v1 (ver `12`).
Cambios grandes se confirman antes de implementarse.*
