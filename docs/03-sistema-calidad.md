# 03 — Sistema de Calidad Transparente

Este es el **Pilar 2** hecho mecánica. Reemplaza la "caja negra" de *Game Dev Tycoon* por un modelo
que el jugador puede razonar. El objetivo no es esconder la fórmula, sino hacerla *interesante de
optimizar y de equilibrar contra otros costes*.

> Principio rector: el jugador nunca debe pensar "no sé por qué esto fracasó". Siempre debe poder
> explicar el resultado en una frase.

---

## 1. Salida del sistema

El sistema produce un número interno, **Calidad Real `Q` (0–100)**, y una **descomposición** legible
de cómo se formó. `Q` es luego el insumo principal del Mercado (`04`) para calcular reseñas y ventas.

`Q` **no** es lo mismo que la reseña pública: la reseña añade modas, hype y expectativas encima (ver `04`).

## 2. Los factores de calidad

`Q` se compone de cinco factores, cada uno normalizado a 0–1 y luego combinado (ver §3).

### Factor A — Fit (Encaje) `[DECIDIDO]`
Cuánto encajan entre sí las decisiones de concepto. Es el factor más "de conocimiento del mercado".

- **Fit Tema×Género:** cada par tiene afinidad `Muy bueno / Bueno / Neutro / Malo` (tabla en `09`).
  Ej.: Fantasía×RPG = Muy bueno; Deportes×Aventura narrativa = Malo.
- **Fit Género×Plataforma:** algunas plataformas favorecen géneros (portátil favorece Casual/Puzzle).
- **Fit Público×(Género+Monetización):** un público Hardcore castiga la monetización agresiva; el
  Casual la tolera (esto conecta con `06`).

`fit = media ponderada de las afinidades`, mostrada al jugador como un **medidor de Fit** en vivo
durante la concepción (verde/amarillo/rojo), sin decir el número exacto — orienta, no resuelve.

### Factor B — Balance Diseño/Técnica `[DECIDIDO]`
Cada género tiene un **balance ideal** entre Diseño (creatividad, historia, jugabilidad) y Técnica
(motor, gráficos, rendimiento). Ejemplos (tabla completa en `09`):

| Género | Diseño ideal | Técnica ideal |
|--------|:---:|:---:|
| RPG narrativo | 0.65 | 0.35 |
| Shooter | 0.40 | 0.60 |
| Estrategia | 0.55 | 0.45 |
| Casual/Puzzle | 0.60 | 0.40 |

El reparto de esfuerzo del jugador en las 3 fases (ver `02`) produce un balance real
`(dReal, tReal)`. Cuanto más cerca del ideal, mayor la puntuación de este factor:

```
balanceScore = 1 - (|dReal - dIdeal| + |tReal - tIdeal|) / 2
```

### Factor C — Features y Alcance `[DECIDIDO]`
Las features elegidas durante el desarrollo (ver `02`, `09`) suman **calidad potencial** pero
consumen tiempo y capacidad del equipo. Cada feature tiene: `valorCalidad`, `costeTiempo`,
`riesgoBugs`, y a veces un `públicoAfin` (una feature puede encantar a Hardcore y ser irrelevante a
Casual).

```
featureScore = min(1, Σ valorCalidad_features / objetivoAlcance(tamañoProyecto))
```

Meter demasiadas features para el tamaño del proyecto **no** las aprovecha (rendimientos decrecientes)
y dispara los bugs (Factor D). Es una decisión de ambición vs riesgo.

### Factor D — Pulido / Bugs `[DECIDIDO]`
Durante el desarrollo se acumula **deuda de bugs** en función de features, prisa (poco tiempo) y
capacidad del equipo. La fase de Pulido (QA) y los parches post-lanzamiento la reducen.

```
bugLevel  = clamp(deudaBugs - inversiónQA, 0, 1)     // 0 = impecable, 1 = injugable
polishScore = 1 - bugLevel
```

`bugLevel` alto no solo baja `Q`: alimenta el riesgo de desastre en directo con streamers y de
review bombing (ver `07`). Los bugs son el puente entre "prisa por dinero" y "castigo social".

### Factor E — Multiplicador de Equipo `[DECIDIDO]`
La competencia y el estado del equipo escalan todo lo anterior. Un gran concepto ejecutado por un
equipo quemado e incompetente no brilla.

```
teamFactor = competenciaMedia_ponderada_por_rol × moralFactor × sinergiaFactor
```

Donde `competenciaMedia` pondera las skills relevantes al género (un RPG valora Diseño/Historia; un
shooter valora Técnica), y `moralFactor`/`sinergiaFactor` vienen de `05`. Rango típico 0.5–1.3
(un equipo excepcional y motivado puede superar 1.0; uno quemado hunde el resultado).

## 3. Fórmula de composición `[DECIDIDO · baseline v1 · techo dinámico desde 9.1]`

```
base = ( wF·fit + wB·balanceScore + wC·featureScore + wD·polishScore ) / (wF+wB+wC+wD)

Q = 100 × clamp( base × teamFactor × innovationMod × alcanceFactor , 0 , 1 ), con techoQ
```

Pesos **v1 (cerrados como baseline):** `wF=0.30, wB=0.25, wC=0.20, wD=0.25`. Ajustables solo en balance de playtest.

- `innovationMod` (0.9–1.15): pequeño modificador por innovar vs copiar. Innovar (combinaciones nuevas,
  temas frescos) da un plus de calidad y reputación pero más riesgo de mercado (ver `04`); clonar lo
  seguro no penaliza la calidad pero satura mercado y no genera reputación.

### 3.1 El techo dinámico (Fase 9.1, docs/19 §9.1) `[DECIDIDO]`

El techo ya **no es un tope fijo por era**: es el **mínimo de cuatro techos parciales**, y el desglose
nombra SIEMPRE cuál manda (Pilar 2). Todos los números en `balance.quality.ceiling`:

```
techoQ = min( capEra, capMadurez, capTalento, capTech )

capMadurez  = 45 + 55 · exp/(exp + 55)      // exp = Σ sizeExp(lanzamientos) + stageExp(etapa)
capTalento  = 45 + 50 · mejorSkillClave/100 // la MEJOR skill del rol clave del género entre los asignados
capTech     = 55 + 45 · techPoints/target(era)  // techValue de los nodos de I+D comprados
capEra      = el capByEraSize de siempre (envolvente; en 9.2 pasa a ser el motor)
```

- **Madurez:** en el garaje el techo es **~45–52 juegues como juegues** y sube DESPACIO con los
  lanzamientos (sizeExp 1.5/2.5/5/8/12 por tamaño) y la escala (stageExp 0/3/8/18/30 por etapa).
- **Talento:** una **obra maestra (85+) exige una ESTRELLA (skill ≥ 80)** en la especialidad clave del
  género (la de mayor `specialtyWeights`). El mejor individuo, no la media.
- **Tecnología:** sin I+D el techo topa en 55 desde E2 (`targetByEra` 0/3/6/10/14/20/24): el primer
  motor propio es la salida. En 9.2 este término pasa a ser el motor.
- **Encaje de alcance (ambición vs capacidad):** no es un techo, es un **multiplicador de Q**:
  `alcanceFactor = max(0.4, alcance01^1.25)` con `alcance01 = poderEquipo / poderObjetivo(tamaño)`
  (poderEquipo = Σ skill ponderada por género de los asignados; objetivos 0.5/1.8/5/9.5/26). Un AAA
  con estudio flojo NO llena el alcance y la calidad **se hunde**; un pequeño pulido con buen equipo
  alcanza fácil su techo (más bajo).

## 4. De Calidad a Reseña (interfaz con Mercado)

`Q` sale de este sistema. El Mercado (`04` §5) la transforma en **reseña pública por segmento**
comparándola contra el **listón de la era** (en parte oculto) y aplicando: expectativas/hype (un juego
muy hypeado se juzga más duro), afinidad de la moda actual, **fatiga de fórmula** (repetir combo
reciente decae la nota) y la **banda de gusto** ±4 (desvío determinista del PRNG, siempre explicado).
Aquí solo producimos `Q` y su descomposición.

## 5. La descomposición de la reseña (la parte "transparente") `[DECIDIDO]`

Tras cada lanzamiento se muestra un **desglose** que enseña al jugador. No es solo una nota; es una
lección. Formato propuesto (UI en `10`):

```
RESEÑA: 82 / 100   "Una joya honesta con algún defecto."

  ✔ Encaje excelente        Fantasía + RPG + público Hardcore
  ✔ Buen equilibrio          Diseño/Técnica casi ideal para RPG
  ~ Alcance correcto         Bien para un proyecto mediano
  ✘ Algunos bugs             Faltó pulido en la recta final  (−6)
  ✔ Equipo inspirado         Moral alta se nota en el detalle
  ~ Poco innovador           Otro RPG de fantasía; el mercado empieza a cansarse
```

Cada línea mapea a un factor. Verde/amarillo/rojo. Esto convierte el fracaso en **aprendizaje
accionable** ("la próxima, más QA") en vez de frustración opaca.

Desde la Fase 9.1 el desglose añade **cinco líneas más**, igual de legibles: el **techo** ("Hoy la
juventud del estudio deja el listón de lo posible en 46" / "la falta de una estrella de Diseño" /
"la falta de I+D"), el **alcance** ("La ambición queda grande"), el **listón de la época** ("Por
detrás de su tiempo" — cualitativa: el número del listón no se muestra), la **fatiga de fórmula**
("El público está cansado de esta fórmula (−8)", solo cuando pega) y la **banda de gusto** ("A la
crítica no le entró este juego (−3)" — la nota tiene rango, pero se explica; Pilar 2 intacto). La
gala además **reencuadra la trayectoria**: "🏆 Tu mejor juego hasta ahora" — un 45 al principio es
un logro, no un fracaso (docs/19 §9.1).

### 5.1 Predecir vs explicar: el conocimiento se gana (docs/17 P2) `[DECIDIDO · baseline v1]`

Hay que separar dos cosas y **el Pilar 2 protege la segunda**:

- El **atajo PREDICTIVO** (saber *antes* de lanzar): el **medidor de Fit** (Factor A), el **balance
  ideal** del género (Factor B) y el **precio recomendado**. Estas pistas **empiezan TODAS ocultas**
  ("Encaje por descubrir", "❓ por investigar") y se **ganan con investigación** (docs/02 §3.2): con los
  nodos globales de I+D o con **"Investigar resultados"** de un lanzamiento con esa combinación. Nada
  se regala al empezar: el estudio de 1980 va a ciegas y el mapa del mercado se conquista. Aun oculta
  la pista, **puedes concebir el juego igualmente**: no bloquea, solo no adivina por ti.
- La **explicación A POSTERIORI**: el **desglose de reseña** de §5 se muestra **SIEMPRE, completo y
  legible**, con o sin investigación. Nunca se paga. Siempre aprendes de tus propios juegos; descubrir
  combos es una mecánica satisfactoria, no un muro opaco. El principio rector de arriba sigue en pie:
  el jugador siempre puede explicar el resultado en una frase.

## 6. Ejemplos trabajados (para test)

> Nota 9.1: estos ejemplos miden la **fórmula de composición** (sin techo dinámico: contexto de
> estudio maduro). En una partida real el techoQ de §3.1 los recorta — un "indie pulido" en el
> garaje topa en ~45–52 y su gala lo celebra como récord, no como fracaso.

**Ejemplo 1 — Indie pulido:** proyecto Pequeño, Fantasía×RPG (fit alto), balance casi ideal, pocas
features pero cero bugs, equipo pequeño competente y feliz. `Q ≈ 80`. Reseña alta, ventas modestas.

**Ejemplo 2 — Ambición mal ejecutada:** proyecto Grande, muchas features, poco tiempo → muchos bugs,
equipo en crunch (moral baja → teamFactor 0.7). Buen concepto pero `Q ≈ 48`. Reseña tibia y, peor,
alto riesgo de desastre en directo (`07`).

**Ejemplo 3 — Clon seguro:** copia el género de moda, fit perfecto, cero innovación. `Q ≈ 72` pero
mercado saturado (`04`) → reseña ok, ventas decepcionantes y **cero** reputación ganada.

## 7. Criterios de aceptación (para Claude Code)

- [ ] `computeQuality(project, team, market)` devuelve `Q` (0–100) **y** un objeto de descomposición
      por factor (fit, balance, features, polish, team, innovation).
- [ ] El medidor de Fit se calcula y muestra en vivo durante la concepción, sin exponer el número crudo.
- [ ] `bugLevel` se acumula por features/prisa y se reduce con QA y parches.
- [ ] El techo de calidad por era está implementado y limita `Q`.
- [ ] La descomposición se renderiza como desglose legible tras el lanzamiento (ver `10`).
- [ ] Todos los pesos y curvas viven en un archivo de config editable (para balance), no hardcodeados.
