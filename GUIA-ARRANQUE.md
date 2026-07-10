# Guía de arranque — Pixel Empire: Game Studio Tycoon (en Claude Code)

Cómo empezar a construir el juego con Claude Code, de la mejor manera. Léela una vez; luego solo
necesitarás copiar los prompts.

---

## 0. Antes de empezar

- **Esta carpeta es la raíz del proyecto.** No copies nada más: `CLAUDE.md` ya está en la raíz (Claude
  Code lo lee solo) y los documentos de diseño están en `docs/`.
- Ten instalado **Node.js** (v18+). Claude Code creará el proyecto Vite dentro de esta carpeta.
- Abre una terminal **en esta carpeta** y ejecuta `claude` para iniciar Claude Code.

---

## 1. La forma correcta de trabajar (léelo)

1. **Fase a fase.** No pidas "haz el juego entero". Pides **una fase** del roadmap (`docs/11`), la
   revisas, y solo entonces avanzas a la siguiente. Empiezas por la **Fase 0**.
2. **Plan antes de código.** En cada fase, pide primero un plan y **apruébalo** antes de que escriba
   código. Corregir un plan es barato; corregir código ya escrito, no.
3. **Tests como criterio de cierre.** Una fase no está "hecha" hasta que sus tests (Vitest, semilla
   fija) pasen. No avances con tests en rojo.
4. **Un commit por fase.** Pídele que haga `git commit` al cerrar cada fase, para poder volver atrás.
5. **Respeta las decisiones cerradas.** Si propone cambiar algo marcado `[DECIDIDO]`, que te pregunte
   antes.

---

## 2. Primer prompt (Fase 0 — Andamiaje) — cópialo tal cual

```
Vas a ser el ingeniero de este proyecto, "Pixel Empire: Game Studio Tycoon".

1) Lee, en este orden, antes de escribir nada de código:
   - CLAUDE.md (raíz)
   - docs/00-vision-y-pilares.md
   - docs/01-gdd.md
   - docs/08-arquitectura-tecnica.md
   - docs/09-esquemas-datos.md
   - docs/11-roadmap-fases.md

2) Objetivo de esta sesión: implementar ÚNICAMENTE la "Fase 0 — Andamiaje"
   del roadmap (docs/11). No implementes ninguna mecánica de juego todavía.
   Alcance exacto de la Fase 0:
   - Proyecto Vite + React 18 + TypeScript (strict) + Vitest.
   - La estructura de carpetas del doc 08 §3 (core/, data/, state/, ui/, save/).
   - PRNG con semilla en core/engine/rng.ts, determinista, con sus tests.
   - Un tick(state) vacío y puro que solo avanza la semana (sin lógica de juego).
   - Store de Zustand con un GameState mínimo y serializable.
   - Guardado/carga básico (JSON + localStorage) con saveVersion.
   - Controles de tiempo (pausa / x1 / x2 / x4) sobre el tick.

3) Reglas de arquitectura NO negociables (doc 08), respétalas desde el primer archivo:
   - core/ es TypeScript puro y NO importa React.
   - Prohibido Math.random(): toda aleatoriedad pasa por el PRNG con semilla.
   - tick(state) es una función pura: (estado) -> nuevoEstado, sin mutar.
   - Data-driven: nada de números de balance hardcodeados (van en data/).
   - GameState es JSON plano y serializable.

4) PRIMERO muéstrame un PLAN y espera mi aprobación (no escribas código aún):
   - Árbol de carpetas y archivos que vas a crear.
   - Dependencias exactas que instalarás.
   - Cómo diseñarás el PRNG, el tick, el GameState y el save/load.
   - Qué tests escribirás y qué criterios de aceptación (CA) de la Fase 0 cubren.

5) Cuando yo apruebe el plan: implementa la Fase 0 completa con sus tests,
   ejecuta `npm run test` y enséñame que pasan, rellena la sección "Comandos"
   del CLAUDE.md con los comandos reales, e inicializa git con un commit
   "Fase 0: andamiaje". No te salgas del alcance de la Fase 0.
```

---

## 3. Prompts siguientes (cuando la Fase 0 esté aprobada)

El patrón se repite. Ejemplo para la Fase 1:

```
La Fase 0 está aprobada y con tests verdes. Ahora implementa la "Fase 1 —
Bucle núcleo" del roadmap (docs/11). Antes de codificar, lee docs/02, docs/03
y docs/09, y muéstrame el plan (núcleo primero, luego estado, luego UI) con
los tests que cubrirán los "ejemplos trabajados" del doc 03. Espera mi
aprobación. Mantén las reglas de arquitectura y no toques nada marcado
[DECIDIDO] sin preguntar. Al terminar, tests verdes y un commit "Fase 1".
```

Y así sucesivamente hasta la Fase 7 (ver la tabla de dependencias en `docs/11`).

---

## 4. Si algo se tuerce

- **Se sale del alcance:** "Detente. Eso pertenece a una fase posterior. Limítate al alcance de la
  Fase X según docs/11."
- **Mete lógica en la UI:** "Recuerda el doc 08: la lógica va en core/, la UI solo muestra. Muévelo."
- **Usa `Math.random()` o hardcodea balance:** "Viola las reglas de arquitectura. Usa el PRNG con
  semilla / mueve el número a data/balance.ts."
- **Quieres retroceder:** como cada fase es un commit, pídele `git log` y volver a un commit anterior.

---

## 5. Checklist rápida por fase

- [ ] Leyó los documentos de la fase antes de codificar.
- [ ] Presentó un plan y lo aprobaste.
- [ ] Núcleo puro (sin React), determinista, data-driven.
- [ ] Tests con semilla fija, en verde.
- [ ] Cumple los criterios de aceptación (CA) de la fase en `docs/11`.
- [ ] Commit de cierre de fase.
