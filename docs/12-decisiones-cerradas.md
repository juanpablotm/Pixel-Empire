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
- Estudios rivales: **diferidos a Fase 8** (el diseño los admite sin reescritura).

## 3. Fórmulas de calidad (doc 03)

- Pesos de composición **v1**: `wF=0.30, wB=0.25, wC=0.20, wD=0.25`.
- `innovationMod` en rango `0.9–1.15`.
- `teamFactor` en rango típico `0.5–1.3`.
- Techo de calidad por era activo (`techoQ`).

## 4. Mercado (doc 04)

- Reseñas calculadas **por segmento** (crítica, hardcore, casual, prensa, comunidad).
- Fórmulas de Calidad→Reseña y Reseña→Ventas cerradas como baseline (parametrizadas en `balance.ts`).
- Saturación con decaimiento temporal; hype de doble filo; curva de ventas pico + cola larga.
- Ciclos de vida de plataformas activos.
- Eventos de mercado (ferias, boom/recesión, nacimiento de modas, regulación) cerrados como sistema.

## 5. Personal (doc 05)

- Lista de rasgos base cerrada (ver `09` §6).
- **Química de equipo v1:** `sinergiaFactor = clamp(1 + Σ_pares (0.03·afín − 0.04·conflicto), 0.8, 1.2)`.

## 6. Economía y dilema moral (doc 06)

**Cifras base v1** (todas en `data/balance.ts`):

| Concepto | Valor base v1 |
|----------|---------------|
| Capital inicial (garaje) | 10.000 💰 |
| Precio por juego | 20–60 💰 según tamaño/era |
| Coste base por tamaño (docs/17 E1) | 500 / 2.000 / 8.000 / 40.000 💰 (Pequeño/Mediano/Grande/AAA), cobrado al iniciar |
| Requisito por tamaño (docs/17 E1) | plantilla mín. 1 / 3 / 8 / 15 · etapa mín. Garaje / Estudio pequeño / Consolidado / **Corporación** |
| Duración por tamaño (docs/02 §6.1) | 6 / 18 / 42 / **120** semanas de calendario. 1 tick = 1 semana; la plantilla no acorta el plazo, mejora la ejecución (`crewRatio`, tope 1,5×). El **crunch** es la única excepción: 2 semanas de trabajo por tick (sale en la mitad, con el doble de bugs y desgaste) |
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| Marketing escalonado (docs/17 E2) | Nota de prensa 2k (+0,08) / Anuncios 10k (+0,18) / Feria-Expo 40k (+0,32) / Campaña masiva 120k (+0,50 hype) |
| Licencia de plataforma | 10k–100k 💰 según generación |
| Punto de I+D | ~1 por persona·semana en investigación |

**Sobre-hype (docs/17 E2):** si el hype entra en zona roja (≥ 0,65) pero la reseña no cumple (< 68), la
brecha `clamp01((hype−0,65)/0,35) × clamp01((68−reseña)/68)` castiga la **cola de ventas** (hasta −45 %)
y la reputación de **hardcore/comunidad** (hasta −5/−4 × brecha). El pico day-one no se toca.

- `factorMonetización` v1: premium = 1.0; premium+dlc ≈ 1.15; premium+mtx ≈ 1.0 + 0.6·`aggressiveness`;
  f2p ≈ 0.3 en ventas base + MTX ≈ baseInstalada · 0.8 · `aggressiveness`.
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
- **Stretch de Fase 8** (rivales con IA, franquicias, fabricar consola): fuera del alcance base por decisión.

---

**Estado:** diseño cerrado. Listo para arrancar la **Fase 0** del roadmap (`11`).
