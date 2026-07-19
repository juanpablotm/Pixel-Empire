# 06 — Dilema Moral y Economía

Este es el **Pilar 1: el eje del juego**. Aquí vive la tensión Reputación ↔ Capital que atraviesa
todas las decisiones, junto con la economía completa (ingresos y costes) y el sistema de escándalos.

> Regla de diseño: **ninguno de los dos extremos es "ganar"**. La codicia pura es rica pero frágil y
> odiada; la integridad pura es querida pero pobre y vulnerable. El juego premia la *navegación
> consciente* del dilema, no un óptimo.

---

## 1. Los dos recursos en tensión

### Capital (💰)
Dinero líquido. Entra por ventas, DLC y monetización. Sale por salarios, marketing, I+D, oficinas y
licencias. **Capital negativo sostenido = bancarrota = game over.**

### Reputación (⭐) — segmentada `[DECIDIDO]`
No es un número único, sino un **vector por segmento**. Cada decisión mueve segmentos distintos:

| Segmento | Qué valora | Qué lo enfurece |
|----------|------------|-----------------|
| **Crítica** | Innovación, pulido, ambición artística | Refritos, bugs, mediocridad |
| **Hardcore** | Profundidad, respeto al jugador, no pay-to-win | Monetización agresiva, simplificar, romper lore |
| **Casual** | Accesibilidad, diversión inmediata, precio bajo | Dificultad excesiva, complejidad |
| **Prensa/Industria** | Relevancia, exclusivas, hype | Silencio, escándalos mal gestionados |
| **Empleador** (talento) | Buen trato, proyectos con alma | Crunch, despidos, explotación |

Esto hace que "vender el alma" tenga **víctimas concretas**: metes loot boxes y los Hardcore te
crucifican mientras los Casual apenas lo notan. La Reputación total mostrada es un agregado ponderado,
pero las decisiones operan a nivel de segmento.

## 2. Las palancas del dilema `[DECIDIDO]`

Cada decisión importante es una palanca que tira de ambos recursos. El diseño exige que por cada
palanca de codicia haya una tentación real (dinero significativo) y un castigo real (reputación/riesgo).

### Palancas de CODICIA (💰↑ / ⭐↓)
| Palanca | Efecto | Riesgo |
|---------|--------|--------|
| **Monetización agresiva** (loot boxes, pay-to-win, pases) | Ingresos ↑↑ | Hardcore furiosos, riesgo de escándalo/regulación |
| **DLC day-one / contenido recortado** | Ingresos ↑ | "Nos vendieron el juego a trozos" → backlash |
| **Secuela-refrito apresurada** | Coste ↓, ingreso rápido | Satura mercado (`04`), la crítica lo destroza |
| **Crunch** (`05`) | Producción ↑ a corto | Moral/lealtad ↓, riesgo de escándalo laboral |
| **Marketing engañoso / sobre-hype** (`07`, docs/17 E2) | Ventas day-one ↑ | Caída brutal de la **cola de ventas** + golpe a hardcore/comunidad, proporcional a la brecha hype↔calidad |
| **Precio abusivo** | Ingreso/venta ↑ | Menos volumen, comunidad enojada |

### Palancas de INTEGRIDAD (⭐↑ / 💰↓ o más lento)
| Palanca | Efecto |
|---------|--------|
| **Precio justo / generoso** | Reputación ↑, volumen ↑, margen ↓ |
| **Juego completo y pulido** (más QA, `03`) | Crítica y comunidad ↑, coste/tiempo ↑ |
| **DLC honesto / contenido extra generoso** | Lealtad de comunidad ↑ |
| **Cuidar al equipo** (sin crunch, formación, `05`) | Mejor talento, mejor calidad, más coste |
| **Arriesgar creativamente / innovar** | Reputación ↑ (crítica), riesgo de mercado ↑ (`04`) |
| **Transparencia con la comunidad** (`07`) | Confianza ↑, perdona flops |

## 3. La asimetría que hace el dilema interesante `[DECIDIDO · con dientes desde 9.1]`

- **La Reputación es lenta de construir y rápida de perder.** Años de buen hacer, un escándalo la hunde.
- **La Reputación DECAE sola con el tiempo** (9.1, docs/19 §9.1): cada semana el exceso sobre 50 se
  erosiona (~0.6 %/semana: el exceso se media en unos 2 años). El público olvida a quien no lanza —
  ser querido exige seguir ganándotelo. Por debajo de 50 **no hay cura gratis**: recuperarse exige
  actuar (la asimetría de siempre).
- **El público es más exigente**: solo las reseñas por encima de 65 construyen reputación (antes 60) —
  se acabó farmear cariño con notas mediocres. Y el listón de nota por era (`04` §5) sube más rápido
  que tu comodidad.
- **La Reputación alta es un "colchón":** una comunidad que te adora **perdona un flop**, pre-ordena a
  ciegas y te defiende en las crisis (`07`). Es capital social.
- **La codicia da liquidez inmediata pero acumula "deuda de reputación"** que puede estallar como
  escándalo (§5). Es beneficio frágil.
- **Y desde 9.1 la codicia rinde MÁS dinero** (§4): las palancas de codicia son de verdad más
  rentables, para que ser querido cueste un sacrificio real.
- Por eso **ambas estrategias son viables** pero se sienten distintas: el indie de culto vive del
  colchón de reputación; la fábrica AAA vive del flujo de caja y reza para que no estalle nada.

## 4. Economía `[DECIDIDO · baseline v1]`

### Ingresos
```
ingresosJuego = Σ_t ( ventas(t) × precio × factorMonetización )
             + ingresosDLC + ingresosMicrotransacciones(base instalada, agresividad)
```

### Costes
- **Salarios** (por empleado/semana, `05`) — el mayor coste recurrente.
- **Desarrollo** (proporcional a tamaño de proyecto y duración).
- **Marketing** (anuncios, ferias, campañas de creadores, `07`).
- **I+D** (investigación, `02`).
- **Infraestructura:** oficinas (upgrades por etapa de escala), licencias de plataforma (`04`).

### Cifras base v1
Valores de arranque (todo en `data/balance.ts`, ajustable solo en playtest):

| Concepto | Valor base v1 |
|----------|---------------|
| Capital inicial (garaje) | 10.000 💰 |
| Precio recomendado por juego | 20–60 💰 según tamaño/era |
| **Coste base por tamaño** (docs/17 E1 + docs/18 V4) | 500 / 2.000 / 8.000 / 60.000 / 250.000 💰 (Pequeño/Mediano/Grande/Muy grande/AAA), fijo al iniciar |
| **Overhead fijo semanal por etapa** (docs/18 V4-d) | 0 / 300 / 1.500 / 7.000 / 30.000 💰 extra sobre el coste fijo base (100 💰) según etapa 1–5 |
| **Coste de ampliar el estudio** (docs/18 V4-c) | 10k / 100k / 750k / 4M 💰 (a etapa 2/3/4/5); requiere además 25k / 200k+4 / 1,5M+8 / 8M+20 (capital + plantilla) |
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| **Campaña de marketing** (escalonada, docs/17 E2; **re-comprable sin tope** desde 9.1) | 2k / 10k / 40k / 120k 💰 (Nota de prensa → Anuncios → Feria/Expo → Campaña masiva); cada compra vuelve a pagar y a sumar expectación |
| Licencia de plataforma (dev-kit) | 10k–100k 💰 según generación |
| Punto de I+D | ~1 por persona·semana en investigación |

**Coste base + tamaño como decisión con peso (docs/17 E1 + docs/18 V4-b):** cada tamaño exige, además
del coste base fijo, una **plantilla mínima** (1/3/8/15/40) y una **etapa de escala mínima** (Garaje /
Estudio pequeño / Estudio / Estudio grande / **Corporación**). El AAA queda bloqueado hasta ser
Corporación con 40 en plantilla. Así ir a lo grande es una apuesta económica real, no la opción por defecto.

**La escala quema (docs/18 V4-d):** el overhead creciente por etapa hace que un estudio grande no sea
nunca riesgo cero — una Corporación quema ~1,5M 💰/año solo en infraestructura (más ~1,6M de nóminas
con 40 empleados). Sostener la torre exige seguir sacando éxitos: el "punto dulce" invencible no existe.

`factorMonetización` (subido en 9.1 — la codicia rinde MÁS, docs/19 §9.1): premium = 1.0;
premium+dlc ≈ **1.25**; premium+mtx ≈ 1.0 + **0.85**·`aggressiveness`; f2p ≈ 0.3 en ventas base pero
MTX ≈ **1.1**·`aggressiveness` sobre su referencia.

### Salud financiera
- Flujo de caja semanal visible; alertas cuando el runway es corto.
- **Préstamos**: línea de crédito según reputación y activos. Principal hasta ~6 meses de costes fijos;
  interés ~1%/semana; devolución flexible. La deuda presiona hacia la codicia (tensión narrativa
  deliberada). El impago sostenido acelera la bancarrota.

## 5. Escándalos y consecuencias `[DECIDIDO]`

La codicia acumula **"deuda de reputación" oculta** (un contador interno de riesgo). Cuanto más
exprimes (monetización, crunch, engaños), más sube la probabilidad y magnitud de un **escándalo**:

- **Disparadores:** loot boxes en juego infantil, crunch filtrado, promesas incumplidas tras hype,
  subida de precio abusiva, refrito descarado.
- **Efecto:** estalla como **evento de crisis** en la Comunidad (`07`) → review bombing, caída de
  ventas, fuga de talento, y a veces **regulación** (p. ej. prohibición de loot boxes en E6/E7 que
  invalida ese modelo de negocio de golpe).
- **Gestión:** el jugador responde vía el subsistema de crisis (`07`). Una buena reputación previa
  amortigua el golpe; una mala lo amplifica.

Esto cierra el bucle moral: la codicia no baja un número abstracto, **te la cobran en público y a
veces por ley**.

## 6. Puntuación de Legado (cierre de partida) `[DECIDIDO]`

No hay victoria única (ver `01` §6). Al final se calcula un **Legado** multi-dimensional, que se
muestra como un "perfil" del estudio más que como un solo número:

```
Legado = {
  Riqueza:        capital acumulado histórico,
  Prestigio:      reputación media ponderada + premios,
  Impacto:        géneros/tendencias que definiste, records de ventas,
  Obras maestras: nº de juegos con reseña 90+,
  Ética:          trato al equipo + honestidad con la comunidad a lo largo de la partida
}
```

Diferentes filosofías (`01` §5) maximizan diferentes ejes → cada final cuenta una historia distinta
("Construiste un imperio odiado" vs "Un estudio adorado que nunca fue rico"). Rejugabilidad por diseño.

## 7. Premios y reconocimiento `[DECIDIDO · rediseñado en 8.10 · nominados reales desde 9.5]`

Ceremonia anual (tipo "Game Awards") que premia mejor juego, innovación, arte, etc. Ganar da
Reputación (sobre todo Crítica/Prensa), hype para el próximo proyecto y atractivo de contratación.
Otro incentivo del lado de la integridad para contrapesar la codicia.

**Los premios son COMPETITIVOS (docs/18 V7).** No hay "ganaste" automático cada año: hay **nominados**
y un **puesto** ("Estudio del año: 4.º"). Ganar es difícil y aspiracional.

- **Nominación.** Tu mejor lanzamiento del año debe pasar el **umbral** de la categoría
  (`awards.thresholds`). Ese umbral es lo que da identidad a cada premio: la Innovación pide riesgo,
  la Técnica pide pulido, el Público pide nota casual. Sin umbral no hay gala.
- **Puesto: contra los RIVALES REALES (Fase 9.5, docs/19 §9.5).** Los nominados son los **mejores
  lanzamientos rivales del año** (`04` §9), con su estudio y su título de verdad, puntuados con **tu
  mismo baremo** (su prestigio es su fuerza; su escala, el tamaño real de su juego). El relleno
  ficticio alrededor del listón (`barByEra`) queda solo para saves recién migrados sin industria en
  la ventana. Tu puntuación:

  ```
  puntuación = reseña + prestigio(crítica, prensa) + escala(tamaño) × pesoEscala(categoría)
  puesto     = 1 + nº de nominados por encima de ti
  ```

- **Solo es realista ganar el GOTY en E6–E7 — y ahora es la industria quien lo impone.** Tu reseña
  **no crece con las eras** (9.1) y la reputación satura pronto; lo único que crece es la
  **escala**, y los establecidos van **un tamaño por delante** hasta E5 (`balance.rivals.
  sizeByTierEra`, calibrado con bots contra la envolvente de `barByEra`): en E5 la ola de gigantes
  pone el techo en ~110 y el gordo no cae hasta que eres Corporación con un AAA excelente. En un
  **año flojo de la industria** (se VE en el panel), una obra maestra puede colarse antes en las
  categorías de idea — eso es competencia, no regalo.
- **Ni la escala ni el cariño bastan por separado.** La fábrica cínica no pasa el umbral (sus
  reseñas son malas) y el indie de culto no tiene escala: **el premio va a quien navegó el dilema**.
  Y la escala **no compra la Innovación** (`scaleWeight` 0.25) — tampoco a los rivales: sus AAA
  pierden ahí su ventaja, y es donde el indie de culto pesca premios a media partida.
- **La nominación no es estéril:** quedarte en el ranking sin ganar deja poso en Crítica y Prensa.
  El hype y el resto de recompensas siguen siendo solo de ganar.

## 8. Criterios de aceptación (para Claude Code)

- [ ] La Reputación es un **vector por segmento** (crítica, hardcore, casual, prensa, empleador), no un escalar.
- [ ] Cada palanca de codicia/integridad ajusta Capital y segmentos de Reputación de forma diferenciada.
- [ ] Existe una "deuda de reputación" oculta que escala probabilidad/magnitud de escándalos.
- [ ] Los escándalos disparan eventos de crisis (`07`) con efectos económicos y de reputación reales.
- [ ] Existe posibilidad de regulación que invalida modelos de negocio por era.
- [ ] La economía (ingresos/costes/flujo de caja) está modelada; bancarrota sostenida = game over.
- [ ] Al final se calcula el Legado multi-dimensional y se muestra como perfil del estudio.
- [ ] Todos los coeficientes viven en config editable para balance.
