# 18 — Pulido dirigido por playtest · Bloque 2 (Fase 8)

Segundo bloque de mejoras de tu playtest (PDF "Mejoras V2"). Mismo formato que `17`: refinadas,
priorizadas y listas para prompts. Habrá más bloques.

**Leyenda:** Tipo — 🐞 Bug · ⚖️ Balance · 🎛️ UX · 🧩 Sistema/Progresión. Prioridad — **P1/P2/P3**.
Complejidad — 🟢 baja · 🟡 media · 🔴 alta.

> **Cluster importante:** los puntos 5 y 8 (más el 3) reforman el **sistema de escala y tamaños**, que
> las Fases 8.3/8.6 ya tocaron. Se rediseñan **juntos** (V4) y **actualizan la baseline** (docs
> `02`/`16`/`17`). Los números son ejemplos, ajustables en `data/balance.ts`.

---

## A. Bug / contraste

### V1 · Contraste del indicador de especialidad en la piel E3 🐞 P1 🟢
*(playtest #6)*
**Problema:** en la era 3 (piel beige) no se ve en qué destaca el empleado por el color demasiado claro.
**Arreglo:** corregir el contraste de ese indicador en la piel E3 y **auditar todas las pieles** (el
contraste AA en todas las pieles era ya un requisito de la 7E). Cazar cualquier otro texto/ícono que se
pierda en E1 (CRT) o E3 (beige).
**Toca:** `10` §8 (pieles de era, contraste AA).

---

## B. Balance (ajustes finos)

### V2 · Más variación de tendencias (poca) ⚖️ P3 🟢
*(playtest #1)*
**Refinamiento:** subir **un poco** la amplitud/velocidad del ruido de las curvas de popularidad para
que las modas se sientan más vivas — sin romper "mayormente determinista/legible" (la tendencia sigue
leyéndose; solo se mueve algo más). Un ajuste pequeño en `balance.ts`.
**Toca:** `04` (curvas de popularidad).

### V3 · El hype base sube demasiado rápido de forma natural ⚖️ P2 🟢
*(playtest #2)*
**Refinamiento (seguimiento de B2/E2):** aún tras los arreglos, el hype **pasivo** (el que sube solo
antes del lanzamiento, sin comprar marketing) crece demasiado rápido. Reducir el coeficiente de
acumulación base para que llegar a la zona alta requiera **decisión** (marketing/creadores), no tiempo.
**Toca:** `04` §4 (hype), `07` (marketing).

---

## C. Escala y economía — rediseño acoplado (puntos 5 + 8)

### V4 · Rediseño de la progresión de estudio ⚖️🧩 P1 🔴
*(playtest #5 y #8)*
**Problema:** es demasiado fácil crecer (llegar a Corporación en la era 2) y, con juegos Grandes/AAA,
se alcanza un **"punto dulce" casi invencible**. Rediseño en cuatro palancas:

**a) 5 etapas de escala** (se añade una, ejemplo de números):

| Etapa | Aforo máx. | Proyectos a la vez |
|-------|:---:|:---:|
| 1. Garaje | 1 | 1 |
| 2. Estudio pequeño | 4 | 1 |
| 3. Estudio | 10 | 2 |
| 4. Estudio grande | 25 | 4 |
| 5. Corporación | 100 | 8 |

**b) 5 tamaños de proyecto** (se añade "Muy grande" entre Grande y AAA), con **plantilla mínima** que
además **gatea la etapa**:

| Tamaño | Plantilla mínima | Etapa mínima |
|--------|:---:|:---:|
| Pequeño | 1 | Garaje |
| Mediano | 3 | Estudio pequeño |
| Grande | 8 | Estudio (aforo 10) |
| **Muy grande** | 15 | Estudio grande (aforo 25) |
| **Triple AAA** | 40 | Corporación (aforo 100) |

**c) El avance se COMPRA (no es gratis).** Cumplir el umbral (capital + plantilla) **habilita** el
upgrade, pero hay que **pagarlo** con un desembolso en la ventana modal de escala (la cronología de la
8.6): se añade un botón "Ampliar estudio (coste: X 💰)". Umbrales más altos que ahora, escalonados por
era, para que no se llegue a Corporación en E2.

**d) Coste semanal creciente por etapa.** Cada etapa sube **considerablemente** el overhead fijo semanal
(alquiler/infraestructura). Así un estudio grande fabricando AAAs **quema mucho** y no es riesgo cero:
para sostenerlo hay que seguir sacando éxitos. Esto **mata el "punto dulce" invencible**.

**Toca:** `02` §4 (escala), `02` §2 (tamaños), `06`/`12` (economía, overhead, coste de avance), `16`,
y **revisa** los números de `17` E1 (que pasa de 4 a 5 tamaños). 💡 *Recomiendo balancearlo con los bots
(docs `08` §8) para que las 3 filosofías sigan siendo viables tras subir la dificultad.*

> **✅ Implementado (Fase 8.8).** Baseline actualizada en `02` §2/§4/§6.1, `06` §4, `12` §6, `16`
> §3.2/§3.4/§12 y `17` E1. Números finales (en `data/balance.ts`):
> - **a) 5 etapas** (`staff.scale`): aforo 1/4/10/25/100 · proyectos 1/1/2/4/8 · pool 3/3/4/6/8.
> - **b) 5 tamaños** (`development.sizeGate` + registros por tamaño): plantilla mín. 1/3/8/15/40 ·
>   etapa mín. 1/2/3/4/5 · duración 6/18/42/**72**/120 sem · coste base 500/2k/8k/**60k**/**250k** ·
>   precio rec. 20/30/45/**50**/60 · demanda 1/5/20/**40**/70. El AAA sube a 40 de plantilla (su
>   `crewRatio` espera esa organización) y 250k de coste base.
> - **c) El avance se compra** (`requirementsByStage` + `upgradeCostByStage`): requisito 25k /
>   200k+4 / 1,5M+8 / 8M+20 (capital+plantilla) habilita; ampliar cuesta 10k / 100k / 750k / 4M 💰.
>   `advanceScale` desaparece del tick → `expandStudio` (acción) + `expandBlockReason` (único punto de
>   verdad); botón "Ampliar estudio (coste: X 💰)" en la cronología de escala, que abre en el nodo
>   comprable; el aviso `scaleUp` de U4 pasa a significar "puedes ampliar" y enlaza con ella. Save v10
>   (mapeo 1→1, 2→2, 3→3, 4→5, no destructivo).
> - **d) Overhead creciente** (`economy.upkeepExtraByStage`): +0/300/1.500/7.000/**30.000** 💰/sem.
> - **Bots** (docs/08 §8, semilla 4242): las 3 filosofías viables hasta E7; nadie es Corporación antes
>   de E5 (la fábrica la compra en E6 y lanza AAAs); el punto dulce muere — la fábrica cae de 35M a
>   ~5M sosteniendo la torre con reseñas mediocres, y sin formar al equipo esa misma partida QUIEBRA.
>   La gestión por políticas sube a la etapa 4 (`policies.minStage`).

---

## D. Sistemas y contenido

### V5 · Gestión de equipos: subequipos y "retirar equipo entero" 🧩🎛️ P2 🔴
*(playtest #3)*
**Refinamiento:**
- **Subequipos:** poder crear grupos nombrados de empleados (p. ej. "Equipo A", "Motor gráfico") y
  **asignarlos de una vez** a un proyecto, en vez de uno por uno. Clave cuando hay 25–100 empleados y
  varios proyectos en paralelo (encaja con las etapas 3–5 de V4).
- **Retirar equipo entero de un proyecto:** una acción para **sacar a todo el equipo** de un proyecto y
  darle **descanso** (recupera energía/moral), útil en proyectos largos como los AAA. Es el **contrapeso
  del crunch** (`05`): rotas/descansas equipos para evitar el burnout. Aclarar qué pasa con el proyecto
  mientras (pausa el avance de esa gente).
**Toca:** `05` (asignación, energía/burnout), `02` (multi-proyecto), `10` (UI de equipo).

### V6 · +2 temas por era 🧩 P2 🟢
*(playtest #4)*
**Contenido:** añadir ~2 temas nuevos por era (≈14 más). Se integran solos con la progresión de
conocimiento (P1): son nuevos objetivos de investigación. Sugerencias (ajustables):

| Era | Temas nuevos sugeridos |
|-----|------------------------|
| E1 | Mitología · Oeste (western) |
| E2 | Ninjas / artes marciales · Fantasía oscura |
| E3 | Terror psicológico · Espías / conspiración |
| E4 | Supervivencia / naturaleza · Steampunk |
| E5 | Vida social / citas · Cocina / restaurante |
| E6 | Isla / battle royale · Urbano aumentado |
| E7 | Transhumanismo / IA · Colonización espacial |

Cada tema con su afinidad tema×género y su curva de popularidad (datos, `09`/`04`).
**Toca:** `09` §3 (temas), `04` (curvas), `16`.

> **✅ Implementado (Fase 8.10).** Los 14 temas sugeridos, con las eras de la tabla, su fila en
> `data/affinity.ts` y su curva en `data/themes.ts` (15 → **29** temas). Baseline en `09` §3 y `16` §5
> (donde además se corrigieron las eras de Superhéroes/Cyberpunk/Post-apocalíptico/Vida/Piratas/
> Deportes/Historia, que estaban desincronizadas con los datos).
> - **Cero reglas nuevas:** se integran solos con la progresión de conocimiento de la 8.4 — ninguno es
>   *starter*, así que nacen gateados por era + 💡 heredando `themeCostByEra`.
> - **Los bots destaparon dos trampas suyas** (no del juego), corregidas en `src/test/bots.ts`: (1)
>   compraban el tema más barato antes de poder ahorrar para un nodo, así que con 14 sinks más se
>   quedaban a **0 capacidades** y la fábrica quebraba en E2 — ahora reservan para el nodo más barato
>   al alcance, que es la regla que su propio comentario ya decía seguir; (2) elegían el combo por
>   **fit ciego**, y las curvas nuevas tienen valles profundos (el Oeste cae a 0.15 en E3), así que
>   fabricaban obras perfectas sobre temas muertos — ahora leen también el panel de tendencias
>   (`04` §2), como un jugador real. Con eso las 3 filosofías vuelven a llegar vivas a E7.

### V7 · Rediseño de premios: competitivos y con puesto 🧩⚖️ P2 🟡
*(playtest #7)*
**Problema:** ganas todos los años; los premios no significan nada.
**Rediseño (innovando):**
- Los premios son **competitivos**: hay **nominados** y un **ranking/puesto** ("Estudio del año: 4.º"),
  no un "ganaste" automático. Ganar es **difícil y aspiracional**.
- **Solo realista ganar en las últimas eras** (E6–E7), cuando tienes escala y prestigio; antes aspiras a
  entrar en el ranking.
- **Innovación sin rivales completos** (que están diferidos a Fase 8): usar un **"listón de industria"**
  que sube con la era + unos **nominados ficticios** con nombre (sabor de industria viva) contra los que
  compites. Tu probabilidad de puesto depende de tu mejor lanzamiento del año (calidad + reputación) vs
  ese listón.
**Toca:** `06` §7 (premios).

> **✅ Implementado (Fase 8.10).** Baseline en `06` §7, `09` §1 y `16` §14. Save **v11** (añade
> `studio.lastCeremony`; los premios ya ganados se conservan).
> - **Nominación = los umbrales que ya existían** (`awards.thresholds`): son los que dan identidad a
>   cada categoría. Si tu mejor juego del año no los pasa, ni te nominan y la gala pasa de largo.
> - **Puesto** = `1 + nº de nominados por encima`. Puntuación = `reseña + prestigio + escala ×
>   scaleWeight`; nominados ficticios = `listón ± jitter` (PRNG solo para el sabor: nombres y jitter).
>   `data/awards.ts` lleva `barOffset`/`scaleWeight` por categoría + 12 estudios y 18 títulos ficticios.
> - **Números** (`balance.awards.competition`): listón 96/99/99.5/101.5/102/103/103.5 (E1→E7) ·
>   `sizeBonus` 0/2/5/8/**14** · `prestigeWeight` 6 (60 % crítica, 40 % prensa) · 4 nominados ·
>   dispersión ±2.5. `barOffset`: goty 0 · tecnica −2 · diseno/pueblo −3 · innovacion −4.
>   `scaleWeight`: goty 1 · tecnica 0.8 · diseno/pueblo 0.5 · **innovacion 0.25**.
> - **Calibrado contra el techo real de cada era** (que fijan los gates de tamaño de V4-b), no a ojo:
>   con reseña ~85 y prestigio alto el máximo es ~94 en E1, ~97 en E2–E3, ~100 en E4–E5 y ~103 en
>   E6–E7. Medido sobre 40 semillas, un estudio excelente y consagrado gana el GOTY **0–5 % de los
>   años hasta E5 y ~100 % en E6–E7**. Dos trampas que costó ver: un `barOffset` generoso (−6/−11) se
>   gana **desde E1** (tu puntuación no crece con las eras si no creces de escala), y con escalones de
>   `sizeBonus` de +3 la dispersión de los nominados decidía el puesto por azar.
> - **Consecuencia de diseño aceptada:** el indie de culto **no gana nunca** (ni la Innovación): sin
>   escala, su puntuación es plana en todas las eras, así que un listón que la alcance se ganaría
>   también en E1. Se queda en la nominación, que sí da reputación. La fábrica cínica **ni se nomina**.
> - **UI:** la gala se abre con la NOMINACIÓN (no solo al ganar) y revela el ranking completo con tu
>   fila resaltada; confeti solo con puesto 1. Escaparate nuevo `?demo=premios[&ganas=1]`; verificado
>   vía CDP (`scripts/verify810.mjs`, capturas `capturas/8-10-*.png`).
> - **Bug de piel encontrado de paso (arreglado):** en E7 (glassmorphism) `--surface-panel` es
>   translúcido al 8 % y el scrim solo tapa el 65 %, así que el ranking se leía sobre la Oficina Viva
>   al ~32 %. Se añade la clase `.modal-panel` (opaca + blur en E7) y se aplica a **todo lo que flota**:
>   gala, crisis, dilema, avisos, concepción, desarrollo, menú del HUD, desplegable del menú,
>   cronologías, fin de partida y guía del tutorial. **La regla es la profundidad, no el componente:**
>   los paneles EN PÁGINA (Legado, Finanzas, HUD, tarjetas) conservan el cristal a propósito — ahí el
>   glassmorphism es el look, porque detrás solo está el fondo de la app. La transición de era no lo
>   necesita: ya declara su propio mini-tema nocturno. Auditado sobre las 7 superficies con
>   `scripts/verify-modales-e7.mjs` (CDP headless). De paso, `?demo=aciegas` y `?demo=tutorial` ahora
>   respetan `&era=`, como su cabecera ya prometía para *cualquier* escaparate.

---

## Orden de implementación sugerido (Bloque 2)

| # | Prompt | Incluye | Por qué aquí |
|---|--------|---------|--------------|
| 8.7 | **Arreglos rápidos** | V1, V2, V3 | Bug de contraste + dos ajustes de balance; barato y de alivio inmediato |
| 8.8 | **Rediseño de escala y economía** | V4 | El cambio más importante del bloque (dificultad); rebalancear con bots |
| 8.9 | **Gestión de equipos** | V5 | Se apoya en las etapas 3–5 y el multi-proyecto de V4 |
| 8.10 | **Contenido y premios** | V6, V7 | Temas nuevos + premios competitivos; buen cierre |

**Notas:**
- Cada prompt: leer los docs que toca + `08`, plan breve, implementar, **tests de lógica verdes** (y
  bots de balance en 8.8), captura y commit ("Fase 8.x: …").
- V4 y V6 actualizan baseline: reflejarlos en `02`/`06`/`12`/`16` (y `17` E1 para V4) al implementarlos.
- Respetar las notas de máquina (sin `AnimatePresence mode="wait"`; verificar animación vía CDP headless).
