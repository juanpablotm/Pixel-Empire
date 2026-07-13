# 10 — UI / UX, Visual y Animación

Define la experiencia, el aspecto y **cómo se mueve** el juego: pantallas, flujos, sistema de diseño
**flat / minimalista moderno**, y una especificación de animación completa. Regla transversal: la UI
**muestra**, el núcleo **calcula** (ver `08`). Toda decisión importante debe ser **legible** (Pilar 2):
el jugador siempre entiende qué pasa y por qué.

> **Tesis visual:** todo el aspecto y la animación se generan con **código** (SVG, CSS, canvas,
> librerías npm) — sin pipeline de arte externo, salvo un puñado de piezas "hero" opcionales (Fase 7).
> El listón **no** es "una web funcional": es un **juego pulido y jugable**, con un foco visual fuerte,
> los momentos señal y movimiento. GDT se hizo con tecnología web; su nivel de **acabado** es la referencia.
>
> *(Un upgrade opcional futuro a oficina isométrica ilustrada queda documentado en `14`; NO es la
> dirección actual.)*

---

## 1. Principios de UX `[DECIDIDO]`

1. **Legibilidad por encima de todo.** Los números importantes siempre llevan contexto (tendencia,
   comparación con el ideal, causa). Nada de barras misteriosas.
2. **Pausable y sin prisa.** El jugador decide a su ritmo; el tiempo se detiene para decisiones clave.
3. **Progresión visible.** La UI *crece y envejece* con el estudio: del garaje humilde al piso corporativo.
4. **Feedback claro tras cada acción.** Especialmente el desglose de reseña (el momento de aprendizaje).
5. **Densidad gestionada.** Es un juego de datos; jerarquía, tarjetas y paneles colapsables para no abrumar.
6. **Jugosidad al servicio de la lectura.** La animación comunica (qué cambió, por qué), nunca estorba.
   Todo lo no esencial se puede desactivar (`prefers-reduced-motion`).

## 2. Estilo visual `[DECIDIDO]`

- **Flat / minimalista moderno, con acabado de juego.** Superficies limpias, tarjetas con esquinas
  suaves, buen espacio, tipografía clara, color con intención (estado > decoración). Lo que separa
  "juego" de "web" son el **foco visual central** (§5), los **momentos señal** (§7) y el **movimiento** (§4).
- **Paleta semántica:** neutros de base + verde (bueno/integridad), ámbar (precaución), rojo
  (malo/codicia/crisis), azul (información), y un **dorado** reservado al eje "Capital/codicia". Modo claro y oscuro.
- **Sin pixel art ni 3D.** El "sabor de época" lo dan los datos y la **piel diegética de la UI** que
  envejece por era (§8), no sprites dibujados a mano.
- **Motion con propósito** (todo el detalle en §4–§7).

---

## 3. Innovaciones visuales frente a GDT `[DECIDIDO · innovación]`

GDT es entrañable pero visualmente estático: una oficina con orbes flotando y poco más. Nosotros
convertimos nuestros **sistemas únicos** en lenguaje visual. Estas son las apuestas que nos distinguen:

| # | Innovación | Qué hace y a qué sistema sirve |
|---|-----------|--------------------------------|
| I1 | **La Oficina Viva** | Una **escena de estudio por código** (SVG/DOM, flat — no isométrica) *refleja el estado del equipo*: moral, crunch, éxito y crisis se ven (cafés que se acumulan, luz nocturna, confeti, plantas que se marchitan). Hace visible lo abstracto de `05`. |
| I2 | **La Balanza "El Precio"** | Medidor dual persistente Reputación⚖️Capital que *se inclina* con cada palanca moral y tiñe sutilmente la interfaz (calidez vs dorado frío). El eje de `06`, hecho conciencia visual. |
| I3 | **Reputación como constelación** | La reputación segmentada (`06`) se muestra como un **radar/aura** de públicos, no como un número. Ves de un vistazo a quién amas y a quién traicionas. |
| I4 | **El Directo del streamer** | Un panel tipo Twitch donde un creador *juega tu juego en vivo* con **chat que reacciona en tiempo real**. El "bug en directo" (`07`) es un beat animado y dramático. |
| I5 | **El Feed de la comunidad** | Un muro social simulado ("Chirp"/"Grumble") que reacciona casi en tiempo real a tus decisiones, con hashtags en tendencia y sentimiento coloreado. Da rostro a `07`. |
| I6 | **Reseña como gala** | El desglose de `03` se revela como una ceremonia de premios: el número sube, y los factores ✔/~/✘ entran escalonados. Convierte el aprendizaje en espectáculo. |
| I7 | **UI diegética por era** | La *piel* de la app envejece con las 7 eras (`02`): de fósforo verde CRT a glassmorphism futuro. Refuerza "de la nada a megacorporación" como ninguna barra de progreso. |
| I8 | **Medidor de Hype a presión** | El hype es un manómetro/globo que puede sobre-inflarse a la zona roja y **reventar** en backlash si no cumples (`04`/`07`). |
| I9 | **El Museo del Legado** | La pantalla final es un museo recorrible de tus juegos (portadas procedurales), premios en la pared y un retrato de tu perfil moral (`06`). |

---

## 4. Sistema de movimiento (motion design) `[DECIDIDO]`

### 4.1 Principios de animación
- **Comunicar el cambio:** toda animación responde a "algo cambió de estado". Si no comunica, se recorta.
- **Rápida y respetuosa:** microinteracciones veloces; solo los "momentos señal" (§7) se toman su tiempo.
- **Física creíble:** entradas con *ease-out*, salidas con *ease-in*, elementos "vivos" con *spring* suave.
- **Coreografía escalonada** (*stagger*) para listas y desgloses: entran en cascada, no de golpe.

### 4.2 Tokens de movimiento (en `ui/theme`) `[DECIDIDO · baseline v1]`
```
duración:  instant 80ms · fast 140ms · base 220ms · slow 400ms · dramatic 900ms
easing:    standard cubic-bezier(.2,0,0,1) · decel cubic-bezier(0,0,0,1)
           accel cubic-bezier(.3,0,1,1) · spring (framer-motion: stiffness 260, damping 24)
```

### 4.3 Reglas de rendimiento `[DECIDIDO]`
- **Solo `transform` y `opacity`** en animaciones frecuentes (evitar layout/paint). `will-change` con moderación.
- **Desacoplar de la simulación:** las animaciones corren con CSS / `requestAnimationFrame` / framer-motion,
  **nunca** dentro del tick del núcleo (`08`). El estado de juego no depende de si hay animación.
- **Presupuesto de partículas:** límites por escena; en dispositivos lentos, degradación elegante.
- **`prefers-reduced-motion`:** desactiva parallax, partículas y desplazamientos; conserva solo
  fundidos suaves y cambios de estado esenciales. Además, toggle propio "Reducir animaciones".

### 4.4 Librerías (npm, sin herramientas externas) `[DECIDIDO]`
- **framer-motion** — springs, `layout` animations, `AnimatePresence` para montaje/desmontaje.
- **canvas-confetti** — celebraciones (lanzamiento exitoso, premios).
- **Recharts** — animación de entrada de gráficos (ya en stack).
- *(Opcionales)* **tsParticles** para efectos ambientales; **lottie-web** si alguna vez se quiere una
  animación vectorial hecha a mano (JSON, sin dependencia de servicio).

---

## 5. La Oficina Viva `[DECIDIDO · innovación]` (I1)

El corazón visual del juego: una **escena de estudio generada por código** (SVG/DOM, flat) con tu(s)
**avatar(es) procedurales** (`09`) trabajando, que refleja el estado del equipo. No es isométrica ni
raster: se compone con formas vectoriales. Es el foco que distingue "juego" de "dashboard", así que hay
que hacerla **con cariño y detalle** (luz, micro-vida, props), no como un icono más.

### 5.1 Micro-vida (idle)
Cada empleado tiene micro-animaciones en bucle desfasadas por semilla: teclear, sorber café, estirarse,
mirar la pantalla, una bombilla "💡" ocasional. Nada sincronizado (evita el efecto "robot").

### 5.2 La oficina refleja el estado (lo que GDT no hace)
La escena es un **termómetro del estudio**; el jugador "siente" los stats sin leer números:

| Estado (de `05`/`06`/`07`) | Cómo se ve la oficina |
|----------------------------|------------------------|
| Moral alta | Luz cálida, plantas sanas, avatares erguidos, algún "💡" |
| Moral baja / **crunch** | Luz atenuada y nocturna, reloj en la pared marcando tarde, tazas de café acumulándose, brillo rojo de "horas extra", posturas hundidas |
| **Lanzamiento exitoso** | Confeti, avatares que vitorean, pantallas con ↑ de ventas |
| **Crisis / review bombing** | Pulso rojo, avatares mirando el móvil con cara de pánico, humo/alerta sobre el logo |
| **Nueva era** | La oficina se re-decora (muebles, hardware, tamaño) al cambiar de era |

### 5.3 Crece con la escala (`02` §4)
Garaje (un escritorio y un sofá viejo) → estudio pequeño (una sala) → consolidado (open space con
varios equipos) → corporación (planta con salas y cristales). El *zoom* de la cámara se aleja conforme
creces: refuerza físicamente el "de la nada a megacorporación".

### 5.4 Las Burbujas de Desarrollo `[DECIDIDO]` (homenaje a GDT, mejorado)
Durante el desarrollo, de los escritorios ascienden **orbes** que suben y se desvanecen (CSS keyframes:
`translateY` + `opacity`). Codificados por color para ser *legibles* (a diferencia de GDT):

- 🔵 **Diseño** · 🟢 **Técnica** · 🟣 **Creatividad/Historia** · 🟠 **Arte/Sonido** · 🔴 **🐛 Bug**

La **cadencia** de orbes refleja el output real del equipo; los orbes 🐛 aparecen cuando sube `bugDebt`
(`03`). Pasar el ratón muestra el recuento acumulado por aspecto. Es el "feel" icónico de GDT, pero al
servicio de la transparencia.

---

## 6. Catálogo de micro-animaciones `[DECIDIDO · baseline v1]`

| Efecto | Disparador | Técnica | Duración |
|--------|-----------|---------|----------|
| Contador que "rueda" (dinero, ventas) | Cambia un valor numérico | tween JS/framer | base |
| Barra/medidor que se llena | Progreso, hype, moral | CSS width/transform | base–slow |
| Tarjeta que entra (stagger) | Aparece lista/desglose | framer `AnimatePresence` | fast, escalonado |
| Pulso de atención | Alerta, crisis, botón clave | CSS keyframe scale/opacity | loop suave |
| Toast de notificación | Evento/feed | slide-in + auto-dismiss | fast |
| "Pop" de recompensa | Desbloqueo, subida de nivel | spring scale + destello | fast |
| Orbe de desarrollo | Trabajo en curso | CSS translateY+opacity | slow, continuo |
| Shake sutil | Error, crisis, backlash | transform translate | instant×3 |
| Confeti | Lanzamiento hit, premio | canvas-confetti | dramatic |
| Transición de pantalla | Navegación | fade/slide framer | fast |
| Latido del reloj / tick | Avance de semana | escala leve del icono de tiempo | instant |

---

## 7. Momentos "señal" (signature moments) `[DECIDIDO · innovación]`

Las pocas animaciones a las que **sí** dejamos brillar. Son los recuerdos del jugador.

### 7.1 La Reseña como gala (I6) — pantalla de lanzamiento
Secuencia: (1) redoble/pausa dramática; (2) el número global **sube contando** hasta su valor;
(3) los factores del desglose (`03` §5) entran **escalonados** con su icono ✔/~/✘ y un blip de sonido;
(4) las notas **por segmento** (`06`) voltean como chips; (5) aparece la frase-veredicto. Si es un
"hitazo", encadena con confeti y la oficina vitoreando (§5.2).

### 7.2 El Directo del streamer (I4) — marketing/creadores
Panel tipo Twitch: avatar del creador "jugando", una barra de **hype** que sube, y un **chat en vivo**
que scrollea con mensajes generados (según fit y calidad, `07`). Buen fit + juego pulido → chat eufórico,
emotes de hype, clip destacado positivo. **Bug en directo** (`bugLevel` alto): el vídeo "se congela", el
chat estalla en risas/emotes, cae un sello **"CLIP'D"**, y sube el riesgo de review bombing. Máximo drama,
100% trazable a tus decisiones.

### 7.3 El Feed de la comunidad (I5) — omnipresente lateral
Muro social simulado ("Chirp") que reacciona a tus actos casi en tiempo real: posts con sentimiento
coloreado, hashtags en tendencia (#GOTY o #Boicot). Durante una crisis (`07`) se convierte en una
"manguera" roja de indignación; tras un gesto de integridad, en elogios. Texto generado por plantillas
+ variables (barato, sin IA en runtime; opcionalmente `askClaude` para variedad si se desea).

### 7.4 La Balanza "El Precio" (I2) — HUD permanente
Un medidor-balanza ⭐⚖️💰 en la barra superior. Al elegir una **palanca de codicia** (`06`) la balanza
se inclina hacia el 💰 con un tintineo metálico y el acento de la UI vira a un **dorado frío**; una
palanca de **integridad** la inclina hacia ⭐ y calienta el tono. Un "grado" sutil de color en toda la
app refleja la deriva moral actual del estudio. Tu conciencia, visible.

### 7.5 El Manómetro de Hype (I8) — pre-lanzamiento
Aguja de presión (o globo) que sube con marketing/creadores. Pasada la línea roja entra en
**"sobre-hype"**: si el juego cumple, ventas récord; si no, el globo **revienta** en una animación de
backlash y el feed (§7.3) se torna rojo. Enseña el doble filo del hype (`04`) de un vistazo.

### 7.6 La Transición de Era (I7) — cada cambio de era
Beat a pantalla completa "el mundo cambia": un montaje/titular de prensa resume qué llega (nuevas
plataformas deslizándose, modas que nacen/mueren), la **piel de la UI se transforma** (§8), y suena un
acorde de transición. Marca el paso del tiempo como un hito emocional.

### 7.7 El Museo del Legado (I9) — cierre de partida
Pantalla final recorrible: estanterías con las **portadas procedurales** de todos tus juegos, una pared
de premios, una línea de tiempo de hitos, y un "retrato" de tu perfil moral (Riqueza/Prestigio/Impacto/
Obras/Ética, `06`). Un cierre para contemplar y compartir.

---

## 8. La UI diegética que evoluciona por era `[DECIDIDO · innovación]` (I7)

La innovación de progresión más memorable: **la propia interfaz envejece** con las 7 eras (`02` §5).
Se implementa como *temas* (variables CSS en `ui/theme`) que se intercambian por era — barato y
totalmente data-driven. Cada era tiene su "piel":

| Era | Piel de la UI |
|-----|---------------|
| **E1 La chispa** | Monocromo fósforo verde, sabor CRT (scanlines sutiles), tipografía de terminal |
| **E2 Las consolas** | Color primario limitado, formas boxy, 8-bit *insinuado* (sin ser pixel art literal) |
| **E3 El salto 3D** | Software beige/gris de los 90, botones con relieve, barras de título gruesas |
| **E4 La red** | Web temprana: degradados glossy, reflejos "Web 2.0", esquinas brillantes |
| **E5 Digital y móvil** | **Flat design** puro (nuestra base neutra), tarjetas limpias |
| **E6 Servicios y streamers** | Modo oscuro con acentos neón, estética "streaming/dashboard" |
| **E7 Futuro cercano** | Glassmorphism, translúcido, minimal futurista, micro-holografías |

Reglas: la piel **nunca** sacrifica legibilidad (contraste garantizado en todas); intensidad ajustable
y desactivable ("UI moderna siempre") en opciones. La transición entre pieles ocurre en el beat de era (§7.6).

---

## 9. Estrategia de assets `[DECIDIDO]` (ver también README)

Un juego flat necesita **muy pocos** assets raster: casi todo son tarjetas, paneles, medidores, la
escena de oficina por código y gráficos. Estrategia por capas:

| Tipo de asset | Solución | IA/raster |
|---------------|----------|-----------|
| **Iconos** (géneros, plataformas, features, estados) | Librería `lucide-react` | No |
| **Avatares de empleados** (tarjetas de RRHH) | Procedurales por semilla (DiceBear o capas SVG propias) | No |
| **Escena de oficina** (sala, avatares, props) | Compuesta por código (SVG/DOM), temada por era | No |
| **Portadas de los juegos creados** | Compositivas: plantilla + paleta por género + tipografía del título + motivo por tema | No |
| **Logos de plataformas ficticias** | SVG simples hechos a mano/CSS | No |
| **Gráficos** (ventas, hype, moral) | Recharts en runtime | No |
| **Arte "hero"** (splash de eras, ilustraciones de eventos) | Pocas piezas; generación por IA con guía de estilo unificada | Sí (pocas) |

Todo es vector/procedural (peso mínimo, coste cero, consistencia total). La IA se reserva para el
puñado de piezas hero **opcionales** (splash de eras, ilustraciones de eventos) en 7G. Un upgrade
isométrico futuro queda documentado en `14` (opcional, no es la dirección actual).

---

## 10. Pantallas principales `[DECIDIDO]`

### 10.1 Vista principal (Estudio / HUD)
- **Barra superior:** capital (contador animado), fecha (semana/año/era), **Balanza "El Precio"** (§7.4),
  reputación como **constelación** (§I3, desglose en hover), controles de tiempo (pausa/x1/x2/x4).
- **Panel central:** la **Oficina Viva** (§5) o el proyecto en curso con su progreso por fases y burbujas.
- **Panel lateral:** **Feed de la comunidad** (§7.3) + notificaciones/alertas (crisis, renuncias, ofertas).

### 10.2 Concepción de proyecto (asistente)
Flujo Tema → Género → Plataforma → Público → Tamaño → Nombre, con **medidor de Fit** en vivo
(verde/ámbar/rojo, sin exponer el número crudo; `03`). Resumen de coste/tiempo estimado.

### 10.3 Desarrollo (fases)
Sliders de reparto de esfuerzo con lectura de balance vs ideal del género; features como **ChoiceCard**;
progreso, estado de bugs y **burbujas de desarrollo** (§5.4) visibles.

### 10.4 Lanzamiento y desglose de reseña
La **gala de la reseña** (§7.1): reseña por segmento + desglose factor a factor con ✔/~/✘ y veredicto.

### 10.5 Marketing y creadores (doc 07)
Roster de creadores como tarjetas (alcance, público, afinidad estimada), reparto de **claves limitadas**,
**Manómetro de Hype** (§7.5) y, al lanzar, el **Directo del streamer** (§7.2).

### 10.6 Equipo (doc 05)
Tarjetas de empleados con avatar, moral, energía, skills y rasgos; pool de contratación; acciones
(asignar, formar, motivar, crunch, despedir). En corporación, vista de **políticas**.

### 10.7 Mercado y tendencias (doc 04)
Panel de tendencias con flechas ↑→↓ por género/tema y una marquesina "lo que está de moda"; ciclo de
vida de plataformas; eventos de mercado.

### 10.8 Gestión de crisis (doc 07)
Modal con **reloj** en cuenta atrás, descripción de la crisis y menú de respuestas con efectos estimados
por segmento; el feed y la oficina reaccionan en vivo.

### 10.9 Finanzas (doc 06)
Flujo de caja, ingresos por juego (curvas Recharts), costes desglosados, alertas de runway.

### 10.10 Pantalla de Legado (cierre)
El **Museo del Legado** (§7.7).

---

## 11. Sistema de diseño (componentes reutilizables) `[DECIDIDO]`

Base: `StatBar`, `TrendArrow`, `Card`, `MeterFit`, `ChoiceCard`, `EmployeeCard`, `CreatorCard`,
`ReviewBreakdown`, `TimeControls`, `MoneyFlowChart`, `CrisisModal`, `Toast`, `Tooltip`.

Nuevos (para las innovaciones): `OfficeScene` (§5), `FloatingBubbleLayer` (§5.4),
`ReviewRevealSequence` (§7.1), `StreamPanel` + `LiveChat` (§7.2), `CommunityFeed` (§7.3),
`MoralScale` ("El Precio", §7.4), `ReputationRadar` (§I3), `HypeGauge` (§7.5), `EraSkinProvider` (§8),
`EraTransition` (§7.6), `ConfettiLayer`, `LegacyMuseum` (§7.7).

Todos temáticos (claro/oscuro **y piel de era**) desde `ui/theme`, y sin lógica de simulación dentro (`08`).

## 12. Feedback sonoro (opcional) `[DECIDIDO · opcional]`

Sin archivos de audio necesarios: blips procedurales con **Web Audio API** (orbes, ticks, chime de buena
reseña, thud grave de crisis) + un hum ambiental de oficina. Mezcla sutil, con **toggle de silencio** y
volumen. Es un plus de Fase 7; el juego funciona muteado.

## 13. Accesibilidad y UX de calidad `[DECIDIDO]`

- Contraste garantizado en todas las pieles de era; nunca depender solo del color (icono+texto en estados).
- `prefers-reduced-motion` + toggle "Reducir animaciones" + toggle "UI moderna siempre" (desactiva pieles retro).
- Tooltips explicativos en cada métrica (refuerzan la transparencia); escalado de fuente; navegación por teclado.
- **Onboarding/tutorial** en la era del garaje que introduce sistemas de a poco (mitiga el riesgo de
  complejidad; `00` §10).

## 14. Adaptación por etapa de escala `[DECIDIDO]`

La UI cambia de foco con el estudio (`02` §4): en el garaje todo gira en torno a *tu* proyecto único; en
corporación aparecen vistas de portfolio, múltiples equipos y gestión por políticas. No mostrar controles
corporativos en el garaje (evitar abrumar). La Oficina Viva (§5.3) escala en paralelo.

## 15. Dónde se construye cada cosa (relación con el roadmap `11`)

La jugosidad **no** es solo Fase 7. Cada fase entrega su animación *baseline* junto a su pantalla; la
Fase 7 es el **pase de pulido cohesivo** (ritmo, sonido, arte hero, pieles de era afinadas).

| Elemento visual | Se introduce en |
|-----------------|-----------------|
| Tokens de movimiento, micro-animaciones base, tema claro/oscuro | Fase 1 |
| Oficina Viva (básica) + burbujas de desarrollo + gala de reseña | Fase 1–2 |
| Reflejo de moral/crunch en la oficina | Fase 2 |
| Panel de tendencias + Manómetro de Hype | Fase 3 |
| Balanza "El Precio" + Reputación radar | Fase 4 |
| Feed de comunidad + Directo del streamer + crisis en vivo | Fase 5 |
| Pieles de UI por era + Transición de era + Museo del Legado | Fase 6 |
| Sonido, arte hero, afinado y cohesión final | Fase 7 |

## 16. Criterios de aceptación (para Claude Code)

- [ ] Existen tokens de movimiento en `ui/theme` y se respetan `prefers-reduced-motion` + toggle propio.
- [ ] Ninguna animación corre dentro del tick del núcleo; usan CSS/rAF/framer-motion (`08`).
- [ ] La vista principal tiene barra de estado con Balanza "El Precio" y reputación como constelación.
- [ ] La Oficina Viva refleja moral/crunch/éxito/crisis y crece con la etapa de escala.
- [ ] Las burbujas de desarrollo están codificadas por color e incluyen 🐛 al subir `bugDebt`.
- [ ] El lanzamiento usa la gala de reseña con desglose por factores (`03` §5) y notas por segmento.
- [ ] El marketing incluye Manómetro de Hype y el Directo del streamer con chat reactivo (`07`).
- [ ] Existe Feed de comunidad reactivo y gestión de crisis con reloj y respuestas por segmento.
- [ ] La UI aplica una **piel por era** (variables CSS) con contraste garantizado y opción de desactivarla.
- [ ] La pantalla de cierre es el Museo del Legado con portadas procedurales y perfil moral.
- [ ] El estilo base es flat/minimalista con modo claro/oscuro; iconos `lucide-react`; avatares procedurales.
- [ ] Todo el aspecto se genera con código (sin pipeline de arte externo salvo piezas hero opcionales).
