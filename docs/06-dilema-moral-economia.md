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
| **Marketing engañoso / sobre-hype** (`07`) | Ventas day-one ↑ | Caída brutal + backlash si no cumple |
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

## 3. La asimetría que hace el dilema interesante `[DECIDIDO]`

- **La Reputación es lenta de construir y rápida de perder.** Años de buen hacer, un escándalo la hunde.
- **La Reputación alta es un "colchón":** una comunidad que te adora **perdona un flop**, pre-ordena a
  ciegas y te defiende en las crisis (`07`). Es capital social.
- **La codicia da liquidez inmediata pero acumula "deuda de reputación"** que puede estallar como
  escándalo (§5). Es beneficio frágil.
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
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| Campaña de marketing (por nivel) | 5k / 20k / 80k 💰 |
| Licencia de plataforma (dev-kit) | 10k–100k 💰 según generación |
| Punto de I+D | ~1 por persona·semana en investigación |

`factorMonetización` v1: premium = 1.0; premium+dlc ≈ 1.15; premium+mtx ≈ 1.0 + 0.6·`aggressiveness`;
f2p ≈ 0.3 en ventas base pero MTX ≈ baseInstalada · 0.8 · `aggressiveness`.

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

## 7. Premios y reconocimiento `[DECIDIDO]`

Ceremonia anual (tipo "Game Awards") que premia mejor juego, innovación, arte, etc. Ganar da
Reputación (sobre todo Crítica/Prensa), hype para el próximo proyecto y atractivo de contratación.
Otro incentivo del lado de la integridad para contrapesar la codicia.

## 8. Criterios de aceptación (para Claude Code)

- [ ] La Reputación es un **vector por segmento** (crítica, hardcore, casual, prensa, empleador), no un escalar.
- [ ] Cada palanca de codicia/integridad ajusta Capital y segmentos de Reputación de forma diferenciada.
- [ ] Existe una "deuda de reputación" oculta que escala probabilidad/magnitud de escándalos.
- [ ] Los escándalos disparan eventos de crisis (`07`) con efectos económicos y de reputación reales.
- [ ] Existe posibilidad de regulación que invalida modelos de negocio por era.
- [ ] La economía (ingresos/costes/flujo de caja) está modelada; bancarrota sostenida = game over.
- [ ] Al final se calcula el Legado multi-dimensional y se muestra como perfil del estudio.
- [ ] Todos los coeficientes viven en config editable para balance.
