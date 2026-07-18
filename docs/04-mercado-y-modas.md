# 04 — Mercado y Modas Dinámicas

Este es el **Pilar 3**. El mercado es una entidad viva: géneros, temas y plataformas suben y bajan de
popularidad, hay hype y saturación, y las consolas nacen y mueren. El *momento* de lanzar importa
tanto como la calidad. Convierte la Calidad Real `Q` (`03`) en **reseñas y ventas**.

---

## 1. Qué modela este sistema

1. **Popularidad dinámica** de géneros, temas y plataformas a lo largo del tiempo.
2. **Hype y expectativas** que ajustan cómo se juzga un juego.
3. **Saturación** cuando muchos juegos similares inundan el mercado.
4. **Ciclos de vida de plataformas** (consolas que llegan, dominan y mueren).
5. La transformación **Calidad → Reseña → Ventas**.

## 2. Curvas de popularidad `[DECIDIDO]`

Cada **género** y cada **tema** tiene una popularidad `pop ∈ [0,1]` que evoluciona con el tiempo
siguiendo una curva de vida: `Naciendo → Creciendo → Pico → Declive → Muerto` (y a veces
`Renacimiento` nostálgico años después).

- Las curvas están parametrizadas por era (ver `09`): p. ej. "Shooter arena" nace en E3, pico en E4,
  declive en E6. "Battle Royale" no existe hasta E6.
- La popularidad no es determinista al 100%: tiene una tendencia base (guionizada por era para dar
  sabor histórico) + ruido suave. Coherente con "mayormente determinista": el jugador ve la tendencia
  y puede leerla, el ruido solo matiza.
- **Combinaciones** tienen su propia popularidad emergente: un tema fresco sobre un género en alza es oro.

### El dilema del momento (mecánica central)
- **Subirse a una moda en su pico:** ventas altas casi garantizadas, pero mercado saturándose y
  **cero reputación** (haces lo que todos).
- **Apostar temprano por algo que nace:** si aciertas, defines el género → ventas crecientes + mucha
  reputación ("fueron los primeros"). Si te adelantas demasiado, el público aún no está.
- **Llegar tarde a una moda en declive:** el peor cuadrante. Saturado y decayendo.

El juego expone un **panel de tendencias** (UI en `10`) con flechas de dirección (↑ creciendo, → estable,
↓ cayendo) por género/tema, para que la decisión sea informada pero no trivial.

## 3. Saturación `[DECIDIDO]`

Cada género+tema acumula un contador de saturación por la cantidad de juegos similares lanzados
recientemente en el mercado (por el jugador y — en fases con rivales — por la IA).

```
saturación += lanzamientosSimilaresRecientes
saturación decae lentamente con el tiempo (el público "olvida")
modificadorVentas_saturación = 1 - k·saturación   // rendimientos decrecientes por inundar
```

Consecuencia estratégica: **exprimir** un mismo género con secuelas rápidas (palanca de codicia, `06`)
lo satura y erosiona sus ventas — dinero rápido hoy, mercado quemado mañana.

**Desde 9.1 la repetición también decae la NOTA** (docs/19 §9.1 `[DECIDIDO]`): la ejecución perfecta
de un juego seguro PUEDE alcanzar el techo una vez, pero repetir la misma fórmula fatiga a público y
crítica:

```
fatiga = min(18, 5·repesRecientes + 5·max(0, satEff − 0.6))
// repesRecientes = lanzamientos del MISMO tema×género en una ventana rodante de 156 semanas
```

La 2.ª entrega en 3 años pierde ~5 puntos de nota; la 3.ª, ~10 — y esperar años lo perdona (el
público olvida). Siempre con su línea en el desglose ("El público está cansado de esta fórmula").
La saturación de ventas también pesa más desde 9.1 (`k 0.3`, decaimiento 0.95).

## 4. Hype y expectativas `[DECIDIDO]`

El **Hype (📣)** se acumula antes del lanzamiento por marketing y campaña de creadores (`07`). Tiene
doble filo:

```
ventasIniciales ↑ con hype        // más gente compra de salida
severidadReseña ↑ con hype        // se juzga con más dureza; expectativas altas
```

- **Sobre-hypear un juego mediocre** = pico de ventas day-one + caída brutal cuando las reseñas y el
  boca a boca revelan la verdad (y riesgo de backlash, `07`). Comentario directo sobre la industria real.
- **Hype bajo con juego excelente** = ventas lentas al inicio pero **cola larga** por boca a boca y
  reputación creciente (el clásico "sleeper hit").

**Marketing SIN TOPE (9.1, docs/19 §9.1):** el límite del 100 % desaparece. Las campañas son
**re-comprables** (cada compra vuelve a pagar su coste y a sumar su empuje) y la **Expectación** se
muestra como un número sin barra (puede superar 100, con 🔥). El marketing es un **amplificador de
alta varianza**: el pico day-one crece linealmente con el hype sin límite, y el castigo también —
la penalización de reseña es una pendiente sin tope (~13 puntos por punto de hype sobre 0.25), la
brecha de sobre-hype ya no se acota a 1 (la cola cae hasta un suelo del 90 % y el golpe de
reputación escala completo). Más metes, más subes si cumples y más te hundes si fallas. El hype
**pasivo** conserva su meseta (0.35): la zona roja solo se alcanza pagando.

## 5. De Calidad a Reseña `[DECIDIDO · reescrito en 9.1]`

La reseña compara la calidad interna contra un **listón por era, en parte oculto** (docs/19 §9.1):
desacopla calidad de nota y evita acomodarse — las expectativas suben más rápido que tu comodidad.

```
notaBase = 70 + 1.3 × (Q − listón(era))       // listón: E1 61 · E2 66 · E3 69 · E4 72 · E5 78 · E6 83 · E7 88
reseña_segmento = clamp(
      notaBase
    + afinidadModa(género,tema)               // ±: ¿está de moda?
    - penalizaciónExpectativas(hype)          // hype alto = más exigencia (pendiente sin tope, §4)
    - fatiga(repetición, saturación)          // repetir fórmula decae la nota (§3)
    + banda                                    // gusto/humor del mercado: entero en ±4, determinista
    + sesgoSegmento(segmento, género, monetización)   // cada público juzga distinto (ver 06/07)
    , 0, 100)
```

- Un mismo **70 interno** lee ~75 en E2 y ~60 en E5. La pendiente 1.3 amplifica las diferencias de Q:
  el techo dinámico (`03` §3.1) importa más que nunca.
- El número del listón **no se muestra**: el desglose lleva una línea cualitativa ("A la altura de su
  tiempo" / "Por detrás de su tiempo").
- La **banda** ±4 (stream propio del PRNG, misma semilla → misma banda) hace que un gran juego tenga
  un rango, no un número exacto — pero SIEMPRE con su línea explicativa (Pilar 2, docs/19 `[DECIDIDO]`).

La **reseña se calcula por segmento** (crítica, hardcore, casual, prensa), porque cada público valora
cosas distintas. Un mismo juego puede sacar 88 de la crítica y 60 de los hardcore si, por ejemplo,
metiste microtransacciones (los hardcore lo castigan; la crítica menos). Esto conecta directamente
con la reputación segmentada (`06`) y la comunidad (`07`).

## 6. De Reseña a Ventas `[DECIDIDO · baseline v1]`

```
demandaPotencial = tamañoMercado(plataforma, era, público) × pop(género) × pop(tema)

ventas(semana t) = demandaPotencial
    × curvaLanzamiento(t, hype)          // pico inicial modulado por hype
    × factorReseña(reseñaMedia)          // reseñas altas venden más y más tiempo
    × modificadorVentas_saturación
    × modificadorPrecio(precio, público) // ver 06
    × modificadorComunidad(sentimiento)  // ver 07 (boca a boca, review bombing)
```

- **Curva de ventas:** pico en las primeras semanas + **cola larga** cuya duración depende de reseña y
  reputación. Un juego querido vende durante años; un cash-grab se desploma tras el pico.
- Las ventas se recalculan cada tick durante la vida comercial del juego, permitiendo que eventos
  posteriores (parches, crisis, DLC, review bombing) las alteren en tiempo real.

## 7. Ciclos de vida de plataformas `[DECIDIDO]`

Las consolas/plataformas ficticias (ver `09`) tienen su propio ciclo:

```
Anunciada → Lanzamiento → Crecimiento (base instalada ↑) → Madurez (pico) → Declive → Descatalogada
```

- La **base instalada** de una plataforma determina su `tamañoMercado`. Lanzar en una consola joven en
  crecimiento = techo alto futuro; en una moribunda = ventas garantizadas pero decrecientes.
- Desarrollar para una plataforma puede requerir **licencia/dev-kit** (coste, ver `06`) y a veces
  investigación (`02`).
- **Guerra de consolas:** en cada generación, 2–3 plataformas compiten; su cuota cambia con el tiempo
  (guionizado + algo de ruido). Apostar por la plataforma "ganadora" temprano es una lectura de mercado.
- **Multiplataforma (Fase 9.2, docs/19 §9.2):** lanzar en varias plataformas a la vez es una
  **capacidad del MOTOR** que se investiga (kit biplataforma = 2, pipeline multiplataforma = hasta 4).
  Cada plataforma paga su licencia al iniciar; la **demanda semanal SUMA las bases instaladas** de
  todas (cada una con su sesgo de público), y si una muere a mitad de la cola, su curva la apaga sola.
  La primera plataforma es la **principal** (fija el fit género×plataforma).

## 8. Eventos de mercado `[DECIDIDO]`

Eventos periódicos que sacuden el tablero (sabor + decisiones), siempre legibles:

- **Ferias/Expos** (tipo E3): ventanas para generar hype masivo si presentas allí.
- **Boom indie / crisis del sector / recesión:** modifican tamaño de mercado y apetito de riesgo.
- **Nacimiento de una moda:** un género/tema salta a "Creciendo" de golpe (oportunidad de oro para el atento).
- **Cambio regulatorio:** p. ej. una ley que limita loot boxes en E6/E7 (conecta con `06`).

## 9. Estudios rivales `[DECIDIDO — diferido a Fase 8]`

No están en el alcance inicial (el jugador no eligió "rivales con IA" como prioridad), pero el sistema
se diseña para **admitirlos después**: los rivales serían agentes que también lanzan juegos, aportando
a la saturación, compitiendo por ventas y — en `05` — por talento. Se introducen como capa opcional en
una fase avanzada del roadmap (`11`), sin reescribir el mercado.

## 10. Criterios de aceptación (para Claude Code)

- [ ] Cada género/tema tiene una curva de popularidad que evoluciona por tick según su definición de era.
- [ ] El panel de tendencias muestra dirección (↑→↓) por género/tema.
- [ ] La saturación sube con lanzamientos similares y decae con el tiempo, afectando ventas.
- [ ] El hype ajusta ventas iniciales **y** severidad de reseña.
- [ ] La reseña se calcula **por segmento**, no como número único.
- [ ] Las ventas se calculan por tick con curva de lanzamiento + cola larga, y son alterables por
      eventos posteriores.
- [ ] Las plataformas siguen su ciclo de vida y su base instalada alimenta el tamaño de mercado.
- [ ] Toda curva/parámetro vive en config editable para balance.
