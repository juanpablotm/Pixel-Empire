# 11 — Roadmap por Fases

**Fuente de verdad del orden de construcción.** Está ordenado para respetar las dependencias entre
sistemas (ver `01` §4): cada fase produce algo jugable/testeable y añade una capa sobre la anterior.
Claude Code debe implementar **fase a fase**, sin saltar, cumpliendo los criterios de aceptación (CA)
antes de avanzar.

> Filosofía: **vertical slice primero, amplitud después.** La Fase 1 ya debe ser "jugable" de punta a
> punta aunque mínima. Cada fase posterior profundiza, no reescribe.

---

## Fase 0 — Andamiaje `[fundacional]`
**Meta:** el esqueleto técnico de `08` en pie, sin juego todavía.

- Proyecto Vite + React + TypeScript (strict) + Vitest.
- Estructura de carpetas de `08` §3.
- PRNG con semilla (`core/engine/rng.ts`) + tests de determinismo.
- Bucle de tick vacío que avanza la semana; store Zustand con `GameState` mínimo.
- Sistema de guardado/carga básico (JSON + localStorage) con `saveVersion`.

**CA:** el tiempo avanza por ticks pausable; se puede guardar y cargar; los tests de RNG pasan.

---

## Fase 1 — Bucle núcleo (el corazón jugable) `[MVP]`
**Meta:** fundar un estudio en el garaje, hacer un juego de principio a fin y recibir su reseña.
Sistemas: `02` (bucle + garaje), `03` (calidad), economía mínima de `06`.

- Concepción de proyecto (tema/género/plataforma/público/tamaño/nombre) con **medidor de Fit** (`03`).
- Desarrollo en 3 fases con reparto de esfuerzo y balance Diseño/Técnica.
- Cálculo de **Calidad Real `Q`** con sus 5 factores + **desglose de reseña legible** (`03` §5).
- Ventas simples (sin modas aún: demanda base × reseña) y economía básica (ingresos, costes fijos,
  bancarrota = game over).
- Datos semilla mínimos en `data/` (unos géneros, temas, 1–2 plataformas, features básicas).
- UI: vista principal, asistente de concepción, desarrollo, pantalla de reseña (`10`).

**CA:** un jugador puede fundar el estudio, crear un juego, ver su `Q` **descompuesta**, venderlo,
ganar/perder dinero, y repetir. El resultado es explicable en una frase (Pilar 2). Tests de los
"ejemplos trabajados" de `03` pasan con semilla fija.

---

## Fase 2 — Personal y equipo `[profundidad de producción]`
**Meta:** pasar de "lo haces tú" a dirigir un equipo. Sistema `05`.

- Empleados con especialidad, skills, rasgos, moral, energía, lealtad; pool de contratación.
- `teamFactor` conectado a `03` (competencia × moral × sinergia).
- Acciones: contratar, formar, asignar, motivar, **crunch**, despedir.
- Burnout y renuncias; química de equipo básica.
- Transición de escala Garaje → Estudio pequeño (`02` §4).
- UI de equipo (`10` §4.6).

**CA:** el equipo influye de forma legible en la calidad; el crunch da un empujón a corto y degrada
moral/energía/lealtad; empleados infelices renuncian. Los 3 arquetipos empiezan a divergir.

---

## Fase 3 — Mercado y modas vivas `[el mundo respira]`
**Meta:** el mercado deja de ser estático. Sistema `04`.

- Curvas de popularidad de géneros/temas evolucionando por tick; panel de tendencias (↑→↓).
- Saturación por lanzamientos similares.
- Hype (versión base) con doble filo en ventas/reseñas.
- Ciclos de vida de plataformas + base instalada → tamaño de mercado.
- Reseñas **por segmento** (introduce el vector de segmentos que `06` necesitará).
- Curva de ventas con pico + cola larga, recalculada por tick.

**CA:** el *momento* de lanzar cambia el resultado; subirse a una moda vs innovar temprano son
estrategias distintas y legibles; saturar un género con secuelas erosiona ventas.

---

## Fase 4 — El Dilema Moral `[el eje del juego]`
**Meta:** activar el Pilar 1. Sistema `06`. (Depende de segmentos de Fase 3 y equipo de Fase 2.)

- Reputación **segmentada** completa (crítica/hardcore/casual/prensa/empleador) + agregada.
- Palancas de codicia/integridad: monetización, precio, DLC, refritos, crunch como palanca moral.
- "Deuda de reputación" oculta + sistema de **escándalos** con consecuencias.
- Regulación por era (p. ej. prohibición de loot boxes).
- Economía completa (préstamos opcionales, licencias, marketing como coste).
- **Puntuación de Legado** al cierre.

**CA:** cada decisión importante tira de Capital y Reputación de forma diferenciada por segmento;
la codicia es tentadora pero acumula riesgo real de escándalo; los 3 arquetipos (`01` §5) son viables
y se sienten distintos (test con bots de balance, `08` §8).

---

## Fase 5 — Comunidad y streamers `[la capa social]`
**Meta:** dramatizar en público el dilema. Sistema `07`.

- Segmento **Comunidad** con termómetro de sentimiento + feed de posts.
- Roster de **creadores de contenido**; reparto de claves (fit × calidad × bugs).
- Fase de **hype y leaks** con dilemas (leak de alpha, sobre-hype).
- **Review bombing** (estado temporal) y subsistema de **gestión de crisis** con reloj y respuestas.
- La reputación previa modula el desenlace de las crisis.

**CA:** el marketing es una decisión de casting con riesgo; un bug en directo puede disparar una
crisis; las crisis se gestionan con respuestas que mueven segmentos; todo es trazable a una decisión
del jugador (no azar arbitrario).

---

## Fase 6 — Eras completas y progresión larga `[de la nada a megacorporación]`
**Meta:** el Pilar 5 a plena escala. Sistema `02` §4–5 completo.

- Las 7 eras con sus desbloqueos, transiciones y subida del listón de calidad.
- Las 4 etapas de escala hasta **Corporación** (múltiples equipos/proyectos, gestión por políticas).
- Árbol de investigación completo (`02` §3).
- Premios/reconocimiento anual (`06` §7).
- Balance de duración de partida (`02` §6).

**CA:** una partida puede recorrer E1→E7 con una curva de escala sentida; el late-game (corporación)
tiene decisiones distintas a las del garaje; el ritmo se sostiene sin vaciarse de contenido.

---

## Fase 7 — Pulido, arte hero y balance final `[calidad de lanzamiento]`
**Meta:** que se sienta un juego terminado.

- Guía de estilo visual aplicada; arte "hero" (splash de eras, ilustraciones de eventos) — aquí entra
  la generación por IA de las pocas piezas raster (`10` §3).
- Onboarding/tutorial en la era del garaje.
- Sonido/feedback (opcional), animaciones sutiles.
- **Balance final** con partidas automatizadas; ajuste de `data/balance.ts`.
- Pulido de UX, accesibilidad, modo sandbox desbloqueable.

**CA:** los objetivos de diseño medibles de `00` §9 se cumplen (rejugabilidad, legibilidad, tensión
moral, curva sentida).

---

## Fase 8 — Extensiones opcionales `[post-lanzamiento / stretch]`
No en el alcance base; el diseño las admite sin reescritura:

- ~~**Estudios rivales con IA** (`04` §9): agentes que lanzan juegos, saturan el mercado y compiten por
  talento (el talento que se va puede ir a ellos, `05` §7).~~ **CERRADO en la Fase 9.5**
  (docs/19 §9.5, commit "Fase 9.5: estudios rivales"): roster con tiers y perfiles que evoluciona,
  ventanas de lanzamiento disputadas, robo de talento con contraoferta, nominados reales en la gala
  y panel de Industria — sin reescribir el mercado, tal y como estaba previsto.
- Franquicias/IP y secuelas con expectativas heredadas.
- Fabricar tu propia consola / publicar juegos de otros estudios (late-game clásico de tycoon).
- Eventos históricos guionizados adicionales; más contenido de datos.

---

## Tabla resumen de dependencias

| Fase | Sistema principal | Depende de |
|------|-------------------|-----------|
| 0 | Andamiaje (`08`) | — |
| 1 | Bucle + Calidad (`02`,`03`) | 0 |
| 2 | Personal (`05`) | 1 |
| 3 | Mercado (`04`) | 1 |
| 4 | Dilema Moral (`06`) | 2, 3 |
| 5 | Comunidad (`07`) | 3, 4 |
| 6 | Eras/Escala (`02`) | 4, 5 |
| 7 | Pulido/Arte (`10`) | 6 |
| 8 | Rivales y stretch | 6 |

## Notas para Claude Code

- Antes de cada fase, releer el/los documento(s) del sistema principal + `09` (esquemas) + `08` (arquitectura).
- Mantener el núcleo puro y data-driven en **todas** las fases (no acumular lógica en React).
- Terminar cada fase con sus tests (semilla fija) verdes antes de pasar a la siguiente.
- Las decisiones están cerradas como **baseline v1**; los valores de `data/balance.ts` pueden ajustarse en
  playtest sin cambiar el diseño. Ver `12-decisiones-cerradas.md` para el registro de cierre.
