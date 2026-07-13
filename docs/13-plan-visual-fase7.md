# 13 — Plan Visual (Fase 7 en detalle)

La Fase 7 del roadmap (`11`) —"Pulido, arte hero y balance final"— es demasiado grande para un solo
prompt. Este documento la descompone en **sub-fases ejecutables** (7A–7G), cada una pensada como un
prompt independiente de Claude Code, con su meta y sus criterios de aceptación (CA).

> **Objetivo:** convertir el *vertical slice* funcional (fases 1–6) en un juego que **parezca un juego
> real**. No inventa diseño nuevo: **realiza lo que ya está especificado en el doc `10`** (que hasta
> ahora no se construyó porque las fases previas iban de sistemas, no de aspecto).

## Principios de esta fase `[DECIDIDO]`

- **Capa de presentación, no de lógica.** Las fases 1–6 quedan intactas. Esto es UI/arte/animación
  (doc `08`: la UI solo muestra). Ningún cambio debe romper los tests de lógica existentes.
- **Orden de cimientos a remate.** Primero el sistema de diseño, luego el foco visual, luego los
  momentos, luego el movimiento, luego las pieles, luego la puerta de entrada, y al final arte/sonido/balance.
- **Verificación visual.** Como el resultado es visual, cada sub-fase se cierra tomando una **captura**
  y comparándola con la meta (además de mantener los tests de lógica verdes). Para hitos grandes,
  usar un subagente que revise la captura.
- **Arte:** todo se genera con **código** (SVG/CSS/canvas). Solo unas pocas piezas "hero" opcionales
  (splashes de era, ilustraciones de eventos) pueden usar IA en 7G. El listón es un juego pulido y
  jugable. (Un upgrade isométrico ilustrado opcional futuro está en `14`.)

---

## 7A — Dirección de arte y sistema de diseño `[fundacional]`
**Meta:** que la app deje de parecer un panel de administración y pase a "producto diseñado".

- Fijar **tokens** en `ui/theme`: paleta de marca (dorado Capital, verde integridad, tinta, hueso),
  escala tipográfica, espaciado, radios, sombras planas (doc `10` §2, §11).
- Re-estilar los **componentes base**: barra superior, tarjetas, botones, chips, `StatBar`, tooltips.
- Jerarquía visual real (un área "hero", no todo tarjetas de igual peso).
- Aplicar la marca (logo/emblema de `brand/`, tipográfica mono del wordmark).

**CA:** una captura de la vista principal se ve intencional y con identidad (no dashboard genérico);
todos los componentes usan tokens; los tests de lógica siguen verdes.

## 7B — La Oficina Viva `[foco visual]` (doc `10` §5)
**Meta:** dar al juego un corazón visual por código. El mayor salto "dashboard → juego". La clave es
hacerla **con cariño y detalle** (no como un icono): es lo que decide si el juego "parece un juego".

- Escena central **SVG/DOM** de la oficina con los **avatares procedurales** (`05`/`09`) trabajando.
- Micro-animación idle desfasada por semilla (teclear, café, estirarse, "idea"), desacoplada del tick.
- **Reflejo de estado**: moral/crunch/éxito/crisis cambian la escena (luz, cafés que se acumulan,
  confeti, pánico).
- Crece con la etapa de escala (garaje → open space → corporación); la "cámara" se aleja.
- **Burbujas de desarrollo** codificadas por color (🔵 diseño 🟢 técnica 🟣 creatividad 🟠 arte 🔴 bug).

**CA:** la vista principal tiene un foco vivo que refleja el estado del equipo; en desarrollo suben las
burbujas; la escena escala con el estudio; y —criterio de calidad— se ve **cuidada** (luz, detalle,
composición), no un simple recuadro.

## 7C — Momentos señal `[el juego "actúa"]` (doc `10` §7)
**Meta:** construir los momentos memorables ya diseñados.

- **Gala de reseña**: número que sube contando + desglose escalonado ✔/~/✘ + notas por segmento.
- **Balanza "El Precio"**: medidor dual Reputación⚖️Capital que se inclina y tiñe la UI con cada palanca.
- **Reputación como constelación/radar** de segmentos.
- **Manómetro de hype** con zona roja de sobre-hype.
- **Feed de comunidad** reactivo + **Directo del streamer** con chat en vivo + **modal de crisis** con reloj.

**CA:** cada momento clave (lanzar, elegir monetización, crisis) tiene su presentación; siguen siendo
legibles y trazables (Pilares 1 y 2).

## 7D — Capa de movimiento `[jugosidad]` (doc `10` §4, §6)
**Meta:** que todo se sienta vivo, sin estorbar la lectura.

- Integrar **framer-motion**: contadores, barras, entradas escalonadas, transiciones de pantalla.
- **canvas-confetti** en hitos; shake/pulso en crisis; toasts.
- Tokens de movimiento (duraciones/easing) en `ui/theme`.
- **Rendimiento**: solo `transform`/`opacity`, animación desacoplada del tick; respetar
  `prefers-reduced-motion` + toggle "Reducir animaciones".

**CA:** las transiciones y feedback son fluidos; ninguna animación corre dentro del tick del núcleo;
el modo "reducir animaciones" funciona.

## 7E — Pieles de era y transición de era `[progresión sentida]` (doc `10` §8, §7.6)
**Meta:** que la interfaz **envejezca** con las 7 eras.

- Pieles por era como temas (variables CSS): E1 fósforo CRT → … → E7 glassmorphism.
- Beat de **transición de era** a pantalla completa (titular + cambio de piel).
- Contraste garantizado en todas; opción "UI moderna siempre".

**CA:** al cambiar de era, la piel se transforma con un beat claro; todas las pieles son legibles.

## 7F — Pantalla de título y onboarding `[la puerta de entrada]` (doc `10` §13)
**Meta:** dar al juego un frente y una buena primera experiencia.

- **Pantalla de título/menú** con el logo (`brand/`): Nueva partida / Cargar / Opciones.
- **Onboarding/tutorial** en el garaje que introduce sistemas de a poco.
- **Estados vacíos invitadores** (sustituir "Todavía ninguno" por algo con vida y guía).

**CA:** hay menú principal con identidad; una partida nueva guía al jugador novato; los estados vacíos
invitan a actuar.

## 7G — Arte hero, sonido, accesibilidad y balance final `[remate]`
**Meta:** dejar el juego listo para jugarse.

- Pocas piezas **hero** (splash de eras, ilustraciones de eventos) — SVG/CSS o IA (doc `10` §9); prescindibles.
- Capa de **sonido** con Web Audio (blips, chime, thud, hum) + toggle de silencio (doc `10` §12).
- **Accesibilidad**: contraste, navegación por teclado, escalado de fuente, tooltips (doc `10` §13).
- **Balance final** con bots (doc `08` §8) y ajuste de `data/balance.ts`; modo sandbox desbloqueable.

**CA:** se cumplen los objetivos medibles de `00` §9 (rejugabilidad, legibilidad, tensión moral, curva
sentida); el juego se siente terminado.

---

## Orden y dependencias

```
7A cimientos ─► 7B oficina ─► 7C momentos ─► 7D movimiento ─► 7E pieles ─► 7F título ─► 7G remate
```

7A es requisito de todo (los tokens). 7B–7C dan el "es un juego". 7D anima lo ya construido. 7E–7F
completan la experiencia. 7G es el remate final. No saltar: cada sub-fase deja una captura mejor que
la anterior y los tests de lógica siempre verdes.

## Nota para Claude Code

Antes de cada sub-fase, releer el/los apartados relevantes del doc `10` + `08` (arquitectura). Recuerda:
esto es **presentación**; la lógica de juego no se toca. Cierra cada sub-fase con una captura de
pantalla y un commit (`Fase 7X: …`).
