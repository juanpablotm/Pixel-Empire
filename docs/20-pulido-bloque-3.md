# 20 — Pulido dirigido por playtest · Bloque 3 (Fase 10)

Tercer bloque, del PDF "MejorasV3". Mismo formato que `17` y `18`, pero con **análisis crítico**: hay
propuestas que compro tal cual, otras que compro con matices, y **una cuyo diagnóstico creo que está
equivocado** (aunque el síntoma sea real).

**Leyenda:** Tipo — 🐞 Bug · ⚖️ Balance · 🎛️ UX · 🧩 Contenido. Prioridad **P1/P2/P3**.
Complejidad 🟢 baja · 🟡 media · 🔴 alta.

> ## ⚠️ Aviso crítico del bloque (léelo antes de implementar nada)
> **Tres de las siete propuestas (1, 3 y 4) aprietan la economía a la vez** — y lo hacen **encima** de
> la Fase 9.1 (techo de calidad más duro → menos ingresos tempranos) y de la 8.8 (overhead creciente +
> ampliación de pagar). Aplicarlas por separado y "a ojo" es la forma más rápida de **pasarse de
> frenada**: el juego saltaría de "demasiado fácil" a "grind castigador", sobre todo en el early game.
> **Decisión:** se implementan **juntas, como un solo pase económico** (10.2) y se rebalancean con los
> bots midiendo dos métricas concretas: *(a) juegos/semanas hasta la etapa 2* y *(b) ROI por tamaño*.
>
> **Y antes de eso, arreglar la vara de medir (W8).** Los bots de la 8.8 dijeron que nadie es Corporación
> antes de E5; el jugador humano llega a Estudio grande en E2. **Los bots juegan peor que tú y están
> firmando balances infra-ajustados.** Sin un bot que juegue bien, la 10.2 se valida con datos falsos.

---

## A. Bug

### W1 · Los préstamos no acumulan interés 🐞 P1 🟢
*(playtest #2)*
**Problema:** la deuda no crece; el préstamo es dinero gratis, lo que rompe la presión económica que
justamente intentamos crear.
**Arreglo:** aplicar el interés semanal (baseline ~1 %/sem, `12`) sobre el principal pendiente en cada
tick; que la deuda se vea crecer.
**Crítico — no basta con "sumar el interés":** hay que cerrar el círculo o el arreglo se queda a medias.
Verifica también (a) que el **flujo de devolución** descuenta bien principal vs intereses; (b) que la
**deuda es visible** en la UI y en el flujo de caja; y (c) que se dispara un **aviso importante**
(sistema de la 8.2) cuando la deuda crece sin control — si no, el jugador descubre la espiral de muerte
cuando ya es irreversible, y eso se siente injusto, no difícil.
**Toca:** `06` (economía/préstamos), `12`, `10` (avisos).

> **✅ Implementado (Fase 10.1)** — commit "Fase 10.1: préstamos con interés y bot optimizador".
>
> **La causa real del bug (no era "no se aplicaba el interés"):** desde la Fase 4 el tick SÍ cobraba
> `round(loanPrincipal × 1%)` en caja cada semana. El error era otro: **el interés no se ACUMULABA en la
> deuda** — el `loanPrincipal` se quedaba congelado para siempre. Como el préstamo no tiene vencimiento y
> la cuota de una deuda pequeña es trivial (1 % de 5.000 = 50 💰/sem, calderilla frente a la nómina), el
> crédito era **capital perpetuo casi gratis**: pedías 5.000, pagabas 50/sem sin que la deuda creciera
> nunca y sin obligación de devolverla. Por eso "los préstamos no acumulan interés" era literal: la deuda
> no acumulaba nada.
>
> **El arreglo (`core/systems/economy.ts`):** el interés **CAPITALIZA** sobre la deuda VIVA. Cada tick
> `loanInterest += round((loanPrincipal + loanInterest) × tasa)` y la deuda viva = principal + interés
> **compone** (crece exponencial si no amortizas). La tasa vive en `data/balance.ts`
> (`economy.loans.weeklyInterest = 0.01`). Ya no sale de caja: **engorda la deuda**.
> - **(a) Devolución** (`repayLoan`): salda **primero el interés** acumulado y luego el principal; se topa
>   a la deuda viva (nunca negativa) y exige caja (no se paga sin fondos).
> - **(b) Visibilidad:** deuda viva (con desglose principal + interés) e interés semanal en Finanzas y en
>   el HUD; el interés de cada semana es **línea propia del P&L** (`CashflowEntry.interest`, apunte de
>   memoria: no falsea el neto de caja porque capitaliza, no se paga).
> - **(c) Aviso de espiral** (`isDebtSpiraling` + flag `debtSpiral` + aviso importante de la 8.2, icono 🌀):
>   salta cuando el interés semanal supera `spiral.incomeRatio` (0,5) × ingreso medio reciente, con suelo
>   absoluto `spiral.minWeeklyInterest` (500 💰 ≈ deuda ≥ 50k) para no gritar por un puente trivial. Salta
>   en el flanco de subida y se rearma al saldar la deuda.
> - **(d) Migración** `v18 → v19`, no destructiva: `loanInterest: 0`, `debtSpiral: false`; la deuda vieja
>   **no se retro-capitaliza** (no se castiga por un bug pasado) pero desde ya crece con su interés.
>
> Tests: `core/systems/economy.test.ts` cubre los 3 CA (la deuda no amortizada crece semana a semana y
> compone; amortizar descuenta bien intereses vs principal sin quedar negativa; la espiral salta en el
> escenario esperado y no antes). **No cambia el balance de los 4 bots** (sostienen el préstamo solo como
> puente corto): los 552 tests siguen verdes.

---

## B. Pase económico (propuestas 1 + 3 + 4, acopladas) ⚠️

### W2 · Escalar el coste por tamaño de proyecto ⚖️ P1 🟡
*(playtest #1: "Mediano y Grande son muy baratos para lo mucho que conviene hacerlos")*

Reformulado con tu aclaración: el problema **no** es que los tamaños cuesten parecido en absoluto, sino
que **Mediano y Grande son baratos en relación a lo que rinden**. Eso es exactamente un problema de
**ratio**, y subir su coste es una forma directa y legítima de arreglarlo. De acuerdo contigo.

**Pero hay un detalle técnico que hace que la palanca obvia casi no funcione.** Coste total ≈ coste base
+ ~500 💰 por persona·semana:

| Tamaño | Coste base | Nómina (plantilla × sem × 500) | **Total** | El base es… |
|--------|-----------:|-------------------------------:|----------:|------------:|
| Pequeño | 500 | 3.000 | ~3.500 | 14 % |
| Mediano | 2.000 | 27.000 | ~29.000 | **7 %** |
| Grande | 8.000 | 168.000 | ~176.000 | **5 %** |
| Muy grande | 60.000 | 540.000 | ~600.000 | 10 % |
| AAA | 250.000 | 2.400.000 | ~2.650.000 | 9 % |

👉 **En Mediano y Grande el coste base es el 5-7 % del total: la nómina lo domina todo.** Subir el base
de 8.000 a 30.000 en Grande mueve el coste total un ~12 %. Imperceptible. Por eso "no se nota la
diferencia": la palanca que tocamos en la 8.3/8.8 es la que menos pesa justo en los tamaños de los que
te quejas.

**Rediseño propuesto — fijar una escalera de coste TOTAL, no de coste base:**
Regla de diseño: **cada tamaño cuesta ~×8 el anterior en total**, y los ingresos escalan **menos** (~×5-6)
→ más beneficio absoluto al subir de tamaño, **peor margen**, y mucho más riesgo.

| Tamaño | Total objetivo | Nómina actual | **Coste base necesario** |
|--------|---------------:|--------------:|-------------------------:|
| Pequeño | ~4.000 | 3.000 | 1.000 |
| Mediano | ~32.000 | 27.000 | **5.000** |
| Grande | ~256.000 | 168.000 | **88.000** |
| Muy grande | ~1.000.000 | 540.000 | **460.000** |
| AAA | ~4.000.000 | 2.400.000 | **1.600.000** |

Son órdenes de magnitud, no dogma — los bots afinan. Lo importante son las **dos condiciones de cierre**:
1. **ROI por tamaño plano o decreciente** (subir de tamaño da más dinero absoluto, no mejor margen).
2. **Un flop en Grande o superior debe poder hundirte.** Hoy casi seguro que no.
Si tras esto sigue sin notarse, la siguiente palanca no es el base: es **subir el coste por
persona·semana** o **alargar la duración** de los tamaños grandes.
**Toca:** `02` §2 (tamaños), `04` (demanda/ventas), `06`/`12` (economía), `16`.

### W3 · Subir el coste de ampliar el estudio ⚖️ P1 🟡 — *dirección sí, curva a corregir*
*(playtest #3, con números propuestos)*

Tu propuesta vs. lo vigente (8.8):

| Etapa | Requisito actual | **Tu propuesta** | Ampliación actual | **Tu propuesta** | Factor |
|-------|-----------------:|-----------------:|------------------:|-----------------:|-------:|
| Estudio pequeño | 25k | **200k** | 10k | **100k** | ×8–10 |
| Estudio | 200k | **1M** | 100k | **500k** | ×5 |
| Estudio grande | 1,5M | **6M** | 750k | **3M** | ×4 |
| Corporación | 8M | **12M** | 4M | **6M** | **×1,5** |

**Tus números de la mitad baja se aceptan.** Mi objeción inicial era que 200k para la primera ampliación
crearía un muro tedioso — **estaba equivocada, y tu dato de playtest la refuta**: si llegas a **Estudio
grande en la era 2 temprana**, es que el dinero temprano se acumula mucho más rápido de lo que yo asumía.
No hay riesgo de tedio en 200k; hay evidencia de que 25k es ridículo.

**Lo que sigue en pie es el techo.** Corporación pasa de 8M a 12M: **×1,5**, cuando todo lo demás sube
×4-10. Esa es la etapa cuyo "piloto automático" te molestaba. Recomiendo **subir mucho más el último
escalón**, manteniendo tu ratio limpio (ampliación = 50 % del requisito):

| Etapa | Tu propuesta | **Ajuste recomendado** |
|-------|-------------:|-----------------------:|
| Estudio pequeño | 200k / 100k | **200k / 100k** ✅ tal cual |
| Estudio | 1M / 500k | **1M / 500k** ✅ tal cual |
| Estudio grande | 6M / 3M | **6M / 3M** ✅ tal cual |
| Corporación | 12M / 6M | **25M / 12,5M** |

**Y una segunda palanca, porque solo con dinero no basta.** Si en E2 ya juntas 200k, en unas cuantas
partidas más juntarás 1M igual de rápido: **el capital no es un buen regulador de ritmo cuando los
ingresos crecen exponencialmente**. Propongo que el requisito de etapa deje de ser solo capital+plantilla
y añada un **gate de trayectoria**: nº mínimo de juegos lanzados y/o reputación mínima en algún segmento
(p. ej. Corporación exige un historial, no solo caja). Así crecer requiere *haber hecho carrera*, no solo
haber acertado dos lanzamientos.
**Toca:** `02` §4, `06`/`12`, `16`, y la nota de `18` V4-c.

### W4 · El sueldo sube al ascender de tier (junior → senior → estrella) ⚖️ P1 🟢
*(playtest #4)*
**Buen ojo: esto no es solo realismo, es cerrar un EXPLOIT.** Hoy formas a un junior hasta estrella y
sigues pagándole sueldo de junior → talento de élite a precio de saldo, que es justo lo contrario de la
"escasez de talento" que sostiene el techo de calidad de la 9.1.
**Arreglo:** al subir de tier, el salario pasa al del tier correspondiente (300 / 800 / 2.000 baseline).
Formar deja de ser gratis: ganas calidad, pagas nómina.
💡 **Variante más rica (opcional):** en vez de subir solo, el empleado **pide un aumento**; si lo
rechazas, baja moral/lealtad y puede irse (o lo ficha un rival, 9.5). Añade una decisión en vez de un
cobro automático. Recomiendo la versión simple como baseline y esta como mejora si te gusta el matiz.
**Toca:** `05` (formación/salarios), `12`, `16`.

### W8 · Los bots están mintiendo: falta un perfil "optimizador" 🧩 P1 🟡 — *añadido por mí*
*(no está en tu lista; sale de contrastar tu playtest con los datos de la 8.8)*

**El hallazgo más importante de este bloque.** Los bots de la 8.8 certificaron que *"nadie es Corporación
antes de E5"* y que *"el punto dulce muere"*. Tú, jugando, llegas a **Estudio grande en E2 temprana**.
Las dos cosas no pueden ser ciertas a la vez → **los bots juegan mucho peor que tú y están validando un
balance que a un jugador competente se le queda corto.**

Esto no es un detalle: significa que **cada pase de balance que hemos cerrado "con bots verdes" puede
estar infra-ajustado**, y que la 10.2 se validaría con la misma vara torcida.

**Arreglo:** añadir a `08` §8 un cuarto perfil, **"optimizador"**, que juegue cerca de óptimo — elige el
mejor Fit disponible, forma al equipo, cronometra lanzamientos con las tendencias, reinvierte agresivo y
sube de tamaño en cuanto le compensa. Los CA de balance pasan a exigir **dos cosas**:
1. Las 3 filosofías siguen viables (como hasta ahora).
2. **El optimizador tampoco resuelve el juego** — no llega a Corporación antes de E5 ni imprime dinero.

Sin esto, la 10.2 no se puede dar por cerrada con honestidad.
**Toca:** `08` §8 (bots), `11` (CA de fases de balance), `12`.

> **✅ Implementado (Fase 10.1)** — mismo commit que W1.
>
> Se añadió el 4.º perfil **`OPTIMIZER`** (`src/test/bots.ts`) y su documentación (`08` §8.1) y CA de
> balance (`08` §8.1 + `11`). Juega cerca de óptimo reutilizando la maquinaria competente de los otros
> bots, pero sin su prudencia: amplía con colchón mínimo (8 sem vs 52), salta al mayor tamaño **que su
> equipo puede ejecutar bien** (gate de `alcance01 ≥ 1`, no solo la plantilla mínima — la primera versión,
> sin ese gate, sobredimensionaba y **hundía sus propias reseñas a 40**, jugando PEOR que el equilibrado:
> un "optimizador" incompetente miente igual que los bots viejos), monetización codiciosa sin loot boxes,
> GaaS/filiales exprimidos. Determinista con semilla (`optimizer.test.ts`).
>
> **La verdad que arrojó (BOT_SEED, informe `optimizerReport.ts`):**
>
> | Perfil | Estudio (s3) | E. grande (s4) | Corp (s5) | Cap E5 | Cap final | Juegos | 85+ |
> |--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
> | Indie de culto | E2 s341 | — | — | 36k | 57k | 83 | 1 |
> | Fábrica AAA | E2 s378 | E3 s682 | E5 s1516 | 62k | 58k | 49 | 0 |
> | Estudio equilibrado | E2 s378 | E4 s1097 | — | 59k | 96k | 59 | 2 |
> | **Optimizador** | **E2 s302** | **E3 s680** | **E5 s1512** | **106k** | **93k** | 55 | **4** |
>
> **ROI por tamaño (Σ ingreso neto ÷ Σ coste atribuible) — la entrada directa de la 10.2:**
>
> | Perfil | Pequeño | Mediano | Grande | Muy grande | AAA |
> |--------|:---:|:---:|:---:|:---:|:---:|
> | Indie | 3,7× | 71× | — | — | — |
> | Fábrica | 3,3× | 26× | 134× | 97× | 44× |
> | Equilibrado | 3,3× | 39× | 125× | 69× | — |
> | **Optimizador** | 3,3× | 40× | **211×** | **223×** | 32× |
>
> **Veredicto (honesto, sin tocar balance):**
> - **El juego AGUANTA a un jugador competente, pero por los pelos.** El optimizador **NO llega a
>   Corporación antes de E5** (la alcanza en s1512, con **E5 empezando en s1509**: solo **3 semanas** de
>   margen). El gate de escala se sostiene, pero apenas — dato a vigilar en la 10.2.
> - **No imprime dinero ni hay punto dulce invencible:** su capital se estanca/baja en el late-game
>   (E5→E6→E7: 106k → 105k → 93k) y su libro de caja reciente tiene semanas en rojo — el burn de la
>   Corporación (overhead + obras de motor + AAA que la crítica endurece) sigue mordiendo. Su E6 se hunde
>   a nota media 36.
> - **Confirma el diagnóstico de W2 (coste por tamaño):** el ROI de **Grande (211×) y Muy grande (223×)**
>   es desproporcionado frente al Mediano (40×) — exactamente "Mediano/Grande baratos para lo que rinden".
>   Este es el número que la 10.2 debe corregir.
> - **Sobre el playtest ("Estudio grande en E2 temprana"):** el optimizador alcanza **Estudio (s3) en E2**
>   (s302 ≈ 1985), un año antes que los arquetipos, pero **Estudio grande (s4) solo en E3** (s680 ≈ 1993).
>   O el jugador humano juega aún más fino que nuestro mejor bot, o llamaba "estudio grande" a la etapa 3.
>   En cualquier caso, los bots ya no van infra-ajustados de forma grosera: la vara está enderezada.

---

## 📊 Resultados de la 10.1 — lo que dijeron los bots (y qué invalida)

Ejecutados los 4 perfiles. **El diagnóstico es peor de lo previsto y, sobre todo, distinto.**

**ROI por tamaño (Σ ingreso neto ÷ Σ coste):**

| Perfil | Pequeño | Mediano | Grande | Muy grande | AAA |
|--------|--------:|--------:|-------:|-----------:|----:|
| Indie | 3,7× | 71× | — | — | — |
| Fábrica | 3,3× | 26× | 134× | 97× | 44× |
| Equilibrado | 3,3× | 39× | 125× | 69× | — |
| **Optimizador** | 3,3× | 40× | **211×** | **223×** | 32× |

### 1. Tu queja queda confirmada con números — y era peor de lo que decías
El margen salta de **3,3× a 26-71×** en cuanto pasas a Mediano: un acantilado de ~×10 **en margen**, no
en beneficio absoluto. La regla de diseño "ROI plano o decreciente" no se incumple por poco: se incumple
por dos órdenes de magnitud. **El juego pequeño no es una opción, es un peaje de tutorial.**

### 2. El punto dulce NO es el AAA — es Grande / Muy grande
Grande y Muy grande rinden **125-223×**; el AAA cae a **32-44×**. El AAA ya está penalizado. Toda la
atención que le pusimos en 8.3/8.8 fue al tamaño equivocado.

### 3. ⚠️ La tabla está CONFUNDIDA — no tunear directamente contra ella
Autocrítica: esta medición mezcla *tamaño* con *momento de la partida*. Los juegos Pequeños se hacen en
el garaje (techo de calidad ~40-55, sin reputación, mercado diminuto); los Grandes se hacen a media
partida con equipo formado, motor al día y reputación alta. **Parte de ese 211× no es "Grande rinde
más", es "a media partida rindes más".**
Antes de fijar números en 10.2 hace falta una **medición controlada**: mismo estudio, misma semana,
mismo equipo y misma calidad → ¿qué habría rendido cada tamaño? Es un contrafactual que los bots pueden
calcular. Sin eso, corregimos el tamaño cuando el problema puede estar en el acoplamiento
calidad↔reputación↔mercado.

### 4. La paradoja del capital: dos extremos que se anulan
Con ROI de 100-200× durante decenas de juegos, el capital final del optimizador es **93k**. La Fábrica
llega a Corporación (requiere 8M) y termina con **58k**. Es decir: el sistema de ingresos es
absurdamente generoso **y** el overhead de la 8.8 (30k/sem en etapa 5 ≈ 1,5M/año) es absurdamente
brutal, y se cancelan. Un balance así es **frágil**: se ve plano al jugar y cualquier retoque lo hace
oscilar de forma violenta. Hay que bajar ambos extremos, no seguir apilando.

### 5. El Pilar 5 está roto: Corporación es una trampa
Convertirse en megacorporación **te empobrece** — juntas 8M, pagas 4M y el alquiler incinera el resto.
"De la nada a megacorporación" es el pilar 5 del juego, y ahora mismo el final del arco es un castigo.
Esto es un problema de diseño, no de números: **el overhead de etapa 5 debe bajar** y la escala debe
pagar por sí misma (más proyectos en paralelo = más ingresos), no ser solo un impuesto.

### 6. ⚠️ El optimizador NO reproduce tu partida — seguimos sin vara fiable
Tú llegas a **Estudio grande en E2 temprana**. El mejor bot llega en **E3, semana 680**. Siguen siendo
mundos distintos: el optimizador solo recortó ~20 % respecto a la Fábrica (s302 vs s378 para Estudio).
**W8 no está cerrado: la vara sigue corta.**

💡 **Hipótesis principal de la discrepancia: los préstamos.** Hasta la 10.1, la deuda no generaba
intereses → **el préstamo era dinero gratis infinito**. Un jugador humano lo explota para saltar etapas;
los bots probablemente no piden préstamos nunca. Si es así, tu "Estudio grande en E2" era un artefacto
del bug que acabamos de arreglar, y **parte de tu queja #3 ya está resuelta sin tocar ningún número.**
**Test concreto (va en 10.2):** correr el optimizador con endeudamiento agresivo, (a) con el bug y
(b) con el arreglo, y comparar semanas hasta cada etapa. Si (a) reproduce tu E2, hipótesis confirmada y
los umbrales de W3 hay que recalcularlos desde cero.

### Consecuencias para la 10.2
- ❌ **Se retira mi escalera de coste base ×8** (W2): con el ROI confundido y el acantilado en Mediano,
  fijar bases a ojo es tunear a ciegas. Primero la medición controlada.
- ⏸️ **Se congelan los umbrales de W3** hasta resolver la hipótesis del préstamo.
- ➕ **Entra al bloque un problema nuevo que no estaba en tu lista:** el overhead de etapa 5 y la trampa
  de Corporación (punto 5).
- La 10.2 pasa a tener una **fase de medición previa** antes de tocar un solo número.

---

## 📊 Resultados de la 10.2-A (medición) — tres hallazgos y dos autocríticas

### EXP 1 — El préstamo NO era la causa. Mi hipótesis falla.
El banco solo presta ~26 semanas de coste fijo (máx ~140k); el gate de Estudio grande pide 1,5M: dos
órdenes de magnitud fuera de alcance. Con bug o sin bug, la etapa 4 cae en E3 s680 en los tres casos.
**Mi hipótesis del préstamo (que defendía tus números de W3) queda refutada.** Lo más probable es un
malentendido de nombres: tu *"estudio grande en E2 early"* era casi seguro la **etapa 3 (Estudio)**, que
sí cae en E2 (s302-341) en todos los perfiles. Consecuencia: **no tenemos evidencia dura de que el ritmo
temprano esté roto**, solo tu sensación de que llegar a Estudio en E2 va rápido. Esto pesa en W3 abajo.

### EXP 2 — Tu queja original (W2) queda CONFIRMADA. Mi objeción falla.
Contrafactual limpio (mismo estudio/semana/equipo/Fit/calidad): a igualdad total de condiciones el margen
**se dispara con el tamaño** (Mediano ~60× → Grande ~128-166× → Muy grande ~123-163×) y el beneficio
absoluto crece de forma monótona hasta Muy grande. **El 211× de la 10.1 NO era efecto del momento de
partida — retiro mi "la tabla está confundida".** El acantilado está en **Grande**. Y el AAA es el único
penalizado (36×, reseña 39) por estar **infra-dotado**: alcance 0,77 con 40 personas. Dos problemas
distintos: Grande rinde demasiado; AAA rinde de menos por un bug de dotación.

### EXP 3 — La "trampa de Corporación" NO es el overhead. Mi diagnóstico falla (otra vez).
La etapa 5 **se paga a sí misma**: agregado +25.975k de margen operativo. El culpable real es **E6**, con
margen operativo **negativo (-53k/sem)**: la nómina de 40-48 personas + overhead corren de continuo
mientras el ingreso AAA es **lumpy** (solo 3 juegos en toda la era). Es un problema de **ejército
permanente vs ingreso a tirones**, no de alquiler. Mi "el overhead de etapa 5 es brutal / Pilar 5 es un
impuesto" era **apuntar al culpable equivocado.** El Pilar 5 no está roto por diseño; está roto por la
lumpiness del late-game.

### ⚠️ Hallazgo incidental — el arreglo de préstamos de la 10.1 es COSMÉTICO
La Fábrica cierra con principal 97k pero **124,9 mil millones** de interés acumulado: capitaliza sin tocar
caja, y `availableCredit` ignora el interés → una vez la deuda viva supera la caja, ya nunca se amortiza y
crece sin consecuencia. **El interés se acumula pero no muerde.** Además, ese número absurdo delata que el
modelo *capitaliza al 1 %/sem durante 1.500 semanas sin amortización forzada* — matemáticamente disparado.
El préstamo sigue sin "empujar hacia la codicia". Hay que rediseñarlo, no solo sumarle interés (va en 10.2-B).

---

## 10.2-B — Plan del pase económico (decidido tras la medición)

Contra la recomendación del bot, matizada:

**W2 · Coste base — ACEPTADO con guardarraíl.** Escalera 1k / 5k / 88k / 460k / ~800k (no 1,6M en AAA:
lo dejaría estrictamente dominado). EXP2 lo justifica. **Guardarraíl innegociable:** tras aplicarlo, el
**beneficio absoluto** debe seguir creciendo con el tamaño (Grande > Mediano en dinero, aunque su margen
sea menor); si no, nadie crece y rompemos el Pilar 5. Verificar con el contrafactual de EXP2 re-corrido.

**W2-bis · Arreglar la infra-dotación del AAA `[DECIDIDO: hacerlo viable]`.** Alcance 0,77 con 40
personas → reseña 39. Se corrige para que un AAA bien hecho sea una **cima real**, no un castigo. El
vector de arreglo es el mismo que resuelve la lumpiness (ver E6): **bajar plantilla, tiempo y alcance
exigidos** al AAA. **Guardarraíl:** el AAA debe quedar **por encima** de Muy grande (más coste base, más
techo de calidad, más ingreso potencial); si no, los dos tamaños se solapan y el AAA pierde sentido.

**W3 · Ampliar — mixto `[DECIDIDO]`.** El **gate de trayectoria es el regulador principal** (juegos
lanzados / reputación mínima), porque EXP1 prueba que el capital no regula las etapas 4-5. Encima, una
subida de capital **intermedia (~×3, no ×8)** para que no amplíes con la caja de un solo juegazo. Corp a
25M (no 12M). Nada de muro de capital agresivo temprano: EXP1 quitó la evidencia y arriesgaba tedio.

**E6 lumpiness `[DECIDIDO: AAA más ligero]`.** La solución elegida es **reducir la plantilla y el tiempo
que exige el AAA** (unificada con W2-bis): un ejército permanente más pequeño encoge el coste fijo que
corría en seco entre lanzamientos, que era el origen del margen operativo negativo de E6. Overhead etapa
5: trim modesto (30k→~20k) como apoyo, no como palanca principal.

**Préstamos — rediseño, no parche.** `availableCredit` debe descontar el interés acumulado, **y** la
deuda debe forzar amortización (pago mínimo semanal que drena caja) o tener tope, para que no capitalice
a 124 mil millones. El objetivo de diseño es que endeudarse sea una decisión con consecuencia, no dinero
gratis con un número decorativo al lado.

> ## ✅ Implementado (Fase 10.2-B) — el pase económico
>
> Todo el balance en `data/balance.ts`; validado con los 4 perfiles de bots (semilla `BOT_SEED`,
> arnés nuevo `src/test/economyReport102B.ts`). **574 tests verdes**, save **v19 → v20** no destructiva.
>
> ### Números finales
>
> | Palanca | Antes | **Ahora** |
> |---|---|---|
> | `economy.sizeBaseCost` | 500 / 2k / 8k / 60k / 250k | **500 / 5k / 88k / 460k / 1,2M** |
> | `development.phaseWeeksBySize.aaa` (×3 fases) | 40 (120 sem) | **32 (96 sem)** |
> | `development.sizeGate.aaa.minStaff` | 40 | **24** |
> | `quality.scope.powerTarget.aaa` | 26 | **12** |
> | `quality.featureScopeTarget.aaa` | 20 | **18** |
> | `quality.capByEraSize.aaa` (E4/E5/E6) | 94 / 96 / 98 | **95 / 97 / 99** |
> | `liveOps.requiredStaffBySize.aaa` | 16 | **11** |
> | `economy.upkeepExtraByStage[5]` | 30.000 | **22.000** |
> | `staff.scale.requirementsByStage` (capital+plantilla) | 25k / 200k+4 / 1,5M+8 / 8M+20 | **25k / 500k+4 / 5M+8 / 25M+20** |
> | …+ **gate de trayectoria** (nuevo) | — | **3 / 8 / 18 / 32 juegos** y cima de reputación **0 / 55 / 60 / 65** |
> | `staff.scale.upgradeCostByStage` | 10k / 100k / 750k / 4M | **12k / 250k / 2,5M / 12,5M** (50 % del requisito) |
> | `economy.loans.minPaymentRate` / `minPaymentFloor` | — | **2,5 %/sem · suelo 100 💰** |
>
> ### Tres desviaciones del plan, todas medidas con bots (no "a ojo")
>
> 1. **El PEQUEÑO no sube a 1.000** (se queda en 500). Con 1.000 el optimizador **quebraba en E2 s410**:
>    el garaje vive de márgenes de ~1k/semana y nunca juntaba la caja de su primer mediano, así que se
>    quedaba encerrado en juegos pequeños con nómina de estudio. Y encarecerlo va **contra** el objetivo
>    de W2: su ROI (3,3×) ya es el peor de la tabla, subirlo agranda el acantilado que veníamos a aplanar.
> 2. **El AAA aterriza en 1,2M**, no en 800k. El veto a 1,6M sigue en pie (dejaría al AAA estrictamente
>    dominado), pero con 800k el contrafactual medía un ROI de AAA (31–55×) **por encima** del Muy grande
>    (24–41×): la cima volvía a ser lo más rentable, incumpliendo la condición 1 de W2. A 1,2M el ROI
>    queda justo por debajo y el beneficio **absoluto** sigue doblándolo — que es la forma correcta de que
>    la cima sea cima: más dinero, peor margen.
> 3. **La etapa 2 no se toca** (25k). Se probó a subirla a 60–80k como sugería W3 y **encerraba al
>    estudio en el garaje**: el techo de ingresos de una etapa tiene que poder pagar la siguiente, o no
>    es un ritmo, es una jaula. La subida de capital queda en ~×2,5–3 para las etapas 3–5 y **la
>    trayectoria hace el trabajo fino**, que era justo lo que pedía el plan.
>
> ### Qué se implementó, sistema a sistema
>
> - **W2 · Escalera de coste base.** El coste base pasa del 5–7 % del total (donde no se notaba) a
>   >15 % en Grande/Muy grande/AAA. Invariantes fijados en `core/systems/economicPass.test.ts`.
> - **W2-bis · El AAA deja de ser una trampa.** Plantilla, calendario y alcance bajan **de forma
>   coherente entre sí** (24 personas / 96 semanas / alcance 12), de modo que una Corporación con su
>   plantilla mínima **llena** el alcance: la reseña del contrafactual sube de **39 a 66–73**. El
>   guardarraíl "por encima de Muy grande" se conserva en TODOS sus ejes (plantilla, calendario,
>   alcance, coste base, ingreso potencial, techo de calidad E4–E6 y bonus de la gala) y está testeado.
>   **Efecto buscado en E6:** el ejército permanente encoge y el margen operativo de E6 pasa de
>   **−53k/sem a +162k/sem** (optimizador).
> - **W3 · Ampliar = capital + trayectoria.** `expandBlockReason` sigue siendo el único punto de verdad
>   y ahora distingue cuatro motivos; los dos nuevos hablan de **carrera**, no de caja ("Necesitas N
>   juegos lanzados (llevas M): crecer se gana haciendo carrera"). La cronología de escala y el aviso
>   `scaleUp` los leen de la misma fuente. La reputación del gate es la **cima histórica**
>   (`stats.peakReputation`, nueva, registrada por el tick) y del **mejor segmento**: con la reputación
>   ACTUAL la fábrica cínica quedaba encerrada en la etapa 3 para siempre —su codicia hunde el vector
>   justo cuando junta el capital— y eso rompía "las 3 filosofías siguen viables".
> - **Préstamos.** (a) `availableCredit` descuenta la **deuda viva** (principal + interés), no solo el
>   principal; (b) **amortización forzosa**: cada tick el banco cobra `max(100, 2,5 % de la deuda viva)`
>   de la **caja**, pase lo que pase, saldando primero interés y luego principal; (c) el aviso de
>   espiral compara ahora la **cuota** (el drenaje real) con el ingreso reciente, conservando el suelo
>   absoluto para no gritar por un puente trivial; (d) Finanzas muestra interés y cuota por separado y
>   el P&L estrena `CashflowEntry.debtPayment` (dentro de `expenses`, desglosado para poder nombrarlo).
>   Como la cuota (2,5 %) supera al interés (1 %), una deuda desatendida **decrece** en vez de
>   dispararse. La prueba de que muerde: al desactivar la cuota en el A/B, la deuda de los bots vuelve a
>   **2,5 × 10¹³** — el número decorativo de la 10.1.
>
> ### Los bots también tenían trampas (y se corrigieron)
>
> La cuota obligatoria destapó dos vicios que el crédito gratis venía tapando desde siempre:
>
> - **Fichaban estrellas de 2.000 💰/sem con ingresos de garaje (~1.100 💰/sem).** Quedaban insolventes
>   para siempre y sobrevivían solo porque la deuda no costaba nada; con la cuota, la fábrica y el
>   equilibrado **quebraban en E2**. Ahora `maybeHire` solo ficha lo que el negocio sostiene (nómina ≤
>   ingreso medio del año) o lo que la caja respalda (un año entero de esa nómina).
> - **Encadenaban Grandes y Muy grandes con equipos cortos**, firmando reseñas de 24–41. Los tres
>   arquetipos llevan ya un `scopeMinRatio` (0,9, frente al 1,0 del optimizador): son ambiciosos, no
>   suicidas. Misma lección que el optimizador sin gate de la 10.1 — **un bot que publica basura no mide
>   el diseño, mide su propia incompetencia**.
>
> Además `manageLoans` se comporta como un jugador solvente: amortiza con el excedente sobre su colchón
> (no espera a poder saldar de golpe) y acota su deuda a lo que puede servir (la cuota no puede comerse
> más de un tercio del coste fijo semanal).
>
> ### Validación con bots — semilla 4242 (`npx vite-node src/test/economyReport102B.ts`)
>
> **1. Escala y trayectoria** (era/semana de cada etapa; entre paréntesis, juegos lanzados · cima de rep):
>
> | Perfil | E. pequeño | Estudio | E. grande | Corporación | Etapa final (ambición) |
> |---|:---:|:---:|:---:|:---:|:---:|
> | Indie de culto | E1 s154 (10j) | E2 s520 (29j·r90) | — | — | **3 (3)** ✅ |
> | Fábrica AAA | E1 s171 (11j) | E2 s416 (22j·r64) | E3 s902 (36j·r76) | **E5 s1800** (49j·r40) | **5 (5)** ✅ |
> | Estudio equilibrado | E1 s171 (11j) | E2 s415 (22j·r66) | E4 s1097 (42j·r76) | — | **4 (4)** ✅ |
> | **Optimizador** | E1 s154 (10j) | E2 s426 (23j·r68) | E3 s909 (37j·r74) | **E5 s1512** (46j·r63) | **5** ✅ |
>
> **2. Contrafactual de EXP2 re-corrido** (mismo estudio/semana/equipo/Fit; ROI y beneficio absoluto):
>
> | Estado | Tamaño | Coste | Ing. neto | ROI | Benef. abs. | Reseña | Alcance |
> |---|---|--:|--:|:--:|--:|:--:|:--:|
> | **E4** (s1093, et.4, 9 pers) | Mediano | 18k | 1.248k | 71,3× | 1.231k | 85 | 2,88 |
> | | Grande | 116k | 5.363k | 46,4× | 5.248k | 79 | 1,04 |
> | **E5** (s1512, Corp, 24 pers) | Mediano | 18k | 877k | 48,7× | 859k | 63 | 6,62 |
> | | Grande | 117k | 4.510k | 38,7× | 4.393k | 67 | 2,38 |
> | | Muy grande | 504k | 12.348k | 24,5× | 11.844k | 67 | 1,25 |
> | | **AAA** | 1.256k | 23.795k | **18,9×** | **22.539k** | **66** | **0,99** |
> | **E6** (s1873, Corp, 26 pers) | Mediano | 19k | 1.478k | 79,9× | 1.460k | 74 | 8,04 |
> | | Grande | 118k | 9.140k | 77,5× | 9.022k | 75 | 2,89 |
> | | Muy grande | 508k | 20.587k | 40,6× | 20.079k | 74 | 1,52 |
> | | **AAA** | 1.261k | 41.602k | **33,0×** | **40.342k** | **73** | **1,21** |
>
> **Los dos guardarraíles de W2 se cumplen en los tres estados medidos:** el ROI es **plano-decreciente**
> de Mediano hacia arriba (E6: 79,9 → 77,5 → 40,6 → 33,0 ×) y el **beneficio absoluto CRECE de forma
> monótona con el tamaño** — crecer da más dinero aunque el margen empeore, que es exactamente la regla.
> Compárese con la 10.2-A: el acantilado de Grande (145–166×) ha desaparecido, y el AAA pasó de
> **36,3× con reseña 39** (la trampa) a una cima real que dobla en beneficio absoluto al Muy grande.
>
> **3. Margen operativo por era de la partida que llega a Corporación** (💰/sem):
>
> | Era | Optimizador (10.2-B) | Fábrica (10.2-B) | *Fábrica (10.2-A)* |
> |---|--:|--:|--:|
> | E3 | +41.691 | +16.691 | *+28.116* |
> | E4 | +102.732 | +24.268 | *+80.771* |
> | E5 | +246.499 | +63.001 | *+69.626* |
> | **E6** | **+162.529** | **−9.911** | ***−53.339*** |
> | E7 | +447 | −50.059 | *+246.996* |
>
> **E6 deja de ser el agujero negro que era.** El overhead de la etapa 5 pasa de comerse el **27,6 %**
> del ingreso de la etapa a un **8–10 %** (optimizador). La fábrica sigue en rojo en E6–E7, pero por
> causa distinta y honesta: **compra la Corporación en decadencia** (reputación 4, reseñas 29, cinco
> escándalos) y dobla su nómina justo cuando su producto ya no vende. Eso es su codicia cobrándose la
> factura —"la codicia máxima quiebra por diseño"—, no la lumpiness del AAA.
>
> **4. Nota media por era y cierre:**
>
> | Perfil | E1 | E2 | E3 | E4 | E5 | E6 | E7 | Capital final | Deuda final |
> |---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|--:|--:|
> | Indie de culto | 60 | 68 | 77 | 72 | 69 | 65 | 62 | 39,9M | 0 |
> | Fábrica AAA | 58 | 68 | 72 | 55 | 54 | 29 | — | 1,6M | 0 |
> | Estudio equilibrado | 58 | 69 | 80 | 77 | 55 | 42 | 28 | 80,0M | 0 |
> | Optimizador | 60 | 71 | 80 | 82 | 65 | 43 | — | 172,4M | 0 |
>
> ### Criterios de cierre
>
> - ✅ **Las 3 filosofías siguen viables:** ninguna quiebra y **las tres alcanzan su etapa-ambición**
>   (indie 3, equilibrado 4, fábrica 5). En la 10.1 la fábrica llegaba a Corporación para empobrecerse;
>   ahora llega y el arco tiene sentido.
> - ✅ **El optimizador no resuelve el juego:** no llega a Corporación antes de E5 (**s1512**, con E5
>   empezando en **s1509** — el mismo margen de 3 semanas que la 10.1, dato que sigue mereciendo
>   vigilancia); ROI plano-decreciente; beneficio absoluto creciente con el tamaño; su E7 se queda en
>   **+447 💰/sem** y cierra la era en negativo (−1,5M): el burn del late-game sigue mordiendo.
> - ⚠️ **Lo que sí cambió de signo (y hay que decidir a propósito):** el optimizador cierra con
>   **172,4M** frente a los **93k** de la 10.1 — un salto de **~1.850×**, y TODOS los perfiles suben en
>   ese orden (indie 57k→39,9M, equilibrado 96k→80M). Es coherente con el contrafactual (un AAA de E6
>   rinde **40M netos**) y es la consecuencia buscada de que el AAA funcione y la etapa 5 no sea un
>   impuesto — la 10.1 se quejaba de lo contrario ("convertirse en megacorporación te empobrece"). **Pero
>   el efecto secundario es que el dinero deja de ser escaso en el late-game.** El *ratio* está domado
>   (plano-decreciente); el *grifo absoluto* es enorme. Sumado a que `legacy.wealthCapitalScale` (2M)
>   satura hace mucho — por encima de 2M el Capital ya no puntúa para el Legado — **el lado Capital del
>   dilema se desinfla en el endgame.** No es necesariamente un error (el reto puede desplazarse a
>   reputación/legado en la recta final, como en GDT), pero es una **decisión de diseño consciente**, no
>   un accidente. Candidato a su propio ítem de pulido.
> - ⚠️ **Agregado por perfil vs contrafactual.** En la tabla agregada de la fábrica el AAA queda por
>   debajo del Muy grande en beneficio medio, pero eso mide **su ejecución** (3 AAAs de reseña 28 hechos
>   en plena decadencia), no la curva de costes. El guardarraíl de W2 se verifica con el **contrafactual
>   controlado**, que es el instrumento correcto y sale monótono en los tres estados.

---

## C. Contenido

### W5 · Más consolas 🧩 P2 🟢
*(playtest #5)*
**Crítico — verificar solape primero:** la **9.4 ya añadió "más consolas por era, escalonadas"**. Antes
de añadir, revisar qué entró realmente y ampliar **desde ahí**, no duplicar.
**Refinamiento:** cada consola nueva necesita su ciclo de vida (base instalada), afinidad por género,
coste de dev-kit y **encaje con las capacidades de plataforma del motor (9.2)**. Añadir por añadir no
aporta: lo que da valor es que cada una abra una **decisión distinta** (¿portátil casual barata o
sobremesa cara de gran base?).
**Toca:** `09` §4 (plataformas), `04` (ciclos), `02`/`16`.

> **✅ Implementado (Fase 10.3)**
>
> **Auditoría previa (lo que la 9.4 ya había dejado).** El catálogo tenía 18 plataformas, pero el
> reparto era muy desigual **por disponibilidad simultánea**, que es lo que el jugador ve:
>
> | Era | A la venta a mitad de era (antes) | Nuevas de la era |
> |---|---|:---:|
> | E1 | PC Casero, Commo 64 | — |
> | E2 | PC Casero, Master V, Gameling | 2 |
> | E3 | PC Casero, Gameling, Playsystem, N-Cube, Vortex 32 | 3 |
> | E4 | + Playsystem 2, Vertex, Gameling Advance | 3 |
> | E5 | + Móvil, Playsystem 4, N-Switch | 3 |
> | E6 | + CloudPlay, Playsystem 5, Vertex X | 3 |
> | E7 | + Visor RV Mixta, Holo Deck (7 vivas) | 2 |
>
> **E1 con dos plataformas no es una decisión, es un trámite** — y es la era que TODO jugador ve. E2
> se quedaba en tres. De E4 en adelante la 9.4 ya había hecho su trabajo (6-8 vivas): ahí añadir
> habría sido el "clon numérico" que el propio W5 prohíbe. **Se añaden 3, todas en las eras flacas.**
>
> | Consola | Era | Ventana | Dev-kit | La decisión que abre |
> |---|:---:|:---:|--:|---|
> | **Atarix VCS** (Atarix Inc.) | E1 | s0–**240** | 3.000 | La cartuchera del boom: base masiva **ya**, público familiar (casual 1,30 · infantil 1,35 · hardcore 0,50) y afinidad pobre con los géneros de prestigio… pero **se la lleva la crisis del 83** y muere antes de que acabe su era. Ordeñar un mercado que se va a evaporar vs construir en el PC, que dura siempre. |
> | **Amigo 500** (Commo Ltd.) | E2 | s340–1000 | **0** | El micro de 16 bits: **plataforma abierta, sin dev-kit**, público hardcore (1,25) y afinidad **1,0** en estrategia/gestión/simulación/aventura, a cambio de la base instalada más pequeña de su generación (pico 820 frente a 1.100 y 1.400). Y aguanta hasta bien entrada E3: la apuesta lenta. |
> | **Gameling Color** (Ninten-Go) | E3 | s900–1400 | 10.000 | El portátil que **se queda fuera de la carrera 3D**: toda su generación son cajas de 32/64 bits con dev-kit de 20-25k; esta cuesta la mitad, tiene la mayor base entre las baratas y releva al Gameling justo cuando muere (s950). Su peaje: público familiar y afinidad pobre con lo que premia la crítica. |
>
> **El "techo de calidad percibida" de las máquinas masivas es EMERGENTE, no una regla nueva.** No se
> añadió ningún campo al esquema: su `audienceBias` empuja hacia Casual/Infantil y esos públicos ya
> pagaban peaje en la reseña del segmento Hardcore (`data/segments.ts`: casual −4, infantil −6). Todo
> el eje de decisión sale de las cuatro palancas que ya existían — ciclo de vida, sesgo de público,
> afinidad por género y dev-kit.
>
> **Encaje con el motor (9.2):** el vínculo plataforma↔motor sigue siendo el número de plataformas
> simultáneas (`maxPlatforms` de los kits bi/multiplataforma). Las nuevas **amplían el espacio donde
> ese kit paga**: en E3, Gameling Color + Playsystem cubre a la vez el público familiar y el hardcore,
> que es exactamente la combinación que antes no existía.
>
> **Escalera de la 9.4 respetada** (test): ninguna consola nueva se sale del pico de base instalada de
> su generación (margen del 10 %), y toda era tiene ya ≥3 plataformas a la venta a mitad de era.
>
> **Lista final por era (a la venta a mitad de era):** E1 **3** (PC Casero, Commo 64, *Atarix VCS*) ·
> E2 **4** (+ Master V, Gameling, *Amigo 500*) · E3 **6** · E4 **6** · E5 **6** · E6 **7** · E7 **7**.
> Total del catálogo: **21 plataformas**.

### W6 · Más features investigables 🧩 P2 🟡
*(playtest #7)*
**Refinamiento:** ampliar el catálogo de features, pero con dos reglas de calidad:
1. **Cada feature nueva debe habilitar una decisión, no ser un clon numérico.** Con la 9.3 en marcha,
   eso significa definir bien su `fitsGenres` / `clashesGenres` y, si procede, su **variante de
   trade-off** (barata-rápida vs cara-de-calidad).
2. **Cuidado con diluir la economía de investigación:** más objetivos con los mismos 💡 = todo se siente
   lejano. Ajustar la generación de puntos o el coste para que el ritmo de desbloqueo no empeore.
**Toca:** `09` §5 (features), `03` §2C, `02` §3 (investigación), `12`, `16`.

> **✅ Implementado (Fase 10.3)** — el catálogo pasa de **18 a 29** features.
>
> **(a) El criterio de "qué falta": los géneros hambrientos, no "más de lo mismo".** Contadas las
> features que **encajan** (verde) por género, el catálogo estaba desequilibrado: **Ritmo tenía UNA**,
> **Gestión dos**, **Battle Royale dos** y **Puzzle tres**, frente a las **ocho** de RPG y Aventura.
> Un juego de gestión Grande no podía ni llenar su objetivo de alcance con piezas que le pegaran (4,0
> de encaje disponible contra un objetivo de 13): se llenaba con relleno neutro, que es justo lo que
> la 9.3 vino a castigar. Las 11 nuevas se colocan ahí.
>
> | Feature | Era | Aporta / sem / bugs | Encaja en | No pega en | Variante |
> |---|:---:|:---:|---|---|---|
> | **Tutorial integrado** | E3 | 1 / 1 / 0,05 | Estrategia, Gestión, Simulación, Deportes, Puzzle | Terror, Sandbox | `accesibilidad` |
> | **Dificultad implacable** | E3 | 1,5 / 2 / 0,10 | Plataformas, Terror, Shooter, Estrategia, RPG | Gestión, Simulación, Deportes, Ritmo | `accesibilidad` |
> | **IA por guiones** | E3 | 1 / 1 / 0,06 | Shooter, Plataformas, Terror, Deportes, Carreras | Puzzle, Ritmo, Gestión | `ia` |
> | **Banda sonora licenciada** | E3 | 3 / 3 / 0,12 | Ritmo, Carreras, Deportes, Plataformas, Aventura | Terror, Estrategia, Gestión | `musica` |
> | **Campaña cooperativa** | E3 | 2,5 / 3 / 0,16 | Shooter, Aventura, RPG, Plataformas, Terror | Estrategia, Gestión, Puzzle, Ritmo | — |
> | **Economía simulada** | E4 | 2 / 2 / 0,12 | Gestión, Simulación, Estrategia, Sandbox, RPG | Ritmo, Plataformas, Carreras, Shooter | — |
> | **Clasificatorias online** | E4 | 2 / 2 / 0,15 | Shooter, Deportes, Carreras, Ritmo, Estrategia, Battle Royale | Aventura, Terror, RPG | — (nodo `tecnologiaOnline` + motor Online) |
> | **Personalización de avatar** | E4 | 1,5 / 2 / 0,08 | RPG, Deportes, Battle Royale, Simulación, Sandbox, Carreras | Puzzle, Aventura, Terror | — |
> | **IA adaptativa** | E5 | 3 / 3 / 0,18 | Shooter, Estrategia, Terror, Deportes, Carreras, Simulación | Puzzle, Ritmo, Aventura | `ia` |
> | **Modo espectador** | E6 | 2 / 2 / 0,12 | Battle Royale, Shooter, Deportes, Carreras, Estrategia | Aventura, Terror, Puzzle | — (nodo `serviciosOnline` + motor Online) |
> | **Diseño para realidad mixta** | E7 | 3 / 3 / 0,20 | Terror, Ritmo, Simulación, Aventura, Shooter, Carreras | Estrategia, Gestión, Puzzle | — |
>
> Resultado: **ningún género baja de 3 features que le encajen** y los cuatro hambrientos suben a 4-5
> (test). **Dos variantGroups nuevos** (`accesibilidad` y `ia`) y uno retroactivo (`musica`, que
> convierte la vieja *Banda sonora original* en la mitad barata de un dilema). `accesibilidad` no es
> el eje barato/caro habitual sino **a quién invitas**: sus listas de encaje son casi opuestas, así
> que la elección cambia el juego, no solo su precio.
>
> **⚠️ Decisión deliberada: E1 y E2 no reciben NADA.** Es el hallazgo más importante de la sub-fase.
> La primera versión metía cuatro features en E1/E2 y **rompía tres CA de golpe** — entre ellas la
> 9.1(a) ("nadie imprime 80+ antes de E3"). El mecanismo no era el que parecía: al haber más piezas de
> alto encaje, el bot llenaba el mismo objetivo de alcance con **menos** features, y como el
> `qaInvested` se acumula por semana trabajada, los proyectos salían con **menos deuda de bugs neta**
> → mejor pulido → mejor nota. El early game de la 10.2-B está calibrado al milímetro sobre el
> catálogo temprano exacto, así que **todo lo nuevo entra en E3 o después** y la simulación previa a
> E3 queda **idéntica bit a bit** (verificado: indie y optimizador alcanzan la etapa 2 y la 3 en las
> mismas semanas exactas que la 10.2-B). Hay un test que fija la lista de features de E1-E2.
>
> **⚠️ Lo que se probó y se descartó: "arreglar" el desempate de los bots.** Los bots ordenan las
> features por valor efectivo y desempatan **por id alfabético**, así que una feature nueva podía
> desplazar a una incumbente idéntica solo por cómo se llama. Se probó a desempatar por coste (a igual
> valor, la barata) — que es como jugaría una persona. **Se revirtió:** la tacañería compone
> brutalmente (proyectos más cortos → más lanzamientos → más 💡 → motores antes → mejores notas) y la
> fábrica pasaba de cerrar con 1,6M a **149,7M**, dejando de tener una sola semana en rojo. Es una
> mejora legítima del bot, pero **re-baselinea la 10.2-B entera**, que es justo lo que esta sub-fase
> tenía prohibido tocar. Queda anotado como candidato para cuando toque revisar los bots a propósito.
>
> **(b) La economía de 💡 no se diluye — medida, no prometida.** Arnés nuevo
> `src/test/researchPaceReport.ts` (`npx vite-node src/test/researchPaceReport.ts`), 4 perfiles,
> semilla `BOT_SEED`: semana de compra de cada nodo y su **Δ respecto a la semana en que su era lo
> habilita**.
>
> - **Ninguna feature nueva estrena nodo.** Las dos gateadas cuelgan de nodos que YA existían
>   (`tecnologiaOnline`, `serviciosOnline`), así que el mismo desembolso compra ahora más cosas; y
>   *Teoría del diseño* revela el encaje de las 29 por los mismos 14 💡.
> - **El coste TOTAL del árbol BAJA de 1.088 a 993 💡** (test de no-regresión). El catálogo nuevo no
>   cuesta puntos: cuesta **calendario**, y ese fue el daño real a medir.
>
> **El dato antes/después (Δ = semanas desde que la era habilita el nodo):**
>
> | Nodo | Era | 💡 antes → ahora | Indie antes → ahora | Otros 3 perfiles |
> |---|:---:|:---:|:---:|:---:|
> | QA profesional | E3 | 35 | Δ77 → **Δ78** | Δ3 → Δ3 |
> | Marketing dirigido | E3 | 30 | Δ14 → Δ14 | Δ4 → Δ4 |
> | Marketing viral | E5 | 80 → **65** | Δ3 → Δ3 | Δ3 → Δ3 |
> | Generación procedural | E5 | 70 → **50** | Δ20 → **Δ25** | Δ4 → Δ4 |
> | Juegos como servicio | E6 | 100 → **85** | Δ2 → Δ2 | Δ2 → Δ2 |
> | Infraestructura cloud | E6 | 110 → **90** | Δ96 → **Δ76** | Δ3 → Δ3 |
> | IA generativa | E7 | 150 → **125** | Δ1 → Δ1 | Δ30 → **Δ1** (equilibrado) |
> | *(los otros 14 nodos)* | | sin cambio | idénticos | idénticos |
>
> **Saldo: 66 de 68 mediciones idénticas o mejores.** Solo el indie —el perfil que vive de encadenar
> lanzamientos y el único que rozaba el cero de 💡— pierde 1 semana en un nodo y 5 en otro, y **gana 20
> en un tercero**; el equilibrado gana 29. Y llegan 2 features gateadas más sin pagar un 💡 extra
> (*Clasificatorias online* Δ2, *Modo espectador* Δ2).
>
> **Por qué se compensó bajando el coste de 4 nodos y NO subiendo la generación de puntos.** La
> palanca obvia era `releasePointsBySize` (+1 en pequeño y mediano). Se probó: recupera el ritmo del
> indie de sobra… **y riega también E1-E2**, donde el equilibrado se compraba antes su primer motor y
> firmaba un **13,8 %** de notas 80+ antes de E3 — rompiendo el CA 9.1(a) otra vez. Los 4 nodos que
> bajan son todos de **E5 en adelante**: no pueden tocar el early game ni la reserva de ahorro de los
> bots (siguen muy por encima del nodo más barato del árbol).

---

## D. UX

### W7 · No mostrar en investigación las eras aún no desbloqueadas 🎛️ P2 🟢
*(playtest #6)*
**Arreglo:** ocultar de la pantalla de I+D los ítems de eras futuras (hoy la llenan de ruido).
**Matiz crítico:** ocultarlo **todo** mata la aspiración ("ver lo que viene" motiva). Recomiendo
**ocultar los ítems concretos** pero dejar un **teaser discreto** ("La próxima era traerá nuevas
tecnologías") — la cronología de eras de la 8.6 ya cubre el misterio con sus "???", así que aquí basta
con desatascar la lista sin perder el gancho.
**Toca:** `10` (pantalla de I+D), `02` §3.

> **✅ Implementado (Fase 10.3)**
>
> Dos selectores **puros en el núcleo** (`core/systems/research.ts`), no lógica en el componente:
> `visibleResearchEras(state)` (las eras alcanzadas que tienen nodos) y `hasFutureResearch(state)`
> (¿queda tecnología por llegar?). `ResearchScreen` mapea sobre el primero en vez de sobre `eraOrder`
> y cierra la lista con el teaser cuando el segundo es cierto.
>
> - **Es presentación pura:** `researchNodeStatus` no se toca. Un nodo de E7 sigue existiendo y
>   siguiendo `bloqueado` en E4 — la vista solo deja de dibujar su fila. Hay un test que lo fija.
> - **El teaser** ("🔮 La próxima era traerá nuevas tecnologías. Todavía no existen: nadie del sector
>   sabe aún cómo se llamarán") va sin nombres ni números: el misterio concreto ya lo cuenta la
>   cronología de eras de la 8.6 con sus "???". **Y desaparece en E7**, donde ya no queda nada.
> - Las otras secciones de la pantalla no necesitaban nada: *Temas por investigar* y las capacidades
>   de motor ya filtraban por era desde 8.4 y 9.2.
>
> Verificado en el navegador real (`?demo=motores`, estudio de 2009): la pantalla lista E1-E5 y el
> teaser, sin rastro de E6/E7. Tests: 4 de núcleo (visibilidad por era, aparición al cambiar de era,
> ciclo de vida del teaser, y que ocultar no cambia el estado) + 3 de UI sobre el componente real.

---

## Orden de implementación sugerido (Bloque 3)

| # | Prompt | Incluye | Por qué aquí |
|---|--------|---------|--------------|
| **10.1** | Bug de préstamos + bot optimizador | W1, W8 | Ambos son **instrumentos de medida**: sin interés y sin un bot que juegue bien, el rebalanceo de 10.2 se calibra con datos falsos |
| **10.2** | Pase económico | W2, W3, W4 | Van juntos por fuerza; una sola tanda de bots decide los números finales |
| **10.3** | Contenido y UX | W5, W6, W7 | Consolas, features y limpieza de I+D; bajo riesgo, buen remate |
| ✅ | *cerrado* | | **Bloque 3 completo** — ver el cierre al final del documento |

**Notas:**
- **10.1 va primero por una razón concreta:** el bot optimizador (W8) es la vara con la que se mide la
  10.2. Construir la vara antes de medir.
- 10.2 es el corazón del bloque y **no se cierra sin bots**, midiendo: semanas/juegos hasta cada etapa,
  ROI por tamaño, que las 3 filosofías sigan viables **y que el optimizador no resuelva el juego**.
- Los números de W3 son los tuyos, salvo el escalón de Corporación (12M → 25M) y el gate de trayectoria.
- Recordatorio: la Fase 9 aún tiene pendiente la **9.7 (GaaS + adquisiciones)**. Conviene cerrarla antes
  o después de este bloque, pero **no a la vez** que el pase económico, para no mezclar variables.

---

## ✅ Medición 10.2-A — diagnóstico previo al pase económico

Fase **puramente diagnóstica**: no cambió ningún número de `data/balance.ts`. Tres experimentos
deterministas (semilla `BOT_SEED`) en el arnés `src/test/economyDiag102A.ts`
(`npx vite-node src/test/economyDiag102A.ts`). El bug de préstamos pre-10.1 se restaura tras un flag
test-only (`GameState.loanLegacyBug`, rama en `advanceEconomy`), y el endeudamiento agresivo, tras un
perfil de bot nuevo (`AGGRO_OPTIMIZER` + `Philosophy.aggressiveLoans` en `src/test/bots.ts`). Los 556
tests siguen verdes: los 4 bots de siempre no cambian (el flag y el perfil por defecto están apagados).

### Experimento 1 — ¿Es el préstamo lo que rompe el ritmo? (hipótesis W8)

Optimizador con endeudamiento AGRESIVO (pide al máximo para adelantar cada salto de etapa) en dos
mundos: **(a)** bug de préstamos restaurado (deuda casi gratis) y **(b)** interés arreglado (10.1).

| perfil | E. pequeño | Estudio | E. grande | Corporación | préstamo máx | rojos |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| optimizador PRUDENTE (arreglo) | E1 s142 | E2 s302 | **E3 s680** | E5 s1512 | 135k | 0 |
| agresivo **(a) BUG** restaurado | E1 s128 | E2 s339 | **E3 s680** | E5 s1512 | 143k | 0 |
| agresivo **(b) arreglo** | E1 s129 | E2 s302 | **E3 s680** | E5 s1512 | 135k | 0 |

**Conclusión (una frase): el bug NO reproduce "Estudio grande en E2 temprana" — ni con endeudamiento
máximo la deuda casi gratis mueve el ritmo, porque el banco solo presta ~26 semanas de coste fijo
(préstamo máx ~140k) y el gate de Estudio grande pide 1,5M: dos órdenes de magnitud fuera de alcance.**
El salto de etapa 4 cae en **E3 s680 en los tres casos**; el préstamo agresivo solo adelanta ~14 semanas
la PRIMERA ampliación (etapa 2, cuyo requisito de 25k sí cabe en la línea de crédito) y hasta retrasa
la etapa 3. → **El arreglo de la 10.1 NO cambia el baseline de ritmo: los umbrales de W3 se recalibran
desde el MISMO baseline, no desde uno nuevo.** El "E2 grande" del playtest no viene del préstamo (lo más
probable, como ya apuntaba la 10.1: el jugador llamaba "estudio grande" a la etapa 3 — Estudio, que sí
cae en E2 s302).

### Experimento 2 — ROI por tamaño CONTROLADO (contrafactual limpio)

Mismo estudio / semana / equipo / Fit / calidad-objetivo; premium honesto, motor propio, `pcCasero`,
energía al máximo (aísla la economía del tamaño de la fatiga). ROI = ingreso neto ÷ coste atribuible;
benef. abs. = ingreso − coste.

| estado | tamaño | coste | ing. neto | **ROI** | benef. abs. | reseña | alcance |
|--------|--------|--:|--:|:--:|--:|:--:|:--:|
| **E4** (s1093, et.4, 9 pers) | Pequeño | 6k | 112k | 18,7× | 106k | 79 | 9,8 |
| | Mediano | 15k | 849k | 56,6× | 834k | 78 | 2,7 |
| | **Grande** | 37k | 5.373k | **145,2×** | 5.336k | 81 | 0,98 |
| **E5** (s1512, Corp, 24 pers) | Mediano | 15k | 911k | 60,7× | 896k | 64 | 6,5 |
| | Grande | 37k | 4.681k | 128,2× | 4.645k | 68 | 2,3 |
| | **Muy grande** | 104k | 12.792k | **123,0×** | 12.688k | 68 | 1,2 |
| **E6** (s1887, Corp, 40 pers) | Mediano | 15k | 922k | 61,5× | 907k | 63 | 11,1 |
| | Grande | 37k | 6.144k | **166,1×** | 6.107k | 62 | 4,0 |
| | Muy grande | 107k | 17.436k | 163,0× | 17.329k | 70 | 2,1 |
| | AAA | 324k | 11.752k | **36,3×** | 11.428k | **39** | 0,77 |

**Conclusión (una frase): a igualdad TOTAL de condiciones el ROI sigue disparándose con el tamaño
(Mediano ~57–62× → Grande/Muy grande ~123–166×) y el beneficio absoluto crece de forma monótona hasta
Muy grande, así que el 211× de la 10.1 NO era "momento de partida": el problema de margen por tamaño es
REAL (W2 confirmado).** Detalles clave:
- El contrafactual **infravalora** a los grandes: con el MISMO equipo su alcance es menor (Grande a 0,98,
  Muy grande a 1,2) y aun así arrasan → con equipo a medida rendirían todavía más.
- **AAA es el único tamaño penalizado** (36,3×, reseña **39**): con 40 personas el alcance cae a 0,77
  (`powerTarget` 26) y la reseña se hunde → confirma el 32× de la 10.1. AAA no es la mina; es la trampa
  de escala mal dotada.
- El acantilado está en **Grande** (de ~57× a ~145–166×). Es ahí donde W2 debe morder.

### Experimento 3 — Descomponer la "paradoja del capital" (partida de la Fábrica → Corp)

Flujo por categoría agregado por era (la Fábrica AAA, la que llega a Corporación):

| era | ventas | nómina | overhead etapa | ampliac. | Δcaja | margen op./sem |
|-----|--:|--:|--:|--:|--:|--:|
| E3 | 17.786k | −2.971k | −2.884k | −750k | 6.736k | +28.116 |
| E4 | 42.074k | −5.321k | −2.912k | 0 | 33.378k | +80.771 |
| E5 | 44.544k | −8.235k | −10.759k | −4.000k | 20.053k | +69.626 |
| **E6** | 16.981k | **−26.461k** | −12.480k | 0 | **−28.035k** | **−53.339** |
| E7 | 36.719k | −7.852k | −3.120k | 0 | 23.687k | +246.996 |

Etapa 5 (Corporación, 877 semanas agregadas): ventas **95.204k** − overhead **26.310k** − nómina
**42.428k** − base/dev 491k = **margen operativo +25.975k**. El overhead se come el **27,6 %** del ingreso
de ventas de la etapa.

**Conclusión (una frase): la etapa 5 SÍ se paga a sí misma (margen operativo +26M; el overhead de 30k/sem
es caro pero asumible) — la verdadera "trampa" es E6, donde el margen operativo se vuelve NEGATIVO
(−53k/sem) porque la nómina de 40–48 personas + overhead corren mientras el ingreso se desploma entre
lanzamientos AAA lumpy (solo 3 juegos en E6).** El diagnóstico de la 10.1 ("bajar el overhead de etapa 5")
apunta al culpable equivocado: el overhead no hunde a la Corporación; la **nómina desbocada + la lumpiness
del AAA** sí.

> **⚠️ Hallazgo incidental (para 10.2-B): la "presión de deuda" del 10.1 es COSMÉTICA.** La Fábrica cierra
> con principal 97k pero **124,9 billones** de interés acumulado: el interés capitaliza (no toca caja) y
> `availableCredit` ignora el interés acumulado, así que una vez la deuda viva supera la caja la regla de
> amortizar ya no se cumple → la deuda se dispara sin ninguna consecuencia real. El préstamo sigue sin
> "empujar hacia la codicia" (docs/06 §4) para quien no amortiza. Candidato a corregir en 10.2-B: que
> `availableCredit` descuente el interés y/o topar la capitalización.

### 📋 Recomendación de números para la 10.2-B (propuesta a discutir — NO aplicada)

1. **W2 (coste por tamaño) — adoptar la escalera de coste base de W2, confirmada por los datos.** El
   contrafactual dice que el acantilado de ROI es real y del orden que W2 estimó. Subir el **coste base**
   para aplanar el ROI manteniendo beneficio absoluto creciente (condición 1 de W2):
   `sizeBaseCost` **1k / 5k / 88k / 460k / ~800k** (Pequeño/Mediano/Grande/Muy grande/**AAA**). Con esos
   costes: Grande ~6M/250k ≈ **24×**, Muy grande ~17M/1M ≈ **17×**, Mediano ~900k/32k ≈ **28×** → ROI
   plano-decreciente. **Matiz sobre AAA:** ya está a 36× y por debajo de Muy grande en absoluto; NO subir
   su base a 1,6M (lo dejaría estrictamente dominado, nadie lo haría) — proponer ~800k y, mejor aún,
   arreglar su **infra-dotación** (talento) en vez de solo encarecerlo.
2. **W3 (ampliar) — adoptar la escalera de requisitos (200k / 1M / 6M / 25M) y el gate de trayectoria.**
   Exp1 muestra que **el capital no gobierna las etapas 4–5** (se alcanzan igual con o sin préstamo): el
   **gate de trayectoria** (nº mínimo de juegos / reputación para Corporación) es el regulador correcto,
   no más caja. Recalibrar desde el baseline de Exp1 (Estudio en E2 s302), no desde un baseline nuevo.
3. **Overhead de etapa 5 — trim MODESTO, no recorte.** Exp3 dice que la etapa 5 se paga sola: bajar de
   30k a ~**20–22k/sem** basta como alivio; el foco real de 10.2-B debe ser **la nómina/lumpiness del
   late-game** (E6 negativo), no el alquiler. Que la escala pague de verdad = proyectos en paralelo
   (Corp permite 8) que suavicen el ingreso.
4. **Préstamos (hallazgo incidental) — cerrar el círculo:** `availableCredit` debe descontar el interés
   acumulado (línea que se estrecha con la deuda) para que la presión de deuda del 10.1 muerda de verdad.

---

## ✅ Cierre del Bloque 3 — validación de la 10.3 con bots

La 10.3 es contenido y presentación: **no toca ni un número del pase económico de la 10.2-B**
(`sizeBaseCost`, `sizeGate`, `scale.requirements`, `upkeepExtraByStage`, `loans` — todos intactos).
Lo único que se movió en `balance.ts` es una nota: `releasePointsBySize` se dejó **como estaba** tras
probarlo y revertirlo. Los cambios de balance de la sub-fase son **cuatro costes de nodo de E5-E7**
(W6b) y nada más.

Aun así, más features = proyectos algo más largos = trayectorias distintas de E3 en adelante. Se
re-corrieron los 4 perfiles (`npx vite-node src/test/economyReport102B.ts`, semilla 4242) contra los
criterios de cierre de la 10.2-B:

| Criterio de cierre (10.2-B) | Estado |
|---|---|
| Las 3 filosofías siguen viables y alcanzan su etapa-ambición | ✅ indie **3**, equilibrado **4**, fábrica **5**; ninguna quiebra |
| El optimizador NO llega a Corporación antes de E5 | ✅ **E5 s1512**, con E5 empezando en s1509 — el **mismo** margen de 3 semanas de la 10.2-B |
| El optimizador no imprime dinero | ✅ cierra en **158,3M** frente a los 172,4M de la 10.2-B: baja, no sube |
| Beneficio absoluto creciente con el tamaño (contrafactual controlado) | ✅ monótono en los **tres** estados medidos (E4, E5 Corp, E6 Corp) |
| ROI plano-decreciente de Mediano hacia arriba | ✅ E5: 55,6 → 48,9 → 33,4 → 22,7 × · E6: 70,2 → 72,8 → 36,6 → 39,8 × (dos ondulaciones de ~3 %, dentro de "plano") |
| El burn del late-game sigue mordiendo | ✅ la fábrica cierra E6 en **−17,7k/sem** y E7 en **−36,0k/sem** |

**Trayectorias (antes → ahora):**

| Perfil | E. pequeño | Estudio | E. grande | Corporación | Capital final |
|---|:---:|:---:|:---:|:---:|--:|
| Indie de culto | s154 → **s154** | s520 → **s520** | — | — | 39,9M → **42,3M** |
| Fábrica AAA | s171 → **s171** | s416 → **s416** | s902 → **s908** | s1800 → **s1635** | 1,6M → **30,3M** |
| Estudio equilibrado | s171 → **s171** | s415 → **s415** | s1097 → **s1097** | — | 80,0M → **93,3M** |
| Optimizador | s154 → **s154** | s426 → **s426** | s909 → **s932** | **s1512 → s1512** | 172,4M → **158,3M** |

**E1 y E2 son idénticas semana a semana en los cuatro perfiles** — la consecuencia buscada de no meter
features antes de E3. La divergencia empieza donde entra el contenido (E3) y se mantiene dentro de
banda: nadie cambia de etapa-ambición, nadie quiebra, nadie empieza a imprimir. La fábrica llega a
Corporación 165 semanas antes (sigue en E5) y sale del pozo del 1,6M, que era un cierre incómodo de la
10.2-B más que un objetivo de diseño.

**Estado:** 592 tests verdes (574 + 18 nuevos), `tsc --noEmit` limpio, save **sin bump** (nada del
estado serializado cambia de forma: las plataformas nuevas aparecen solas en `market.platforms` en el
primer tick, y las features son contenido, no estado).

*Nota de suite:* el caso de determinismo del optimizador (dos partidas completas, 2×2393 ticks) pasó a
tener **timeout propio de 20 s**. Con 3 plataformas y 11 features más, cada tick pesa un poco más y
bajo la suite en paralelo se salía de los 5 s por defecto — era lentitud, no un fallo de determinismo
(en aislado tarda 1,8 s y pasa).

Con esto **se cierra el Bloque 3**: W1 y W8 en la 10.1, la medición en la 10.2-A, el pase económico en
la 10.2-B y W5/W6/W7 en la 10.3.
