# 19 — Expansión (Fase 9): "El juego que no se resuelve"

Expansión grande nacida del playtest: en la práctica el juego **se resuelve** hacia la era 2-3 (haces
Grandes/AAA que sacan 70-88 fiable, imprimes dinero y aceleras el tiempo hasta el final). Es **una sola
enfermedad** con muchos síntomas: *nada se mantiene escaso y el reto no supera a la maestría*. Como
resume la propia guía de diseño del jugador: **"el jugador siempre debe sentir que le falta algo
(tiempo, dinero o talento)"**. Esta expansión reintroduce esa tensión.

> Se construye **sub-fase a sub-fase** (9.1 → 9.7), como el roadmap. Cada una actualiza la baseline
> (docs `02`–`16`) al implementarse. Todos los números van a `data/balance.ts` y se rebalancean con los
> **bots** (`08` §8). Respetar las notas de máquina (sin `AnimatePresence mode="wait"`; verificar vía CDP).

## Los 7 pilares (orden de construcción)

| Sub-fase | Pilar | Ataca |
|----------|-------|-------|
| **9.1** ✅ | Escalada + reseñas (+ dilema con dientes + marketing sin tope) | Que se resuelva; el 88 al arranque |
| **9.2** ✅ | Motores / Tecnología | Escasez permanente; techo de los juegos grandes |
| **9.3** | Features por género | Intuición y profundidad en la creación |
| **9.4** | Tendencias tipo "fiebre" (+ más consolas / multiplataforma) | Repetición; mercado muerto |
| **9.5** | Estudios rivales con IA | "No estás solo"; adaptación forzada |
| **9.6** | Publishers + Early Access | Escasez temprana; arco de negocio |
| **9.7** | GaaS + adquisiciones | Piloto automático del late-game |

---

## 9.1 — Escalada + reseñas `[IMPLEMENTADO · commit "Fase 9.1: escalada y reseñas"]`

> Baseline actualizada en `03` §3.1/§5, `04` §3–5, `05` §2, `06` §3–4/§7, `12` §3/§4/§6 y `16` §2/§12.
> Fórmulas y números en `data/balance.ts` (`quality.ceiling`, `quality.scope`, `market.reviews`,
> `reputation.decay`); CA verificados con tests (`escalada.test.ts`, `fullGame.test.ts`) y bots.
> Capturas: `capturas/9-1-resena-temprana.png` y `capturas/9-1-resena-madura.png` (script
> `scripts/verify91.mjs`, escaparates `?demo=escalada[&madura=1]`).

**Meta:** que el juego deje de resolverse; que el 88 al arranque sea imposible y las obras maestras se ganen.

### El techo de calidad es DINÁMICO (no un tope fijo por era)
`techoQ = f(madurezEstudio, mejorTalentoRelevante, profundidadInvestigación/adecuaciónTech, encajeAlcance)`:
- **Madurez del estudio:** en garaje el techo es **~40-55**, juegues como juegues. Sube **despacio** a lo
  largo de muchos lanzamientos y del crecimiento de escala.
- **Mejor talento relevante:** una **obra maestra (85+) exige una estrella** en el rol clave del género,
  no solo cuerpos. (Refuerza la escasez de talento.)
- **Adecuación tecnológica:** profundidad de investigación relevante (en 9.2 pasa a ser el **motor**).
  Poca tech = techo bajo.
- **Encaje de alcance (ambición vs capacidad):** intentar un AAA con un estudio flojo → no llenas el
  alcance → la calidad **se hunde**. Un juego pequeño y pulido con buen equipo alcanza fácil su techo (más bajo).

### Las expectativas suben más rápido que tu comodidad
La reseña compara tu calidad interna contra un **listón por era, en parte oculto**. Un "70 interno" saca
~8/10 en E2 y ~6/10 en E5. Desacopla calidad de nota y evita acomodarse.

### La ejecución perfecta llega al techo, pero la repetición SATURA `[DECIDIDO]`
Decisión del diseñador: **la ejecución perfecta de un juego seguro PUEDE alcanzar el techo** (no exigimos
innovar para el 90+). Para que eso no reabra el "se resuelve", **repetir la misma fórmula fatiga** a
público y crítica (la saturación de `04` con más peso): puedes sacar un notón con un género seguro, pero
hacerlo una y otra vez **decae**. Sumado a expectativas + rivales + fiebres, empuja a variar sin castigar
jugar seguro una vez.

### Nota con banda estrecha y legible `[DECIDIDO]`
Un gran juego tiene un **rango ±3-5**, no un número exacto (algo de gusto crítico y humor del mercado que
no controlas del todo), pero **siempre explicable** ("gran pulido, pero les pareció derivativo"). Deja de
ser calculadora sin volverse injusto (Pilar 2 intacto).

### Reencuadrar los primeros juegos como LOGRO
Eres una persona con un casete en un garaje; un **45 es un buen primer juego**. La UI celebra "tu mejor
juego hasta ahora", relativo a tu trayectoria, no en absoluto.

### Incluye también (misma fórmula/economía):
- **Dilema con dientes:** la reputación **decae** sola con el tiempo; el público es más exigente; y las
  palancas de codicia son **de verdad más rentables**, para que ser querido cueste un sacrificio real.
- **Marketing sin tope:** quitar el límite del 100%; el marketing pasa a ser un **amplificador de alta
  varianza** — cuanto más metes, más subes si el juego cumple **y** más te hundes (ventas y reputación)
  si falla. Representado con un número que impresione, no una barra tope.

**CA:** un primer juego no puede pasar de ~55; las obras maestras aparecen a media/tarde partida y se
sienten ganadas; repetir la misma fórmula decae; los bots confirman que el juego ya **no se resuelve**
en E2 y que las 3 filosofías siguen viables.
**Toca:** `03` (calidad/reseña), `04` (expectativas/saturación/hype), `06` (reputación/economía),
`05` (talento estrella), `02` (madurez/escala), `12`/`16`.

---

## 9.2 — Motores / Tecnología `[IMPLEMENTADO · commit "Fase 9.2: motores y tecnología"]`

> Baseline actualizada en `02` §2/§3.3, `03` §3.1, `04` §7, `09` §4.1, `12` §3/§6 y `16` §2/§6.1/§12.
> Datos en `data/engines.ts` (capacidades + catálogo licenciable) y `balance.engines` +
> `balance.quality.ceiling.engine`; lógica en `core/systems/engines.ts`; CA verificados con tests
> (`engines.test.ts`, `fullGame.test.ts`) y bots. Capturas: `capturas/9-2-motores.png` y
> `capturas/9-2-concebir-motor.png` (script `scripts/verify92.mjs`, escaparate `?demo=motores[&concebir=1]`).

**Meta:** escasez permanente y el gran gate de calidad de los juegos grandes.
- **Construir motor propio** (I+D + dinero + tiempo) **o licenciar** uno de terceros (moderno ya, pero
  **royalty** sobre ventas y sin activo propio). Trade-off constante.
- El motor tiene **nivel tech y generación** (3D/online/físicas/kits de plataforma), atados a era e
  investigación, y es el **término tecnológico del techoQ** (9.1): un AAA/shooter 3D sobre motor
  obsoleto **topa bajo**; un juego pequeño/narrativo depende mucho menos (la demanda escala con
  tamaño y `idealTech` del género).
- **Los motores envejecen** de forma EMERGENTE: su nivel es fijo y la exigencia de la era sube
  (la escalera `demandByEra`) → hay que mejorar/reconstruir cada era (**sumidero recurrente** de
  dinero e I+D; mejorar cuesta el 60 % de construir). Reutilizar el motor amortiza la inversión.
- **Multiplataforma**: el motor decide a cuántas plataformas lanzas; bi/multi-plataforma son
  capacidades del motor que se investigan. La demanda de ventas SUMA las bases instaladas.
**Tocó:** `02`/`03` (techo), `04` (plataformas), `09` (esquemas), `12`/`16`; nuevo módulo de datos de motores.

## 9.3 — Features por género `[dirección]`

**Meta:** decisiones de creación con intuición.
- Cada feature **encaja o no según el género** (mundo abierto en RPG sí, en puzle no; online en shooter
  sí, en aventura narrativa no) y tiene **trade-offs** (barato/rápido/repetitivo vs caro/lento/calidad).
- Gateadas por investigación. Fin del "apila todos los features buenos": ahora hay que elegir con criterio.
**Toca:** `03` (features), `09` (datos de features + afinidad por género), `02` (investigación), `16`.

## 9.4 — Tendencias tipo "fiebre" (+ más consolas / multiplataforma) `[dirección]`

**Meta:** mercado vivo que premia adaptarse, no repetir.
- La mayoría de juegos son "normales"; **de vez en cuando** un género/tema entra en **fiebre corta**
  (unos meses) y luego cae. **No se ve todo el panel** — más sorpresa/organicidad. Un *hit* (tuyo o de
  un rival) puede **disparar** una fiebre.
- Añadir **más consolas por era** (que vayan saliendo poco a poco) y la I+D de multiplataforma (con 9.2).
**Toca:** `04` (tendencias/plataformas), `09` (consolas), `16`.

## 9.5 — Estudios rivales con IA `[dirección]` (activa el stretch de Fase 8)

**Meta:** "no estás solo"; adaptación y competencia reales.
- Rivales que **lanzan juegos** (aportan a saturación y disparan fiebres), compiten por **ventanas de
  lanzamiento** (¿esquivas su bombazo?), **roban talento** y pelean por los **premios competitivos** (7).
**Toca:** `04` (mercado), `05` (talento), `06` (premios), `07`, `16`.

## 9.6 — Publishers + Early Access `[dirección]`

**Meta:** escasez temprana y arco de negocio.
- Al principio firmas **contratos leoninos con publishers** (ponen dinero, se llevan ~70% + la IP);
  meta: reunir capital para **auto-publicarte**.
- **Early Access:** lanzar a medio hacer para financiarte y recibir feedback, con riesgo de quemar la
  reputación si te demoras en la 1.0.
**Toca:** `06` (economía/contratos), `07` (comunidad/EA), `02`, `16`.

## 9.7 — GaaS + adquisiciones `[dirección]`

**Meta:** arreglar el piloto automático del late-game (macro-gestión).
- **Live-service** (franquicias/MMO) con **mantenimiento** continuo (sumidero + riesgo si lo descuidas).
- **Adquirir estudios** para ingresos pasivos (sumidero de compra + gestión; pérdidas si los gestionas mal).
**Toca:** `06` (economía), `05`/`02` (multi-estudio), `16`.

---

## Orden y notas

```
9.1 escalada+reseñas ─► 9.2 motores ─► 9.3 features/género ─► 9.4 fiebres+consolas ─►
9.5 rivales ─► 9.6 publishers+EA ─► 9.7 GaaS+adquisiciones
```

- 9.1 es el cimiento (el techo dinámico); 9.2 le mete el motor como input principal.
- 9.4 y 9.5 van juntas (las fiebres se vuelven orgánicas con rivales).
- Cada sub-fase: leer sus docs + `08`, plan breve, implementar, **tests + bots verdes**, captura, commit
  ("Fase 9.x: …"), y actualizar la baseline afectada.
- Idea opcional futura descartada de esta expansión pero anotada: prototipado/pre-producción (de tu lista);
  se puede añadir como 9.8 si al jugar lo echas de menos.
