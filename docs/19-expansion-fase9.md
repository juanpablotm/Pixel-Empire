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
| **9.3** ✅ | Features por género | Intuición y profundidad en la creación |
| **9.4** ✅ | Tendencias tipo "fiebre" (+ más consolas / multiplataforma) | Repetición; mercado muerto |
| **9.5** ✅ | Estudios rivales con IA | "No estás solo"; adaptación forzada |
| **9.6** ✅ | Publishers + Early Access | Escasez temprana; arco de negocio |
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

## 9.3 — Features por género `[IMPLEMENTADO · commit "Fase 9.3: features por género"]`

> Baseline actualizada en `02` §3.2, `03` §2C/§5, `09` §5 y `16` §2/§7. Afinidad y variantes en
> `data/features.ts` (`fitsGenres`/`clashesGenres`/`variantGroup`); multiplicadores en
> `balance.quality.featureAffinity` (encaja 1 / neutro 0.5 / noEncaja −0.25; bugs de misfit ×1.75
> sobre `featureBugScale`); conocimiento en `research.featureInsights` + nodo *Teoría del diseño*
> (save v14). CA verificados con tests (`features.test.ts`, `fullGame.test.ts`) y bots. Capturas:
> `capturas/9-3-features-encaje.png` y `capturas/9-3-desglose-features.png` (script
> `scripts/verify93.mjs`, escaparates `?demo=features[&desglose=1]`).

**Meta:** decisiones de creación con intuición.
- Cada feature **encaja o no según el género** (mundo abierto en RPG sí, en puzle no; online en shooter
  sí, en aventura narrativa no) y tiene **trade-offs** (barato/rápido/repetitivo vs caro/lento/calidad:
  mundo abierto procedural vs artesanal, voz digitalizada vs doblaje completo — variantes excluyentes).
- La que no encaja **no aporta (resta) y multiplica sus bugs**: apilar hace daño neto; el desglose
  de reseña **nombra** las piezas fuera de sitio (Pilar 2). El encaje se muestra al elegir
  (verde/ámbar/rojo) pero **se gana** (8.4): lanzando (gratis) o con el nodo *Teoría del diseño*.
- Gateadas por investigación. Fin del "apila todos los features buenos": ahora hay que elegir con criterio.
**Toca:** `03` (features), `09` (datos de features + afinidad por género), `02` (investigación), `16`.

## 9.4 — Tendencias tipo "fiebre" (+ más consolas / multiplataforma) `[IMPLEMENTADO · commit "Fase 9.4: fiebres y consolas"]`

> Baseline actualizada en `04` §2/§3/§6/§7 y `09` §3/§4 y `16` §2/§13. El modelo de
> popularidad vive en `data/balance.ts` (`market.popularity` base plana + banda, `market.fevers`,
> `sales.popDemandScale`); la capa de fiebres en `core/systems/market.ts` (`buildFever`,
> `activeFeverFor`, `feverBoost`, spawn orgánico en `advanceMarket`) y el disparo por HIT en
> `core/systems/projects.ts`. Consolas nuevas en `data/platforms.ts`; save v15 (`market.fevers ??= []`).
> CA verificados con tests (`fevers.test.ts`, `market.test.ts`, `fullGame.test.ts`) y bots. Capturas:
> `capturas/9-4-fiebre-activa.png` y `capturas/9-4-plataformas.png` (script `scripts/verify94.mjs`,
> escaparate `?demo=fiebre[&plataformas=1]`).

**Meta:** mercado vivo que premia adaptarse, no repetir.

### Base plana + fiebres `[DECIDIDO]`
Se **eliminan las curvas lentas de años** que hacían que un género/tema fuera permanentemente mejor
(el min-max de "acampa en lo que está de moda"). Ahora **todo lo disponible se sienta en la MISMA base
plana** (`balance.market.popularity.base` 0,5); el ruido la deja vagar en una **banda estrecha ~42–58 %**
(`bandMin`/`bandMax`), así que **ninguno domina** y "¿qué juego hago?" lo decide el fit/tu
especialización, no la moda. **Lo que más importa es hacer buenos juegos.**

La ÚNICA variación fuerte son las **FIEBRES** (`balance.market.fevers`): de vez en cuando un género o
tema entra en fiebre —un pico temporal (intensidad 0,30–0,45 sobre la base) durante **8–16 semanas**,
sube rápido y decae a la base— y el jugador **puede aprovecharla o no**. Nacen de forma **orgánica**
(PRNG con semilla, ~2 %/semana con tope de 2 activas ≈ una cada ~1 año) o las enciende un **HIT**
propio (reseña ≥ 85, "fiebre del oro"; los rivales llegan en 9.5).

### Legibilidad (Pilar 2) `[DECIDIDO]`
El jugador ve las fiebres **ACTIVAS**, nunca las futuras: **aviso tipo noticia** al saltar (toast) +
tarjeta **"Fiebres activas"** con su cuenta atrás y **badge 🔥** en la fila del género/tema (docs/10).
Se acabó el panel predictivo de toda la línea temporal.

### Saturación de fiebre y ventas `[DECIDIDO]`
**Inundar una fiebre la satura más rápido** (`feverSaturationMult`, sobre la saturación de §3): subirse
tú con un buen juego la aprovecha, pero apilar secuelas la quema antes. La demanda usa la **pop
normalizada por la base** (`sales.popDemandScale`): mercado normal = 1, la fiebre multiplica por encima
(no es un mundo a media máquina, es la base + un extra real).

### Más consolas + multiplataforma `[DECIDIDO]`
Se añaden **consolas por era que salen escalonadas** dentro de la era (`data/platforms.ts`): decisión de
en cuál y cuándo (dev-kit vs base instalada). La **I+D de multiplataforma ya existe** (capacidades
`biplataforma`/`multiplataforma` del motor, 9.2): más consolas la vuelven una decisión real; lanzar en
varias a la vez exige la capacidad del motor (test en `fevers.test.ts`).

**CA:** existe una fiebre que sube las ventas de su género en su ventana y luego decae; inundarla la
satura; un juego multiplataforma requiere la I+D/motor; repetir el mismo género ya no es óptimo (base
plana + fatiga de 9.1) y las 3 filosofías siguen viables.
**Tocó:** `04` (tendencias/saturación/plataformas), `09` (consolas + tipo `Fever`), `16`.

## 9.5 — Estudios rivales con IA `[IMPLEMENTADO · commit "Fase 9.5: estudios rivales"]` (cierra el stretch de Fase 8)

> Baseline actualizada en `04` §2.1/§3/§9, `05` §7, `06` §7, `11` (Fase 8), `12` §2/§10 y `16`
> §2/§13/§14. Roster y perfiles en `data/rivals.ts`; comportamiento en `balance.rivals`; lógica en
> `core/systems/rivals.ts` (tick con stream propio) + ganchos en `projects`/`staff`/`awards`; panel
> de Industria en `ui/screens/IndustryScreen.tsx`; save v16 (siembra el roster de la era del save).
> CA verificados con tests (`rivals.test.ts`, `windows.test.ts`, `poach.test.ts`, `awards.test.ts`,
> `fullGame.test.ts`) y bots (`rivalsReport.ts`). Capturas: `capturas/9-5-industria.png` y
> `capturas/9-5-premios-rivales.png` (script `scripts/verify95.mjs`, escaparate
> `?demo=industria[&premios=1]`).

**Meta:** "no estás solo"; adaptación y competencia reales.

- **Roster que EVOLUCIONA:** 12 estudios con tier (indie/medio/gigante), perfil (`fabrica` encadena
  secuelas e inunda, `prestigio` lanza poco y bueno, `oportunista` persigue fiebres) y entrada
  escalonada por eras — en 1980 ya existe una industria establecida (tú eres el garaje). Su
  **fuerza** sube con hits y fichajes y baja con flops; sostenida fuera de banda, **promociona o
  degrada el tier**, y un indie hundido **cierra**. Todo determinista y con noticia.
- **Lanzan juegos:** anuncian con 10–24 semanas de antelación y al salir **suman a la saturación**
  de su combo (docs/04 §3) y, si es un bombazo (reseña ≥ 85), pueden **encender una fiebre**
  (`source: 'rival'` — la "fiebre del oro" de docs/04 §2.1 ya es orgánica de verdad).
- **Ventanas de lanzamiento:** la campaña de un GIGANTE domina ±3 semanas alrededor de su fecha.
  Lanzar tu juego del mismo género dentro **aplasta tu pico day-one** (~−45 %, congelado al lanzar
  y siempre nombrado); la cola no se toca. Si tu proyecto termina en ventana disputada, el juego
  **espera con decisión**: lanzar igual o **retrasar** hasta que pase (la nómina corre — precio
  visible). Nunca es emboscada: el anuncio es público en el calendario de Industria.
- **Robo de talento** (docs/05 §7 por fin real): los rivales tientan a empleados con **lealtad
  hundida** — modal de **contraoferta** (igualas su salario PARA SIEMPRE o le dejas ir y el rival
  se fortalece, mucho más si era estrella) — y las renuncias espontáneas pueden **fichar por la
  competencia**. La mala fama de Empleador atrae buitres.
- **Premios con nominados REALES** (docs/06 §7): la gala nomina los lanzamientos rivales del año
  con **tu mismo baremo** (reseña + prestigio-fuerza + escala×peso); el relleno ficticio queda solo
  para saves recién migrados. La calibración de 8.10 emerge de la industria: los establecidos van
  un tamaño por delante hasta E5 y en E6–E7 tu AAA excelente ya compite por el gordo.
- **Panel de Industria** (Pilar 2): ranking con tier y momento, **calendario de anuncios** (con ⚠
  si chocan con un proyecto tuyo), lanzamientos recientes (🔥 si encendieron fiebre) y cierres.

**CA:** un rival lanza y satura su género; un hit rival puede disparar una fiebre; lanzar contra el
gigante en su ventana hunde ventas (y retrasar lo esquiva); un empleado con lealtad baja puede irse
a un rival (que se fortalece); los bots confirman presión real con las 3 filosofías viables.
**Tocó:** `04` (mercado/saturación/fiebres), `05` (talento), `06` (premios), `11`/`12` (stretch), `16`.

## 9.6 — Publishers + Early Access `[IMPLEMENTADO · commit "Fase 9.6: publishers y early access"]`

> Baseline actualizada en `02` §5, `06` §4.1/§4, `07` §4.1, `12` §6 y `16`. Catálogo de
> publishers en `data/publishers.ts` (perfil de trato: reparto, adelanto, IP, exclusividad,
> bolsa, distribución); factores en `balance.publishers` y `balance.earlyAccess`; lógica pura
> en `core/systems/publishers.ts` y `core/systems/earlyAccess.ts` + ganchos en
> `projects`/`sales`/`economy`/`market`; save v17 (campos opcionales, migración vacía).
> CA verificados con tests (`publishers.test.ts`, `earlyAccess.test.ts`, `fullGame.test.ts`
> CA 9.6a–c) y bots. Capturas: `capturas/9-6-publisher-oferta.png` y
> `capturas/9-6-early-access.png` (script `scripts/verify96.mjs`, escaparate
> `?demo=publisher[&ea=1]`).

**Meta:** escasez temprana y arco de negocio — de depender de otros a independizarte.

- **Contratos leoninos, congelados al firmar:** el publisher paga los **costes de arranque** y un
  **adelanto no recuperable** (semanas × coste dev × cobertura del perfil × tu reputación de
  prensa/crítica), y se lleva su **% del bruto para siempre** (0,55–0,75; el "~70 %") — mismo
  patrón que la royalty de motor. A veces exige la **IP** (`ipOwner: 'publisher'`, la limitación
  real de secuelas llega con 9.7) o **exclusividad de plataforma**; pone además una **bolsa de
  marketing** (tus campañas cobran de ella hasta agotarla) y su **red de distribución** agranda
  la demanda del juego entero (`distributionBoost`, +15–45 %): el 30 % de un pastel más grande.
  Sin la distribución el trato era pura trampa — el firmado pobre nunca acumulaba para
  independizarse (lección de bots).
- **Ofertas deterministas y sin PRNG** (`publisherOffersFor`): perfil × tamaño × reputación,
  comparables en una tarjeta junto a "Auto-publicado" en la concepción (Pilar 2). Catálogo
  escalonado por eras; la industria moderna (E5+) trata mejor — para entonces ya no la necesitas.
- **Escasez temprana REAL:** el capital inicial baja de 10.000 a **4.000 💰** (un pequeño cuesta
  ~4.100 con todo): auto-publicar el primer juego pasa por números rojos hasta que las ventas
  llegan; firmar (o el préstamo) es una decisión de verdad. Con 6–10k los bots demostraron que
  la oferta jamás se firmaba.
- **El arco emerge:** los bots firman sus 2–3 primeros juegos, se destetan al reunir caja y
  nadie vuelve a firmar desde E3; el primer ≥ mediano auto-publicado tras un trato dispara el
  hito **"Te has independizado"** (`stats.independenceWeek`, modal 🕊️ con el peaje acumulado).
- **Early Access (desde E5, decidido):** solo juegos **auto-publicados** (el publisher controla
  el lanzamiento de los suyos) y en fase de **Pulido**. Vende a precio rebajado con demanda a
  escala de "juego a medias" que decae sola; la comunidad **pule el juego** cada semana (QA y
  bugs). Pasada la **paciencia** (~1 año), quema progresiva de sentimiento y reputación
  (comunidad/hardcore), avisada y trazable. En la 1.0, los compradores de EA **recortan el pico
  day-one** (congelado como `overHypeTailPenalty`); si sale floja (< 60), **traición**: golpe
  extra escalado por cuántos compraron la promesa.

**CA:** con publisher entra dinero antes pero te quedas ~25–45 % del bruto; auto-publicar cuesta
más y rinde más; un EA demorado quema reputación de forma progresiva y nombrada; las 3
filosofías siguen viables y el arco de independencia existe (bots: firman en E1, libres desde E3).
**Tocó:** `02` §5 (EA nace en E5), `06` §4/§4.1 (contratos + capital inicial), `07` §4.1 (EA),
`12` §6, `16`; nuevos `data/publishers.ts`, `balance.publishers`, `balance.earlyAccess`.

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
