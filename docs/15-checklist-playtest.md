# 15 — Checklist de Playtest y "Definición de Hecho"

Herramienta para jugar el juego con ojo crítico, cazar todo lo mejorable y traérmelo
**estructurado** para armar el plan de pulido. No es una fase de desarrollo: es tu guía de jugador-QA.

## Cómo usarla

- Ten esta checklist **abierta mientras juegas** y anota **en el momento** (lo que no se anota, se olvida).
- Juega **al menos 3 partidas completas E1→E7**, una por filosofía: **indie de culto**, **fábrica AAA**,
  **equilibrado**. Es la mejor prueba de rejugabilidad.
- Juega **una partida "a lo bruto"** rompiendo cosas a propósito (crunch extremo, monetización máxima,
  precios absurdos) para cazar bugs y desbalances.
- Para cada cosa que anotes, usa la **plantilla de nota** (§I): dónde, qué esperabas, qué pasó, gravedad.

Gravedad: **🔴 bloqueante** (rompe el juego / no se puede seguir) · **🟠 molesto** (funciona pero mal /
confuso / desbalanceado) · **🟡 detalle** (pulido, "quedaría mejor si…").

---

## A. Definición de Hecho — los 4 objetivos medibles (doc `00` §9)

El juego está "terminado" solo si estos 4 pasan. Márcalos tras jugar:

- [ ] **Rejugabilidad:** las 3 filosofías se sienten **distintas** y las 3 son **viables** (ninguna es un callejón sin salida).
- [ ] **Legibilidad:** puedes explicar **en una frase** por qué cada juego tuyo triunfó o fracasó.
- [ ] **Tensión moral:** dudaste **de verdad** al menos una vez ante codicia vs integridad.
- [ ] **Curva sentida:** el garaje y la megacorporación se sienten como **escalas distintas** de juego.

## B. Bugs y funcionalidad

- [ ] Guardar/cargar funciona y no corrompe la partida.
- [ ] No hay errores en consola; nada se congela ni se queda a medias.
- [ ] Todos los botones y pantallas hacen lo que dicen.
- [ ] Controles de tiempo (pausa / x1 / x2 / x4) responden bien.
- [ ] Nada de números "raros" (NaN, negativos imposibles, porcentajes >100).
- [ ] La partida se puede terminar (llegar a E7 / bancarrota / retiro) sin atascarse.

## C. Balance (por sistema)

- [ ] **Economía:** ¿el dinero aprieta lo justo? ¿te arruinas demasiado rápido o nunca? ¿los préstamos importan?
- [ ] **Calidad:** ¿las notas tienen sentido? ¿se nota el fit, el balance diseño/técnica y los bugs?
- [ ] **Mercado:** ¿el *momento* de lanzar importa? ¿subirse a una moda vs innovar se sienten distintos? ¿saturar penaliza?
- [ ] **Personal:** ¿el crunch tienta y castiga de verdad? ¿se nota la moral/energía/burnout? ¿renuncia gente?
- [ ] **Dilema moral:** ¿la codicia es tentadora **pero** arriesgada? ⚠️ ¿algún extremo (codicia pura o integridad pura) es "el óptimo"? → si sí, es un **fallo de balance** a anotar.
- [ ] **Comunidad/streamers:** ¿el marketing es una decisión con riesgo? ¿las crisis son **trazables** a algo que hiciste?
- [ ] **Eras/escala:** ¿el ritmo se sostiene? ¿alguna era se siente **vacía** o **eterna**?
- [ ] **Duración:** ¿la partida completa cae en ~**8–10 h / 35–45 juegos**? ¿se hace larga o corta?

## D. Claridad y UX (Pilar 2 — legibilidad)

- [ ] Entiendes **siempre** qué está pasando y por qué.
- [ ] El **desglose de reseña** te enseña algo accionable (no solo una nota).
- [ ] No hay números sin contexto ni barras misteriosas.
- [ ] El **onboarding** te dejó jugar sin perderte.
- [ ] Los **estados vacíos** invitan a actuar (no son un "no hay nada").
- [ ] Las decisiones importantes se entienden antes de tomarlas (coste/beneficio visible).

## E. Feel y jugosidad (pilares visuales)

- [ ] Se siente **un juego**, no un panel de administración.
- [ ] La **Oficina Viva** refleja el estado (moral/crunch/éxito/crisis) y da vida.
- [ ] Los **momentos señal** (gala de reseña, crisis, Balanza "El Precio") tienen impacto.
- [ ] Las **animaciones** ayudan; ninguna estorba, marea o se hace lenta.
- [ ] Las **pieles de era** se sienten distintas **y** se leen bien.
- [ ] El **sonido** aporta; el **mute** funciona; nada es molesto en bucle.

## F. Accesibilidad

- [ ] Contraste legible en **todas** las pieles (incl. E1 CRT y E3 beige).
- [ ] Navegación por teclado, escalado de fuente y "reducir animaciones" funcionan.

## G. Diversión y "wishlist" (lo más importante y lo más subjetivo)

- [ ] ¿**Te lo pasaste bien**? ¿Volverías a jugar? ¿En qué momento te aburriste o te enganchaste?
- [ ] ¿Qué mecánica/contenido **echaste en falta**?
- [ ] ¿Qué detalle pequeño te **sacó** de la experiencia?
- [ ] ¿Qué fue lo **mejor**? (para no romperlo al pulir)

---

## H. Plantilla de nota (rellena esto y me lo traes)

Copia esta tabla y ve añadiendo filas mientras juegas:

| # | Categoría (A–G) | Dónde / cuándo (era, pantalla) | Qué esperabas | Qué pasó | Gravedad | ¿Captura? |
|---|-----------------|-------------------------------|---------------|----------|----------|-----------|
| 1 | | | | | 🔴/🟠/🟡 | sí/no |
| 2 | | | | | | |
| 3 | | | | | | |

## I. Qué hacemos con esto

Cuando me traigas las notas (aunque sean muchas, mejor), montamos un **plan de pulido dirigido por
playtest** ("Fase 8 — Pulido") por lotes, priorizando en este orden:

1. 🔴 **Bloqueantes** (bugs que rompen el juego).
2. 🟠 **Balance y claridad** (lo que funciona pero frustra o confunde).
3. 🟡 **Detalles y wishlist** (lo que lo lleva del "muy bien" al "redondo").

Sin límite de pasos ni de prompts: pulimos hasta que estés al 100% conforme. Trae todo — cuanto más
concreto (con capturas y la gravedad), más rápido y certero sale el plan.
