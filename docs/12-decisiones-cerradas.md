# 12 — Registro de Decisiones Cerradas (Baseline v1)

Este documento consolida en un solo lugar **todas las decisiones que estaban `[PROPUESTO]` o
`[ABIERTO]` y ahora están cerradas** como **baseline v1**. "Baseline v1" significa: son cifras y
elecciones **firmes** para empezar a construir; los *valores numéricos* pueden reajustarse en balance
de playtest (viven en `data/balance.ts`), pero el **diseño no cambia**.

> Regla: si Claude Code encuentra una duda de valor concreto, este documento manda. Si algo no está
> aquí ni en su doc, es una decisión nueva que hay que confirmar con el diseñador.

---

## 1. Decisiones técnicas (doc 08)

| Tema | Decisión cerrada |
|------|------------------|
| Gestión de estado | **Zustand** (store minimalista sobre núcleo puro). |
| Gráficos de datos | **Recharts** (ventas, hype, moral en runtime). |
| Estilos | **Tailwind CSS** (utilidades para UI flat; iteración rápida). |
| Estructura de carpetas | La de `08` §3 (`core/`, `data/`, `state/`, `ui/`, `save/`). |
| Modelo de estado | El `GameState` de `08` §5. |
| Rendimiento | Ticks O(n), updates inmutables selectivos, selectores finos, gráficos bajo demanda. |
| Build/Test | Vite + Vitest + Testing Library. |

## 2. Ritmo y alcance de partida (doc 02)

- Duración objetivo de una partida completa (E1→E7): **8–10 horas**.
- Juegos por partida objetivo: **35–45**.
- 7 eras (E1–E7) y 4 etapas de escala como **lista cerrada** (garaje → corporación).
- Investigación: puntos 💡 + árbol de desbloqueos gateado por era (cerrado como sistema).
- Estudios rivales: diferidos a Fase 8 en el alcance base; **implementados en la Fase 9.5**
  (docs/19 §9.5) sin reescribir el mercado, como estaba previsto.

## 3. Fórmulas de calidad (doc 03)

- Pesos de composición **v1**: `wF=0.30, wB=0.25, wC=0.20, wD=0.25`.
- `innovationMod` en rango `0.9–1.15`.
- `teamFactor` en rango típico `0.5–1.3`.
- **Techo DINÁMICO desde 9.1** (docs/19 §9.1, doc 03 §3.1): `techoQ = min(capEra, capMadurez,
  capTalento, capMotor)` — madurez `45 + 55·exp/(exp+55)` (garaje ~45–52, sube despacio), talento
  `45 + 50·mejorSkillClave` (obra maestra 85+ exige estrella ≥80 en el rol clave). El `capByEraSize`
  queda de envolvente.
- **El término tecnológico es el MOTOR desde 9.2** (docs/19 §9.2): `capMotor = 55 + 45·adecuación`,
  con `adecuación = clamp01(nivelMotor / demanda)` y `demanda = demandByEra(0/3/6/10/14/20/24) ×
  sizeFactor(0.55/0.75/1/1.15/1.3) × (0.7 + 0.6·idealTech(género))`. El envejecimiento es emergente
  (nivel fijo, demanda creciente); en E1 la demanda es 0 (el artesanal basta).
- **Encaje de alcance** (9.1): `Q ×= max(0.4, (poderEquipo/poderObjetivo)^1.25)`, objetivos
  0.5/1.8/5/9.5/26 por tamaño — el AAA con estudio flojo se hunde.

## 4. Mercado (doc 04)

- Reseñas calculadas **por segmento** (crítica, hardcore, casual, prensa, comunidad).
- **Listón por era desde 9.1** (doc 04 §5): `notaBase = 70 + 1.3·(Q − listón)`, listón 61/66/69/72/
  78/83/88 (E1→E7), en parte oculto (línea cualitativa en el desglose). Un 70 interno lee ~75 en E2
  y ~60 en E5.
- **Fatiga de fórmula** (9.1): `min(18, 5·repesRecientes(156 sem) + 5·max(0, satEff−0.6))` puntos de
  nota — repetir decae; esperar años lo perdona.
- **Banda legible** (9.1): desvío entero ±4 por lanzamiento (stream propio del PRNG), siempre
  explicado en el desglose.
- Saturación con decaimiento temporal (k 0.3, decay 0.95 desde 9.1); hype de doble filo; curva de
  ventas pico + cola larga (`reviewExponent` 1.55, spike 1.6, tail 0.4 desde 9.1).
- **Marketing sin tope** (9.1): campañas re-comprables, hype sin máximo, penalización de reseña en
  pendiente (~13/punto de hype sobre 0.25), brecha de sobre-hype sin acotar (cola con suelo 90 %).
- Ciclos de vida de plataformas activos.
- Eventos de mercado (ferias, boom/recesión, nacimiento de modas, regulación) cerrados como sistema.

## 5. Personal (doc 05)

- Lista de rasgos base cerrada (ver `09` §6).
- **Química de equipo v1:** `sinergiaFactor = clamp(1 + Σ_pares (0.03·afín − 0.04·conflicto), 0.8, 1.2)`.

## 6. Economía y dilema moral (doc 06)

**Cifras base v1** (todas en `data/balance.ts`):

| Concepto | Valor base v1 |
|----------|---------------|
| Capital inicial (garaje) | **4.000 💰** (recalibrado en 9.6, docs/19 §9.6: la escasez temprana es real — un pequeño cuesta ~4.100 con todo y la oferta del publisher es una decisión de verdad) |
| Publisher (9.6) | reparto 55–75 % del bruto para siempre · adelanto = coste dev × cobertura 0,8–1,35 × rep 0,9–1,15, no recuperable, arranque a su cargo · distribución +15–45 % de demanda · bolsa de marketing 3k–200k × perfil · a veces IP y/o exclusividad de plataforma · ofertas deterministas (sin PRNG) |
| Early Access (9.6, desde E5) | solo auto-publicados en Pulido · precio ×0,7 · demanda ×0,2 (+hype, decae ×0,97/sem) · feedback: +0,35 QA y −0,3 bugs/sem · paciencia 52 sem, quema progresiva (rampa hasta ×2) · 1.0: pico recortado por compradores EA (tope 60 %) · traición si reseña < 60 |
| Precio por juego | 20–60 💰 según tamaño/era |
| Coste base por tamaño (docs/17 E1 + docs/18 V4) | 500 / 2.000 / 8.000 / 60.000 / 250.000 💰 (Pequeño/Mediano/Grande/Muy grande/AAA), cobrado al iniciar |
| Requisito por tamaño (docs/18 V4-b) | plantilla mín. 1 / 3 / 8 / 15 / 40 · etapa mín. Garaje / E. pequeño / Estudio / E. grande / **Corporación** |
| Duración por tamaño (docs/02 §6.1) | 6 / 18 / 42 / 72 / **120** semanas de calendario. 1 tick = 1 semana; la plantilla no acorta el plazo, mejora la ejecución (`crewRatio`, tope 1,5×). El **crunch** es la única excepción: 2 semanas de trabajo por tick (sale en la mitad, con el doble de bugs y desgaste) |
| Escala: 5 etapas que SE COMPRAN (docs/18 V4-a/c) | aforo 1/4/10/25/100 · proyectos 1/1/2/4/8 · requisito 25k / 200k+4 / 1,5M+8 / 8M+20 (capital+plantilla) · coste de ampliación 10k / 100k / 750k / 4M 💰. Cumplir el umbral habilita; ampliar se paga (botón en la cronología de escala) |
| Overhead fijo semanal por etapa (docs/18 V4-d) | +0 / +300 / +1.500 / +7.000 / +30.000 💰 sobre el fijo base (100 💰): la Corporación quema ~1,5M/año antes de nóminas — sin éxitos no se sostiene |
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| Marketing escalonado (docs/17 E2; **re-comprable y sin tope** desde 9.1) | Nota de prensa 2k (+0,08) / Anuncios 10k (+0,18) / Feria-Expo 40k (+0,32) / Campaña masiva 120k (+0,50 de expectación); cada compra repite coste y empuje |
| Licencia de plataforma | 10k–100k 💰 según generación (multiplataforma: cada una paga la suya) |
| Punto de I+D | ~1 por persona·semana en investigación |
| Construir motor propio (9.2, por generación 1→7) | 6k / 15k / 50k / 150k / 400k / 1,2M / 2,5M 💰 + 8/14/25/40/60/90/120 💡 + 6/8/12/16/20/26/32 semanas (capacidades aparte); **mejorar = 60 %** del coste |
| Nivel de motor por generación (9.2) | 2 / 4 / 7 / 11 / 15 / 21 / 26 (+ techBonus de capacidades: 3D +3, online +2, físicas +2, kits +1/+2) |
| Licenciar motor (9.2) | cuota por juego 15k–150k 💰 + **royalty 7–12 %** de los ingresos brutos, para siempre; catálogo desde E3, se renueva por eras |
| Herramientas del motor (9.2) | devOutput +5 %…+20 % por generación al proyecto que lo usa (no acorta el calendario) |
| Servicio en vivo / GaaS (9.7, docs/19 §9.7) | requiere «Juegos como servicio» (E6) + juego ≥ mediano con IP propia y aún en tiendas · siembra 0,25 × unidades × reseña · churn 2 %/sem +8 % a cuidado cero · crecimiento 2,5 % × equipo × reseña + 50 % de compradores nuevos · ARPU 0,5 × (1 + 0,5·pase + 0,8·agresividad), motor/publisher cobran su bruto · servidores 200–9k + 0,1/jugador · equipo EXCLUSIVO 3/5/8/16 · exprimido+descuidado ~8 sem → crisis con bombing · sunset proporcional a la parroquia · < 500 jugadores se apaga solo |
| Adquisiciones (9.7) | desde Estudio grande · indie 250k / medio 1,6M × (0,6 + fuerza/100 × 1,2), deterministas · gigantes no se venden; fuerza ≥ 66 rechaza · overhead 2,5k / 9k 💰/sem · bote por lanzamiento = 90k–3M × ((reseña−45)/55)^1,75 × directiva, al 6 %/sem · reseña de filial = rango del tier ± 22 × talento · directivas: exprimir ×1,7 ingreso, cadencia ×0,75, moral −1,2/sem, Empleador −0,02/sem, deuda crunch 0,05/sem · invertir +50 % overhead, moral +1, talento +0,15 (techo 85) · éxodo: moral < 25 × 10 sem → talento −8 y un rival se refuerza · vender = precio sobre talento × 0,55 |

**Sobre-hype (docs/17 E2):** si el hype entra en zona roja (≥ 0,65) pero la reseña no cumple (< 68), la
brecha `clamp01((hype−0,65)/0,35) × clamp01((68−reseña)/68)` castiga la **cola de ventas** (hasta −45 %)
y la reputación de **hardcore/comunidad** (hasta −5/−4 × brecha). El pico day-one no se toca.

- `factorMonetización` (subido en 9.1: la codicia rinde MÁS): premium = 1.0; premium+dlc ≈ **1.25**;
  premium+mtx ≈ 1.0 + **0.85**·`aggressiveness`; f2p ≈ 0.3 en ventas base + MTX ≈ **1.1**·`aggressiveness`.
- **Dilema con dientes (9.1):** la reputación decae sola hacia 50 (0.6 %/semana del exceso; sin cura
  gratis por debajo) y solo las reseñas > **65** construyen reputación.
- **Préstamos:** línea de crédito según reputación/activos; principal hasta ~6 meses de costes fijos;
  interés ~1%/semana; impago sostenido acelera la bancarrota.
- **Premios anuales** (tipo Game Awards) confirmados como sistema.
- Reputación = **vector por segmento**; "deuda de reputación" oculta que escala escándalos; regulación por era.
- Cierre de partida: **Puntuación de Legado** multi-dimensional (Riqueza/Prestigio/Impacto/Obras/Ética).

## 7. Comunidad y creadores (doc 07)

- Arquetipos de creador cerrados: Variedades masivo, Competitivo hardcore, VTuber, Crítico de culto,
  Influencer casual (en E1–E3 = revistas/prensa).
- Segmento "Comunidad", hype/leaks, review bombing y gestión de crisis con reloj: cerrados como sistema.

## 8. Contenido de datos (doc 09)

Las **tablas de contenido son baseline v1 cerrado** (géneros, temas, plataformas, features, rasgos,
eras, creadores, eventos, monetización). Los *esquemas* de tipos ya eran firmes. Ampliar contenido
(más géneros/temas) es trabajo de datos, no cambio de diseño.

## 9. UI/UX (doc 10)

- Estilo **flat/minimalista** con modo claro/oscuro; iconos `lucide-react`; avatares procedurales;
  portadas compositivas; arte hero por IA solo en Fase 7.
- Set de pantallas y sistema de componentes cerrados como baseline.

## 10. Qué queda deliberadamente "vivo" (no es una decisión pendiente)

- **Números de balance:** ajustables en playtest sin tocar el diseño (por eso viven en `balance.ts`).
- **Registro de riesgos** (`00` §10): seguimiento continuo durante el desarrollo.
- **Stretch de Fase 8** (franquicias, fabricar consola): fuera del alcance base por decisión.
  Los **rivales con IA** dejaron de estar en esta lista: se implementaron en la Fase 9.5 (docs/19 §9.5).

---

**Estado:** diseño cerrado. Listo para arrancar la **Fase 0** del roadmap (`11`).
