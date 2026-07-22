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
Garaje (un escritorio y un sofá viejo) → estudio pequeño (una sala) → estudio (open space con dos
equipos) → estudio grande (planta con sala de cristal y servidores) → corporación (la torre: tres
filas, doble sala y granja de servidores). El *zoom* de la cámara se aleja conforme creces: refuerza
físicamente el "de la nada a megacorporación".

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

### 6.1 Notificaciones de dos niveles `[DECIDIDO · Fase 8.2, docs/17 U4]`
Para que el jugador no se pierda lo importante, las notificaciones tienen **dos niveles**, clasificados
en datos (`src/data/notifications.ts`, fácil de reajustar):
- **Menores → toast** (abajo-derecha, no interrumpen): ventas rutinarias, cambios leves de sentimiento.
  Los pinta `Toasts` leyendo el historial; oculta los tipos con superficie importante (`TOAST_HIDDEN_TYPES`).
- **Importantes → pausan el tiempo**: unas tienen su **beat dedicado** (§7: gala de reseña, transición
  de era, gala de premios, crisis); las demás usan un **modal genérico** centrado con "Aceptar/Continuar"
  (`ImportantNoticeModal`): un juego que **sale del mercado** (con resumen **P&L** generó vs costó,
  Pilar 2), cualquier **renuncia**, el **aviso de bancarrota** inminente y la **subida de etapa de escala**.
  La pausa la dispara el estado/UI al encolar el aviso, nunca el núcleo (docs/08).

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

**Remate (Fase 8.6, docs/17 U1):** al pulsar "Entrar en la nueva era" el beat **encadena** con la
**cronología de eras** (§10.11), que entra con su muelle y el nodo recién conquistado ya encendido.
Se celebra el hito en la línea del tiempo completa —de dónde vienes y cuánto queda— en vez de solapar
dos overlays a pantalla completa.

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
  reputación como **constelación** (§I3, desglose en hover), controles de tiempo (pausa/x1/x2/x4) y el
  **menú ☰** `[DECIDIDO · Fase 8.5, docs/17 U2]`. **Sin paso manual** ("+1 semana", retirado en la Fase
  8.5): el reloj se gobierna con la velocidad y el juego **pausa solo** cuando toca decidir (`02` §1).
- **Panel central:** la **Oficina Viva** (§5) o el proyecto en curso con su progreso por fases y burbujas.
- **Los juegos que aún se venden** `[DECIDIDO · Fase 8.5]`: solo el catálogo **vivo**, cada uno con un
  **mini-gráfico** (`Sparkline`) de copias por semana — la cola de ventas de `04` §6, a la vista (Pilar 2).
  Lo retirado no ocupa sitio: vive en el modal de Juegos lanzados.
- **Panel lateral:** **Feed de la comunidad** (§7.3) + notificaciones/alertas (crisis, renuncias, ofertas).
- **Menú ☰ → modales** `[DECIDIDO · Fase 8.5, docs/17 U2]`: **Juegos lanzados** (estantería completa),
  **Historial** (el diario del estudio) y **Partida** (guardar, cargar, nueva, volver al título, retirarse,
  ver legado). No hacía falta verlos siempre, así que se abren a demanda. **No pausan** el tiempo (los
  pide el jugador); los que interrumpen son los avisos importantes de §6.1.

### 10.2 Concepción de proyecto (asistente, en **modal**) `[DECIDIDO · Fase 8.5, docs/17 U3]`
Flujo Tema → Género → Plataforma → Público → Tamaño → Nombre, con **medidor de Fit** en vivo
(verde/ámbar/rojo, sin exponer el número crudo; `03`). Resumen de coste/tiempo estimado.
- Es un **modal** sobre el estudio, y **abrirlo pausa** el tiempo (`02` §1).
- **Tema, género y plataforma** se eligen con **selectores** (el catálogo crece con cada era; listarlo
  entero abruma), con su tendencia ↑→↓ en la etiqueta. **Público y tamaño** son botones: pocas opciones
  fijas, y el tamaño muestra atenuado su requisito 🔒 (docs/17 E1).
- El pie fijo lleva Fit + estimación + "Empezar desarrollo"; al dar luz verde se aterriza en desarrollo,
  **en pausa**, y se arranca con **"Continuar desarrollo"** (§10.3).

### 10.3 Desarrollo (fases), en **modal** `[DECIDIDO · Fase 8.5, docs/17 U3]`
Sliders de reparto de esfuerzo con lectura de balance vs ideal del género; features como **ChoiceCard**;
progreso, estado de bugs y **burbujas de desarrollo** (§5.4) visibles.

Es la **ventana del hito de fase**, no una pantalla que se vigila (`02` §2): se abre al concebir y en cada
cambio de fase (el tick ya pausa ahí), y **"Continuar desarrollo"** la cierra y reanuda a **x1** para ver
trabajar a la Oficina Viva hasta el siguiente hito. Estructura en **dos columnas**, para que la decisión
no se pierda en una pila de paneles:

| Zona | Contenido |
|------|-----------|
| **Cabecera** | Nombre, género, semana X de Y, stepper de las 3 fases (✔ superadas) y barra de progreso; pestañas si hay varios proyectos |
| **Columna izquierda — la decisión de ESTA fase** | Reparto de esfuerzo de la fase + su lectura (Diseño/Técnica vs ideal, bugs). En **Concepto**, además, las **features** (única fase donde se eligen) |
| **Columna derecha — el contexto** | **Equipo asignado** (avatares, factores, crunch) y **Marketing** (Manómetro de Hype + campañas), que **solo abre desde Producción** — antes explica por qué, en vez de enseñar botones muertos |
| **Pie** | "▶ Continuar desarrollo" + qué va a pasar al pulsarlo |

### 10.4 Lanzamiento y desglose de reseña
La **gala de la reseña** (§7.1): reseña por segmento + desglose factor a factor con ✔/~/✘ y veredicto.

### 10.5 Marketing y creadores (doc 07)
Roster de creadores como tarjetas (alcance, público, afinidad estimada), reparto de **claves limitadas**,
**Manómetro de Hype** (§7.5) y, al lanzar, el **Directo del streamer** (§7.2).

### 10.6 Equipo (doc 05)
Tarjetas de empleados con avatar, moral, energía, skills y rasgos; pool de contratación; acciones
(asignar, formar, motivar, crunch, despedir). En corporación, vista de **políticas**.
Desde el **Estudio** (etapa 3), panel de **subequipos** sobre la plantilla: grupos nombrados con sus
avatares y las acciones asignar en bloque / editar / renombrar / disolver; cada empleado luce la etiqueta
de su subequipo (docs/18 V5). En la ventana de desarrollo, **"Retirar equipo (descanso)" va junto al
crunch**, a propósito: son las dos palancas opuestas (el crunch compra plazo con desgaste; retirar paga
desgaste con plazo) y verlas juntas es la decisión. Sin nadie asignado, el proyecto se marca **"En pausa"**
y dice las dos mitades del trato: ni avanza, ni se pierde.

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

### 10.12 Investigación / I+D (doc `02` §3) `[DECIDIDO · Fase 10.3, docs/20 W7]`
Cuatro bloques en este orden: **personal en I+D** (quién investiga), el **taller de motores** (9.2),
los **temas por investigar** (8.4) y el **árbol de nodos agrupado por era**.

**Solo se muestran las eras que ya han llegado.** Antes, el árbol dibujaba las siete de golpe y el
jugador leía veinte filas bloqueadas para encontrar la única que podía pagar. Ahora la lista se corta
en la era actual y se cierra con un **teaser discreto** —"🔮 La próxima era traerá nuevas tecnologías.
Todavía no existen: nadie del sector sabe aún cómo se llamarán"— que desaparece en E7, cuando ya no
queda nada por venir. Sin nombres ni cuentas: el misterio concreto lo cuenta la **cronología de eras**
(§10.11) con sus "???", y aquí basta con desatascar la lista sin perder el gancho.

Es **presentación pura**: qué se puede investigar y cuándo no cambia (lo sigue diciendo
`researchNodeStatus`). La UI no decide nada — pregunta al núcleo con `visibleResearchEras(state)` y
`hasFutureResearch(state)`, dos selectores puros de `core/systems/research.ts`.

### 10.11 Cronologías de era y de escala (overlay) `[DECIDIDO · Fase 8.6, docs/17 U1]`
Los **dos ejes de progreso** de `16` §3 —el mundo cambia, tu estudio crece—, cada uno con su overlay
sobre el estudio (telón semitransparente: la partida sigue ahí detrás). Se abren desde **su chip de la
barra superior**; la de eras, además, **se abre sola** al final del beat de era (§7.6).

- **Barra de nodos** hexagonales: **superados** en verde (con ✓), **actual** con el acento de la piel,
  trazo grueso y **pulso**, **futuros** con borde punteado y "?". Un hilo los une y se tiñe de verde en
  el tramo recorrido. Navegable con ratón (hover/clic) y con teclado (`←`/`→`, patrón *tablist*).
- **Panel inferior** con el nodo elegido. **Eras:** nombre, años y novedades (plataformas + negocio);
  los futuros dicen "???" —el misterio se mantiene—. **Escala:** rol, foco de decisiones, **requisitos**
  (capital + plantilla) y **coste de ampliación** más aforo y proyectos en paralelo; los futuros **sí**
  los enseñan: una etapa es un objetivo al que apuntar, no una sorpresa.
- **La escala se COMPRA aquí (docs/18 V4-c, Fase 8.8):** el nodo de la etapa siguiente lleva el botón
  **"Ampliar estudio (coste: X 💰)"** — habilitado cuando el núcleo dice que se cumple el requisito
  (`expandBlockReason === null`), atenuado con su motivo si no. Al abrir la cronología con la compra
  disponible, la selección arranca en ese nodo (es a lo que manda el aviso "puedes ampliar" de U4).
- **Ni pausan ni deciden nada más** (criterio de la Fase 8.5): los abre el jugador y se cierran con Esc.
  Los datos se **derivan** del núcleo (`eraNovelties`, `scaleStageInfo`, `expandBlockReason`) — los
  requisitos y el coste que se enseñan son los que valida `expandStudio`, y las novedades, las que canta
  el beat (`08` §6: la UI no calcula reglas).

**Dos trampas de las pieles**, resueltas en el CSS (§8): el estado del nodo **no puede depender del
tono** (hay pieles cuyo acento *es* verde —E5 esmeralda, E1 fósforo— y el actual se confundiría con los
superados: la diferencia es estructural, hueco contra relleno), y el **tinte del relleno se queda bajo**
(22 %): un acento al 55 % arrastra la cara lejos de la superficie de la piel y con ella el contraste del
glifo, en direcciones opuestas según la piel (E7 cian claro contra tinta clara: 2,7:1). Con el tinte
suave, las 7 pieles pasan AA de sobra.

---

## 11. Sistema de diseño (componentes reutilizables) `[DECIDIDO]`

Base: `StatBar`, `TrendArrow`, `Card`, `MeterFit`, `ChoiceCard`, `EmployeeCard`, `CreatorCard`,
`ReviewBreakdown`, `TimeControls`, `MoneyFlowChart`, `CrisisModal`, `Toast`, `Tooltip`.

Nuevos (para las innovaciones): `OfficeScene` (§5), `FloatingBubbleLayer` (§5.4),
`ReviewRevealSequence` (§7.1), `StreamPanel` + `LiveChat` (§7.2), `CommunityFeed` (§7.3),
`MoralScale` ("El Precio", §7.4), `ReputationRadar` (§I3), `HypeGauge` (§7.5), `EraSkinProvider` (§8),
`EraTransition` (§7.6), `ConfettiLayer`, `LegacyMuseum` (§7.7).

De la Fase 8.5 (docs/17 U2–U3): `StudioMenu` (el ☰ de la barra), `MenuModals` (juegos/historial/partida
sobre un chasis común), `ConceptionModal` (§10.2), `DevelopmentModal` (§10.3) y `Sparkline` (mini-gráfico
de la cola de ventas, SVG por código). Utilidad `.scroll-slim`: la **barra de scroll** de modales y
listas se pinta con tokens (la del sistema desentonaba con las pieles de era) y nunca estrecha la zona
de agarre.

De la Fase 8.6 (docs/17 U1): `Timeline` (§10.11), un overlay genérico para los dos ejes de progreso.
Sus **nodos hexagonales** son `<polygon>` SVG por código (§9), no `clip-path`: el recorte se come el
borde y el anillo de foco, y obliga a fingir el contorno con capas — que en la piel E7, cuyas
superficies son **cristal translúcido**, se transparentan y sangran el color del marco sobre el
hexágono entero. Con `stroke` el borde es real y el punteado de las futuras es `stroke-dasharray`.

Todos temáticos (claro/oscuro **y piel de era**) desde `ui/theme`, y sin lógica de simulación dentro (`08`).

## 12. Sonido `[DECIDIDO · opcional]`

Plus de Fase 7; el juego funciona muteado. Todo con **toggle de silencio** y volumen.

### 12.1 Efectos (SFX) — Web Audio, sin archivos
Blips procedurales con **Web Audio API**: orbes de desarrollo, ticks del reloj, chime de buena reseña,
thud grave de crisis, hum ambiental de oficina. Mezcla sutil.

### 12.2 Música de fondo por periodos
Música instrumental que **evoluciona con las eras**, para que las horas de gestión no cansen. En vez de
7 pistas sueltas (riesgo de incoherencia), **4 "periodos musicales"** con ADN común (acogedor/positivo,
~80 BPM, instrumental, loopable) y la instrumentación envejeciendo:

| Periodo | Eras | Estilo |
|---------|------|--------|
| Retro | E1–E2 | Chiptune / 8-bit cálido y nostálgico |
| Transición | E3–E4 | Lo-fi con instrumentación más rica (CD/rock suave) |
| Moderno | E5–E6 | Lo-fi / synthwave pulido |
| Futuro | E7 | Ambient / electrónico etéreo |

- **Data-driven:** `era → periodo → pista(s)`, como las pieles (§8); el cambio de pista se engancha al
  **beat de transición de era** (§7.6).
- **Loop:** cada pista empieza/termina estable; se reproduce en bucle con crossfade; ten 2-3 por periodo.
- **Incremental:** se puede lanzar con una pista y añadir periodos después. No bloquea.
- **Fuente:** IA (Gemini/Lyria 3, clips ~30s, instrumental). Prompts en §12.3.
- ⚠️ **Licencia:** las pistas de IA llevan marca SynthID; revisar términos de uso comercial antes de publicar.

### 12.3 Prompts de música (Gemini / Lyria 3) `[baseline]`
Generar los 4 como un **set relacionado** (escucharlos juntos para que peguen). Base común en todos:
instrumental, sin voz, ~80 BPM, discreto, loopable.

Retro (E1–E2): `chiptune/8-bit cálido y nostálgico de garaje` · Transición (E3–E4): `lo-fi con
instrumentación más rica, aire 90s CD/rock suave` · Moderno (E5–E6): `lo-fi/synthwave pulido` ·
Futuro (E7): `ambient/electrónico etéreo y espacioso`. (Prompts completos en el chat de diseño.)

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
