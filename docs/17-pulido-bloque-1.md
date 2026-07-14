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

### U2 · Menú desplegable + modales; pantalla principal más limpia 🎛️ P2 🟡
*(playtest #5)*
**Cambio:** llevar a un **menú desplegable** (que abre **modales**) las opciones de: Juegos lanzados,
Partida (Guardar, Cargar, Nueva partida, Volver al título, Retirarse, Ver legado) e Historial — para que
no ocupen pantalla siempre. La **pantalla principal** muestra solo los **juegos que aún se venden**, cada
uno con un **mini-gráfico** de copias vendidas por semana (refuerza el Pilar 2: ves la cola de ventas).
**Toca:** `10` (layout/pantallas).

### U3 · Creación de juego en modal, con selectores y "continuar desarrollo" 🎛️ P2 🟡
*(playtest #6)*
**Cambio:** la pantalla de concepción pasa a **modal**. Como habrá muchos temas/géneros/consolas, usar
**selectores/menús de elección** (no listar todo de golpe). En la ventana de desarrollo, añadir un botón
**"Continuar desarrollo"** que reanuda y pone el tiempo en **x1**.
**Toca:** `10` (UI concepción/desarrollo), `02` §2.

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
