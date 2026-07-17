# 17 — Pulido dirigido por playtest · Bloque 1 (Fase 8)

Primer bloque de mejoras salidas de tu playtest (PDF "Mejora-Parte1"). Organizado por **tipo**,
**prioridad** y **complejidad**, con cada propuesta refinada y lista para convertir en prompts de
Claude Code. Habrá más bloques; este cierra 10 puntos.

**Leyenda:**
Tipo — 🐞 Bug · ⚖️ Balance · 🎛️ UX · 🧩 Sistema/Progresión.
Prioridad — **P1** (alta: rompe o desbalancea) · **P2** (media) · **P3** (mejora deseable).
Complejidad — 🟢 baja · 🟡 media · 🔴 alta.

> Algunas propuestas (P1-temas, P2-conocimiento, E1-tamaños) son **cambios de diseño** que actualizan
> la baseline; se marcan y se indican los docs que tocan cuando se implementen.

---

## A. Bugs (arreglar primero)

### B1 · Contratar por encima de la capacidad del estudio 🐞 P1 🟢
*(playtest #10)*
**Problema:** el juego deja contratar más gente de la que la etapa/oficina permite.
**Arreglo:** cada etapa de escala (y nivel de oficina) tiene un **aforo máximo**; el botón de contratar
se **deshabilita** (con motivo visible: "Oficina llena — mejórala") al alcanzarlo. Validar también al
cargar partidas antiguas.
**Toca:** `05` (contratación), `02` §4 (escala/oficina).

### B2 · El hype/marketing se pasa del límite sin comprar marketing 🐞 P1 🟡
*(playtest #7, parte bug)*
**Problema:** el medidor de hype supera su tope incluso sin invertir en marketing.
**Arreglo:** `clamp` del hype a su rango; auditar de dónde sale el hype base (creadores, era, boca a
boca) para que la suma nunca desborde. Este arreglo va **antes** del rediseño de marketing (E2).
**Toca:** `04` (hype), `07` (marketing/creadores).

---

## B. Balance y economía

### E1 · Coste base y mínimo de plantilla por tamaño de proyecto ⚖️🧩 P1 🟡
*(playtest #9)*
**Problema:** hacer un AAA es fácil y barato; no hay razón para no ir siempre a lo grande.
**Rediseño:** cada tamaño gana un **coste base fijo** (además del coste por persona·semana) y un
**mínimo de plantilla** y **etapa de escala** requeridos:

| Tamaño | Coste base (baseline) | Plantilla mínima | Etapa mínima |
|--------|----------------------|------------------|--------------|
| Pequeño | bajo | 1 | Garaje |
| Mediano | medio | 3 | Estudio pequeño |
| Grande | alto | 8 | Estudio consolidado |
| **AAA** | muy alto | 20+ | **Corporación (40+)** |

Así el tamaño es una **decisión con peso** y la escala del estudio importa de verdad. Los tamaños
bloqueados se muestran atenuados con su requisito ("Necesitas ser Corporación").
**Toca:** `02` (tamaños/escala), `06`/`12` (economía), `16` (compendio).

> **✅ Implementado (Fase 8.3).** `balance.economy.sizeBaseCost` = 500/2.000/8.000/40.000 💰 (cobrado al
> iniciar en `startProject`; incluido en `estimateProject` y en el P&L de `releasedGameCost`).
> `balance.development.sizeGate` fija plantilla y etapa mínimas por tamaño; el AAA exige **Corporación**
> (etapa 4). Su plantilla mínima se alinea al umbral real de esa etapa (`stage4.staff` = 15, no 20) para
> que ser Corporación baste, sin "dead zone". El núcleo lo valida con `sizeBlockReason` (puro, único
> punto de verdad) y la UI atenúa los tamaños bloqueados con su requisito (docs/08 §6).
>
> **♻️ Revisado (Fase 8.8, docs/18 V4).** Los tamaños pasan de 4 a **5** (entra el **Muy grande** entre
> Grande y AAA) y la escala, de 4 a **5 etapas que se compran**. Números vigentes: coste base
> 500/2.000/8.000/**60.000**/**250.000** 💰; plantilla mínima 1/3/8/**15**/**40**; etapa mínima
> Garaje / E. pequeño / Estudio / **E. grande** / **Corporación (etapa 5)**. La alineación "sin dead
> zone" del AAA se rompe adrede: te haces Corporación con 20 y contratas hacia los 40 que exige el AAA
> (aforo 100). El `crewRatio` del AAA espera esa organización.

### E2 · Rediseño del marketing (campañas escalonadas y castigo por sobre-hype) ⚖️ P1 🔴
*(playtest #7, parte diseño)*
**Problema:** el marketing está mal balanceado y es fácil pasarse; falta profundidad y consecuencia.
**Rediseño:**
- **Campañas escalonadas** con coste y alcance crecientes (p. ej. Nota de prensa → Anuncios →
  Feria/Expo → Campaña masiva). Las caras son **muy** caras pero **muy** efectivas.
- El marketing debe tener, en general, **ROI positivo pero con rendimientos decrecientes** (es un
  coste que pagas; no debe ser una trampa), *salvo* cuando entras en **sobre-hype**.
- **Castigo por sobre-hype (el doble filo, `04` §4):** si generas mucho hype pero el juego **no cumple**
  (nota baja), la caída es proporcional a la **brecha hype↔calidad**: peor cola de ventas y golpe de
  reputación (comunidad/hardcore). "Prometiste y no cumpliste."
- Mostrar en la UI una **zona segura vs zona de riesgo** del hype para que la decisión sea legible (Pilar 2).
**Toca:** `04` (hype/ventas), `07` (campañas/creadores), `06` (coste), `12` (cifras).

> **✅ Implementado (Fase 8.3).** `balance.economy.marketing.levels` pasa a **4 campañas** escalonadas
> (2k/10k/40k/120k 💰 con +0,08/0,18/0,32/0,50 hype; nombres en `data/marketTexts.ts`). Castigo por
> sobre-hype en `balance.market.hype.overHype`: `overHypeGap(hype, reseña)` (puro) solo es > 0 con hype
> en zona roja (≥ 0,65) **y** reseña < 68; la brecha reduce la **cola de ventas** (`overHypeTailPenalty`
> guardado en el `ReleasedGame`, aplicado solo al término de cola de `expectedWeeklyUnits` — el pico
> day-one no se toca) y golpea a **hardcore/comunidad** al lanzar (`releaseProject`). Es independiente
> del flag `overPromised` (que sigue disparando la crisis de promesa rota). El `HypeGauge` y la sección
> de Marketing muestran **zona segura vs riesgo**. Nota: los bots (sin marketing) casi no entran en zona
> roja, así que el castigo apunta al jugador que abusa del marketing, como debe ser.

### E3 · Despidos masivos bajan la reputación de empleador ⚖️ P2 🟢
*(playtest #3)*
**Refinamiento:** despedir a varios empleados en una **ventana corta** (p. ej. 3+ en ~8 semanas)
golpea la reputación de **Empleador** (y la moral de los que quedan); si es sonado, puede filtrarse
como noticia y tocar también a la **Comunidad**. Un despido puntual justificado no penaliza.
**Toca:** `05` (retención/empleador), `06` (reputación segmentada).

> **✅ Implementado (Fase 8.3).** `balance.staff.firing.massLayoff` (ventana 8 semanas, umbral 3). El
> estado guarda `recentFireWeeks` (campo opcional, `?? []`, sin bump de `saveVersion`; poda a la ventana
> en cada despido). Un despido puntual mantiene solo su coste modesto; al 3.º dentro de la ventana,
> `fireEmployee` añade el golpe extra a **Empleador**, más moral/lealtad perdidas por los supervivientes
> y —al filtrarse— un golpe a **Comunidad** (reputación + sentimiento) con log dedicado.

---

## C. Progresión y conocimiento (cambios de diseño)

### P1 · Temas gateados por investigación (no auto-unlock por era) 🧩 P2 🟡
*(playtest #1)*
**Cambio:** empiezas con **1–3 temas** libres (💡 recomiendo 2–3 para que el arranque no sea monótono;
a balancear) y **desbloqueas el resto invirtiendo Puntos de Investigación**. Al pasar de era **no** se
regalan los temas nuevos: la era **habilita la opción de investigarlos**, pero cuestan 💡. Esto le da
peso real a la investigación y a decidir "en qué me especializo".
**Toca:** `02` §3 (investigación), `09` §3 (temas), `16`.

> **✅ Implementado (Fase 8.4).** `balance.research.knowledge.starterThemes` = **fantasía, ciencia
> ficción, espacio** (3 libres); el resto se desbloquea con 💡 según `themeCostByEra` (6/10/14/18/22/26/30
> por la era del tema). Estado en `research.themes` (opcional, `?? []`). Un tema es **usable** si su era
> llegó **y** (es starter o está investigado): `themeAvailable`/`availableThemes` (core/systems/unlocks).
> La acción pura `researchTheme` (core/systems/research) valida era/no-starter/no-repetido/puntos;
> `startProject` rechaza un tema no investigado con motivo legible. La pantalla de I+D lista "Temas por
> investigar" con su coste; el panel de Mercado muestra las tendencias de **todos** los temas de la era
> (los no-usables con 🔒). Pasar de era no regala nada: solo habilita la opción (docs/08 §6).

### P2 · El conocimiento del mercado se gana investigando 🧩 P1/P2 🔴
*(playtest #2)*
**Cambio (con cuidado de no romper el Pilar 2):** las **pistas predictivas** dejan de ser gratis al
inicio y se **desbloquean** con investigación:
- **Fit/combos** (qué tema combina con qué género), **precio recomendado**, y **balance Diseño/Técnica
  ideal por género** empiezan **ocultos o difusos** y se revelan al investigarlos.
- Tras lanzar un juego puedes elegir **"Investigar resultados"** (gasta 💡 / semanas) para extraer
  aprendizaje concreto de esa combinación.
- **Clave para no frustrar (Pilar 2):** el **desglose de reseña de TUS lanzamientos sigue siendo
  siempre legible** — siempre aprendes de tus propios juegos. Lo que se paga con investigación es el
  **atajo predictivo** (saberlo *antes*), no la explicación *a posteriori*. Así el descubrimiento es
  una mecánica satisfactoria, no un muro opaco.
**Toca:** `03` (medidor de Fit/transparencia), `02` §3 (investigación), `16`.

> **✅ Implementado (Fase 8.4).** Tres facetas revelables —`fit` (medidor de Fit), `balance` (ideal
> Diseño/Técnica del género), `price` (precio recomendado)— y **TODAS empiezan ocultas** `[DECIDIDO]`:
> nada se regala (ni el combo de partida), porque el arranque a ciegas hace el progreso satisfactorio
> (Pilar 5). El tutorial lo enseña como bucle de descubrimiento ("El Fit está por descubrir: lanza y
> aprende del desglose, o investígalo"). Se revelan por **dos vías**: (a) **nodos globales** de I+D con
> campo `reveals` (`analisisMercado`→price E1, `estudioGeneros`→balance E1, `redAfinidades`→fit E2); (b)
> **"Investigar resultados"** de un juego lanzado (`researchInsight`, gasta `insightCost` = 4 💡), que
> aprende el combo concreto (fit tema×género + balance del género), guardado en `research.insights`.
> Helpers puros `fitRevealed`/`balanceRevealed`/`priceRevealed` (core/systems/research); la UI solo
> muestra "oculto/revelado" (FitMeter con estado `oculto`, precio e ideal con "❓ por investigar").
> **CLAVE (Pilar 2):** el **desglose de reseña** (`buildReviewLines`, ReviewScreen) es SIEMPRE completo
> y legible, con o sin investigación: solo se paga el atajo PREDICTIVO, nunca la explicación posterior.
> El sandbox pre-revela todo; la migración de saves siembra temas/pistas desde el historial (docs/08 §7).

---

## D. UX e interfaz

### U1 · Cronología de Eras (timeline interactivo) + versión de escala 🎛️ P3 🟡
*(playtest #4)*
**Spec (refinada de tu descripción):** modal *overlay* (fondo oscuro semitransparente, el estudio se ve
detrás) que se abre al pulsar el indicador de Era en la barra superior. Barra horizontal con **7 nodos**
(hexágonos, coherentes con la UI): **superadas** en verde, **actual** en dorado con pulso, **futuras**
bloqueadas con borde punteado y "?". Panel inferior dinámico: al hover/click en un nodo desbloqueado,
muestra nombre, años y novedades (plataformas + negocio); los futuros muestran "???" (mantener el
misterio). Se **abre automáticamente con una animación** al avanzar de era (celebra el hito — encaja con
el beat de transición de `10` §7.6).
**Añadido:** hacer una **cronología equivalente para la escala del estudio** (Garaje → Estudio pequeño →
Consolidado → Corporación), con los mismos estados y con los **requisitos** de cada etapa (E1 de este doc).
**Toca:** `10` (UI), `02` (eras/escala).

> **✅ Implementado (Fase 8.6).** `Timeline` (docs/10 §10.11) es **un overlay genérico** para los dos
> ejes: cada uno solo aporta su lista de nodos. Estado de presentación en el store (`timeline` +
> `openTimeline`/`closeTimeline`); **no pausa** —como los modales de U2— y se cierra con Esc. Los chips
> de **Era** y **Etapa** de la barra pasan a botones y son su puerta de entrada.
> **La apertura automática encadena con el beat** (§7.6): "Entrar en la nueva era" transforma la piel
> *y* abre la cronología con el nodo recién conquistado encendido — celebrar el hito es el remate del
> beat, no un segundo overlay peleándose con él.
> **Nada se duplica:** las novedades salen de `eraNovelties` (derivadas de `appearsInEra`, la misma
> fuente que canta el beat) y los requisitos de `scaleStageInfo`, que lee los umbrales que comprueba
> `advanceScale` — con tests que fijan justamente eso (subir con lo que se anuncia; un pelo por debajo,
> no). Las eras futuras dicen "???"; las etapas futuras **sí** enseñan requisitos: son un objetivo.
> **Dos trampas de las pieles** (docs/10 §10.11): los nodos son `<polygon>` SVG, no `clip-path` (que se
> come el borde y el foco, y sangra sobre el cristal de E7), y el estado no vive en el tono ni en el
> glifo — hay pieles cuyo acento *es* verde. La escala del compendio (`16` §3.2) se realinea con
> `balance.ts`: se enseña lo que se aplica.

### U2 · Menú desplegable + modales; pantalla principal más limpia 🎛️ P2 🟡
*(playtest #5)*
**Cambio:** llevar a un **menú desplegable** (que abre **modales**) las opciones de: Juegos lanzados,
Partida (Guardar, Cargar, Nueva partida, Volver al título, Retirarse, Ver legado) e Historial — para que
no ocupen pantalla siempre. La **pantalla principal** muestra solo los **juegos que aún se venden**, cada
uno con un **mini-gráfico** de copias vendidas por semana (refuerza el Pilar 2: ves la cola de ventas).
**Toca:** `10` (layout/pantallas).

> **✅ Implementado (Fase 8.5).** El menú (`StudioMenu`) vive en la **barra superior**, junto a los
> controles de tiempo: así se llega desde cualquier pantalla y la principal queda limpia de verdad. Sus
> tres entradas abren modales (`MenuModals`): **Juegos lanzados** (la estantería al completo, también lo
> retirado), **Historial** (el diario, que sale del lateral) y **Partida** (`SavePanel` + Ver legado +
> Retirarse con confirmación). Estado de presentación en el store (`menuModal` + `openMenuModal`/
> `closeMenuModal`); **no pausan el tiempo** —los abre el jugador, no le interrumpen como los avisos de
> U4— y ceden el paso a lo que sí exige decisión. Empezar/cargar partida los cierra: no queda un modal
> obsoleto de la partida anterior. La principal titula ahora **"A la venta"** y filtra por `salesActive`
> (lo decide `core/systems/sales.ts`; la UI solo lee el campo), con `Sparkline` —SVG por código,
> docs/10 §9— pintando `weeklySales` y las uds de la última semana.



### U3 · Creación de juego en modal, con selectores y "continuar desarrollo" 🎛️ P2 🟡
*(playtest #6)*
**Cambio:** la pantalla de concepción pasa a **modal**. Como habrá muchos temas/géneros/consolas, usar
**selectores/menús de elección** (no listar todo de golpe). En la ventana de desarrollo, añadir un botón
**"Continuar desarrollo"** que reanuda y pone el tiempo en **x1**.
**Toca:** `10` (UI concepción/desarrollo), `02` §2.

> **✅ Implementado (Fase 8.5).** `ConceptionScreen` → `ConceptionModal`: la concepción deja de ser una
> pantalla (fuera del tipo `Screen`) y pasa a `conceptionOpen` + `openConception`/`closeConception`.
> **Abrirla pausa** (docs/02 §1: ninguna decisión importante con el reloj corriendo), y el formulario se
> monta/desmonta con el modal (cerrar y reabrir empieza de cero). **Tema, género y plataforma** usan
> `<select>` nativos (teclado, accesibles y escalan al catálogo que crece por era), con la tendencia
> ↑→↓ y la etapa de la plataforma en la etiqueta de cada opción y una línea de detalle debajo; **público
> y tamaño** siguen como botones (4 opciones fijas, y el tamaño enseña su 🔒 de E1). El veredicto —Fit,
> estimación y "Empezar desarrollo"— queda fijo en el pie, sin scrollear. La tecla **2** abre el modal en
> vez de navegar; Esc lo cierra. **"Continuar desarrollo"** (`ContinueDevButton`) reanuda a x1 desde la
> ventana de desarrollo. El tutorial (7F) sigue en pie: sus anclas `new-game`/`fit-meter`/`start-dev` se
> conservan y la guía (z-35) pinta por encima del modal (z-30).
>
> **Ampliación pedida en playtest (misma fase).** El desarrollo también pasa a **modal**
> (`DevelopmentScreen` → `DevelopmentModal`, fuera del tipo `Screen`, ahora `devProjectId`) y se juega
> **por fases** (docs/02 §2): la ventana se abre al concebir y en **cada cambio de fase** —el store ya
> pausaba ahí, así que el núcleo no se toca—, "Continuar desarrollo" la cierra y reanuda a **x1** para
> ver trabajar a la Oficina Viva, y al terminar Pulido se lanza. Se reestructura en **dos columnas**
> (izquierda: la decisión de la fase —esfuerzo y, en Concepto, features—; derecha: contexto —equipo y
> marketing, que solo abre desde Producción—) en vez de la pila vertical que hacía incómoda la pantalla.
> Además: **"+1 semana" se retira** de los controles de tiempo (el reloj se gobierna con la velocidad y
> el juego pausa solo cuando toca decidir) y la **barra de scroll** de los modales gana diseño propio
> con tokens (`.scroll-slim`), porque la del sistema desentonaba con las pieles de era.

### U4 · Notificaciones de dos niveles (las importantes paran el tiempo) 🎛️ P1 🟡
*(playtest #8)*
**Problema:** las notificaciones abajo a la derecha pasan desapercibidas.
**Rediseño — dos niveles:**
- **Menores (toast):** siguen abajo a la derecha, no interrumpen (ventas rutinarias, cambios leves de sentimiento).
- **Importantes (modal que PAUSA el tiempo):** aparecen centradas, detienen el juego y piden
  **"Aceptar"/"Continuar"** para que no se escapen. Lista baseline de importantes:
  - **Un juego sale del mercado** → resumen **P&L**: cuánto **generó** vs cuánto **costó**, y aviso de
    que deja de dar ingresos (transparencia pura, Pilar 2).
  - Escándalo/crisis, cambio de era, renuncia de un empleado clave, aviso de bancarrota inminente,
    premio ganado, desbloqueo de etapa de escala.
- Definir en datos qué evento es "menor" vs "importante" (data-driven, fácil de ajustar).
**Toca:** `10` (notificaciones), `07` (crisis), `06` (bancarrota/premios).

> **✅ Implementado (Fase 8.2).** Clasificación data-driven en `src/data/notifications.ts`
> (`IMPORTANT_NOTICES` + `TOAST_HIDDEN_TYPES`). Cuatro avisos usan un **modal genérico** que pausa
> (`ImportantNoticeModal`): salida del mercado con **P&L** (generó vs costó; el coste se fija al lanzar
> en `ReleasedGame.cost` = desarrollo + licencia + marketing), **toda** renuncia (ajuste sobre el
> baseline: no solo "clave"), aviso de bancarrota en la 1ª semana en rojo, y subida de etapa. Crisis,
> cambio de era y premio ya tenían su **beat dedicado** (docs/10 §7) y se mantienen. La pausa la
> dispara el store al encolar (`pendingNotices`), nunca el núcleo (docs/08).

---

## Orden de implementación sugerido (Bloque 1)

Cada línea ≈ un prompt de Claude Code. Orden pensado para arreglar lo que molesta antes de lo cosmético:

| # | Prompt | Incluye | Por qué aquí |
|---|--------|---------|--------------|
| 8.1 | **Bugs y topes** | B1, B2 | Arreglar lo roto primero; barato y de alto alivio |
| 8.2 | **Notificaciones importantes** | U4 | Afecta a que el jugador *se entere* de todo lo demás |
| 8.3 | **Balance de dificultad** | E1, E2, E3 | El corazón del rebalanceo (tamaños, marketing, despidos) |
| 8.4 | **Progresión del conocimiento** | P1, P2 | Cambio de diseño; mejor con el balance ya tocado |
| 8.5 | **Reorganización de pantallas** | U2, U3 | Limpieza de UI y flujo de creación |
| 8.6 | **Cronología de eras y escala** | U1 | Cosmético/feel; buen cierre del bloque |

**Notas:**
- Cada prompt: leer los docs que toca + `08` (arquitectura), plan breve, implementar, **tests de lógica
  verdes**, captura y commit ("Fase 8.x: …").
- Los cambios de diseño (P1, P2, E1) actualizan la baseline: al implementarlos, reflejarlos en `02`/`03`/`09`/`12`/`16`.
- Cuando me pases el Bloque 2, lo integro aquí o en un `18-…` y re-priorizo el conjunto.
