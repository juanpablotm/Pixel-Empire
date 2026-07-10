# Pixel Empire: Game Studio Tycoon

> Un tycoon de estudio de videojuegos: de un garaje a un imperio, eligiendo siempre entre **reputación** y **capital**.

Simulador de gestión de un estudio de videojuegos, inspirado en *Game Dev Tycoon*, donde cada
decisión tira de dos cuerdas opuestas — **Reputación** y **Capital** — y donde no existe una única
estrategia óptima, sino filosofías de estudio distintas y todas viables.

Este repositorio contiene los **documentos de requerimientos y diseño** del juego, pensados para
ser consumidos por **Claude Code** durante la implementación, fase por fase.

**Estructura del repo:** el manual operativo (`CLAUDE.md`) y este índice viven en la raíz; todos los
documentos de diseño numerados (`00`–`12`) están en la carpeta **`docs/`**. Empieza por `GUIA-ARRANQUE.md`.

---

## Stack objetivo

- **Lenguaje:** TypeScript
- **UI:** React
- **Estilo visual:** Flat / minimalista moderno (dashboards, tarjetas, medidores, gráficos)
- **Plataforma:** Navegador (web)
- **Sin:** 3D, acción en tiempo real, multijugador ni minijuegos jugables. Es un sim de gestión puro.

---

## Cómo usar estos documentos (para Claude Code)

1. Lee siempre primero `docs/00-vision-y-pilares.md` y `docs/01-gdd.md` para el marco mental completo.
2. Antes de implementar un sistema, lee su documento dedicado (`docs/03`–`docs/07`) **y** `docs/09-esquemas-datos.md`.
3. `docs/08-arquitectura-tecnica.md` define cómo se estructura el código; respétalo en cada fase.
4. `docs/11-roadmap-fases.md` es la **fuente de verdad del orden de construcción**. Implementa por fases,
   respetando los criterios de aceptación de cada una.
5. Cada documento marca sus decisiones con estados: `[DECIDIDO]`, `[PROPUESTO]`, `[ABIERTO]`.
   Solo lo `[DECIDIDO]` es contrato; lo demás es negociable.

---

## Índice de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| — | `README.md` (raíz) | Este índice y guía de uso |
| — | `CLAUDE.md` (raíz) | Manual operativo que Claude Code lee automáticamente |
| — | `GUIA-ARRANQUE.md` (raíz) | Cómo empezar en Claude Code + primer prompt |
| 00 | `docs/00-vision-y-pilares.md` | Visión, fantasía central, pilares, tono, qué es y qué no es |
| 01 | `docs/01-gdd.md` | Documento de diseño general: todos los sistemas y cómo se conectan |
| 02 | `docs/02-bucle-nucleo-y-eras.md` | Bucle principal, fases de desarrollo, sistema de eras y progresión |
| 03 | `docs/03-sistema-calidad.md` | Modelo de calidad transparente (fórmulas y descomposición de reseñas) |
| 04 | `docs/04-mercado-y-modas.md` | Curvas de popularidad, hype, saturación, ciclos de plataformas |
| 05 | `docs/05-personal-y-equipo.md` | Empleados, rasgos, moral, burnout, química de equipo |
| 06 | `docs/06-dilema-moral-economia.md` | Eje Reputación↔Capital, monetización, escándalos, economía |
| 07 | `docs/07-comunidad-y-streamers.md` | Comunidad, creadores de contenido, hype/leaks, gestión de crisis |
| 08 | `docs/08-arquitectura-tecnica.md` | Stack, gestión de estado, motor de simulación, módulos, guardado |
| 09 | `docs/09-esquemas-datos.md` | Modelos de datos y tablas de contenido (géneros, temas, etc.) |
| 10 | `docs/10-ui-ux.md` | Pantallas, flujos, sistema de diseño, animación, assets procedurales |
| 11 | `docs/11-roadmap-fases.md` | Plan de construcción por fases con criterios de aceptación |
| 12 | `docs/12-decisiones-cerradas.md` | Registro de cierre de decisiones (baseline v1) |

---

## Los 5 pilares de diseño (resumen)

1. **El Dilema Moral es el eje.** Reputación vs Capital. Cada decisión importante tira de ambas.
2. **Calidad transparente.** Nada de caja negra: el jugador puede razonar por qué su juego triunfó o fracasó.
3. **Mercado vivo.** Modas que nacen y mueren; el *momento* de lanzar importa tanto como la calidad.
4. **Personas, no números.** Empleados con personalidad, moral y química; una comunidad que reacciona.
5. **De la nada a megacorporación.** Muchas eras, con una curva de progresión larga y sentida.

---

## Estado del proyecto

📄 **Fase actual:** Documentación de diseño y requerimientos.
✅ **Cierre v1:** todas las decisiones `[PROPUESTO]` cerradas como *baseline v1* (ver `docs/12-decisiones-cerradas.md`).
🔨 **Siguiente:** Implementación Fase 0 (andamiaje) — ver `docs/11-roadmap-fases.md` y `GUIA-ARRANQUE.md`.
