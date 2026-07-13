# 14 — Guía de Arte Isométrico (mejora opcional futura)

> ⚠️ **Estado: OPCIONAL / FUTURO — NO es la dirección actual.** La dirección visual vigente es **flat**
> (ver `10` y `13`): la oficina se genera **por código** (SVG/DOM). Este documento describe un posible
> **upgrade futuro** a una oficina isométrica ilustrada (tipo GDT). Se conserva porque la arquitectura
> lo admite sin reescribir la lógica (solo cambia la capa de presentación: `OfficeScene` → `IsoOffice`),
> por si algún día quieres subir el nivel del foco visual con arte ilustrado. Para construir ahora, **ignóralo**.

Si algún día se aborda este upgrade: la oficina sería el **corazón emocional** del juego (como en
*Game Dev Tycoon*), una sala isométrica ilustrada y acogedora con muebles y personajes, que crece y
refleja el estado del estudio, con el resto de la UI plana alrededor.

**Fuente de arte propuesta para el upgrade (HÍBRIDO):**
1. **Base = un kit isométrico cohesionado** (CC0 tipo Kenney.nl, o pack de itch.io/Synty): suelos,
   paredes, muebles y personajes genéricos. Un artista los hizo coherentes entre sí → cero lotería de
   consistencia para el grueso del set.
2. **Piezas hero = generadas por IA a medida**: 2–3 props de identidad únicos (el coche tapado del
   garaje, el cartel del estudio con el logo, trofeos) que hacen el juego *tuyo*.
3. **Chrome (UI) = código**: barras, paneles, momentos señal, con la marca y la paleta propias.

Este documento es el **contrato de consistencia**: tanto el kit como las piezas hero deben compartir
ángulo, luz, escala y paleta. El riesgo (que parezcan de juegos distintos) se evita eligiendo *un* kit
y generando lo hero **con ese kit como referencia de estilo**.

> **Diferenciación de GDT:** el kit es solo el mobiliario; no copiamos su look. Lo que hace único a
> *Pixel Empire* es todo lo que lo rodea — marca (corona dorada, wordmark mono), Balanza "El Precio",
> radar de reputación, feed de comunidad, pieles de era, momentos señal — más las piezas hero propias.
> GDT no tiene nada de eso.

> Es arte **isométrico 2D** (tiles/sprites), NO 3D. No rompe la regla "sin 3D" del doc `00`.

---

## 1. Especificaciones técnicas (la base de la consistencia) `[DECIDIDO]`

Estas specs son **obligatorias e idénticas** para *todas* las piezas. Si una pieza no las cumple, se
regenera.

| Parámetro | Valor fijo |
|-----------|-----------|
| Proyección | Isométrica **2:1 (dimétrica, ~26.57°)** — amigable para pixel/rejilla |
| Rejilla base | Tile de suelo de **256×128 px** (celda lógica); múltiplos para muebles |
| Fondo | **Transparente (PNG)**, una sola pieza por imagen |
| Luz | **Única, desde arriba-izquierda**; sombra de contacto suave abajo-derecha |
| Sombreado | **Cel/flat shading** con 2–3 tonos por superficie; sin degradados fotográficos |
| Contorno | Sin outline negro grueso; borde definido por el sombreado (estilo "clean vector") |
| Paleta | La de marca (`docs/10` §2) + maderas cálidas y paredes neutras (ver §2) |
| Escala | Personaje sentado ≈ 1.0–1.2 celdas de alto; coherente en todo el set |
| Cámara | Misma "altura" y ángulo en cada pieza (nunca cambiar el punto de vista) |

## 2. Paleta de la oficina `[DECIDIDO · baseline v1]`

Base de marca + tonos de ambiente cálido (para el "acogedor" de GDT):

- Maderas: `#7A5A3C` (oscura), `#A9793F` (media), `#C99A5E` (clara).
- Paredes por era (cambian con la piel de era, `docs/10` §8): E1 verde apagado `#8FA37A`; E2 azul `#5E82A6`;
  E3 gris/beige; … E7 futurista. (El suelo también evoluciona.)
- Acentos de marca: dorado `#E8B44A`, verde `#3FA66A`.
- Pantallas de PC: glow verde/ámbar por era (CRT).

## 3. Inventario de piezas (modular) `[DECIDIDO]`

Generar como piezas sueltas, transparentes, mismas specs. Se componen por capas en código.

**Estructura de sala:** tile de suelo (varios acabados por era), pared izquierda, pared derecha,
puerta, ventana, rodapié/esquinas.

**Mobiliario:** escritorio, silla de oficina, PC+monitor (una variante por era), estantería,
archivador, pizarra, sofá, mesa de café, dispensador de agua, planta (2–3), alfombra, papelera,
lámpara, cuadros/pósters.

**Hero props (identidad, no de kit):** el **coche tapado del garaje** (guiño), el cartel del estudio
con el logo, trofeos para las vitrinas.

**Personajes:** ver §4.

## 4. Estrategia de personajes `[DECIDIDO]`

Con muchos empleados posibles, NO se genera un dibujo único por empleado. Dos capas:

- **En listas/tarjetas de RRHH:** los avatares **procedurales** (DiceBear/SVG) que ya teníamos (`docs/09`).
- **En la oficina (isométrico):** un **set modular** de personajes: 3–4 cuerpos base sentados/de pie
  con variaciones de pelo/piel/ropa por capas, más **poses/estados** clave: trabajando, de pie,
  celebrando, cansado (crunch), en crisis (mirando el móvil). Se elige la pose según el estado (`05`/`06`/`07`).
  Fuente: preferentemente del **kit**; si no trae poses suficientes, se generan/adaptan con la disciplina de §6.

## 5. Animación `[DECIDIDO]`

Sin 3D ni físicas: micro-animación 2D barata.
- **Idle** por bob suave (translate/scale CSS) desfasado por semilla, o swap de 2 frames.
- Efectos ya definidos en `docs/10` §5–§7 (burbujas de desarrollo, confeti, café acumulándose).
- La animación va desacoplada del tick (`docs/08`).

## 6. Pipeline de producción (el orden que da consistencia) `[DECIDIDO]`

1. **Elige y coloca el kit base.** Selecciona un kit isométrico cohesionado (§10) cuyo estilo te guste;
   descarga suelos, paredes, muebles y personajes genéricos a `assets/iso/`. El kit define el estilo
   de referencia de todo el set.
2. **Genera las piezas hero con el kit como referencia.** Para los 2–3 props de identidad, usa la
   plantilla de §7 **adjuntando una captura del kit** como referencia de estilo (image-to-image /
   style reference), para que casen en ángulo, luz y paleta.
3. **Rellena huecos puntuales.** Si el kit no trae una pieza clave (p. ej. un PC de cierta era),
   genérala por IA con la misma disciplina, o adáptala del propio kit.
4. **Post-proceso:** recorta, normaliza al grid (§1), limpia bordes, exporta PNG transparente a `assets/iso/…`.
5. **Compón en código** (capas isométricas ordenadas por profundidad; ver §8).

## 7. Plantilla de prompt (base de estilo, reutilizable)

```
isometric 2:1 dimetric view, single <PIEZA> centered, transparent background,
soft top-left lighting with a subtle contact shadow, clean flat cel shading
(2–3 tones per surface), no thick outline, cozy stylized game art like a
management sim office, warm wood + [paleta hex de la era], consistent scale,
same camera height and angle as the reference image, no text, no logos
```

Sustituye `<PIEZA>` (p. ej. "office desk", "office chair", "potted plant", "CRT computer on desk").
Mantén EL RESTO idéntico en cada generación. Adjunta siempre la **pieza ancla** como referencia.

## 8. Integración en el código `[DECIDIDO]` (con `docs/08` y `docs/10` §5)

- Los sprites viven en `assets/iso/` (no en `data/`), organizados por era y categoría.
- Un componente `IsoOffice` compone las capas (suelo → paredes → muebles → personajes → props → efectos),
  ordenadas por profundidad isométrica.
- **Data-driven:** un mapa `era → set de tiles` y `etapa de escala → layout de sala` decide qué se
  muestra. La oficina es capa de **presentación**; NO contiene lógica de juego (la UI solo muestra).
- El estado (moral/crunch/era/escala/éxito/crisis) selecciona variantes/poses y efectos.

## 9. Reglas de oro de consistencia `[DECIDIDO]`

1. Mismo **ángulo** (2:1) y misma **altura de cámara** en cada pieza. Sin excepciones.
2. Misma **fuente de luz** (arriba-izquierda) y mismo estilo de sombra.
3. Misma **paleta** por era y mismo **sombreado** (cel shading).
4. Genera con la **pieza ancla como referencia** siempre; en lotes por categoría.
5. **Escala coherente** personaje↔mueble↔sala.
6. Revisa el set junto (contact sheet): cualquier pieza que "cante" se regenera.

## 10. Fuentes de kit y alternativas `[DECIDIDO]`

- **Plan A (recomendado):** un kit isométrico cohesionado como base. Opciones: **Kenney.nl** (CC0,
  gratis, uso comercial libre y sin atribución obligatoria), packs de **itch.io** o **Synty**. Elige
  uno cuyo estilo te guste y cuya paleta se pueda re-tintar a la marca.
- **Alternativa ambiciosa:** generar *todo* el set por IA a medida (máxima unicidad, pero asumes el
  riesgo de consistencia y mucha curación manual).
- La arquitectura es **agnóstica a la fuente**: `IsoOffice` solo consume PNGs de `assets/iso/`, así que
  puedes mezclar kit + hero + generado y cambiar de fuente cuando quieras, sin reescribir nada.

## 11. Herramientas `[requiere setup del usuario]`

- **Kit base:** descargar de Kenney.nl / itch.io (sin herramienta especial; solo elegir y bajar).
- **Piezas hero:** un generador de imágenes (no activo en esta sesión de diseño). Cuando llegues a la
  sub-fase 7B, usa el que prefieras con la plantilla de §7, adjuntando el kit como referencia de estilo.

Los prompts y el sistema ya están cerrados aquí; lo único variable es qué kit y qué motor uses.

## 12. Cobertura por eras (sin 7 sets completos) `[DECIDIDO]`

El "sabor de época" **no** viene de tener 7 juegos de muebles. Viene, en orden de impacto y coste:

1. **Piel de UI por era (código, gratis)** — doc `10` §8. Hace el grueso: CRT/fósforo en E1 → flat en
   E5 → glass en E7. Data toda la pantalla sin un solo asset nuevo.
2. **Re-tintado de paleta por era (código)** — el mismo mobiliario con paredes/suelos más cálidos o
   fríos según la era. Cero arte nuevo.
3. **Props que sí delatan la época (poco arte)** — sobre todo **el ordenador/monitor** (el objeto más
   "fechable"): ~7 variantes (CRT beige → tubo color → pantalla plana → futurista). Más 3-4 detalles de
   ambiente por era (póster, teléfono, consola sobre la mesa).

El **mobiliario base y los personajes se mantienen** entre eras (una oficina no cambia tanto); lo que
cambia es piel + tinte + esos pocos props.

**Presupuesto de arte real:** 1 kit base + ~7 variantes de PC + un puñado de props ≈ **15-25 piezas
pequeñas** repartidas por las eras, no cientos. Se evita explícitamente el error de generar/comprar 7
oficinas completas.

**Incremental:** como `IsoOffice` es data-driven por era (§8), se arranca con **una** era (garaje, E1)
y se añaden las variantes de PC/tinte como archivos nuevos después. La cobertura de eras **no bloquea**
el inicio de la 7B.

| Era | Piel (código) | Tinte | PC (arte) | Props ambiente |
|-----|---------------|-------|-----------|----------------|
| E1–E2 | fósforo/CRT, boxy | verde/azul apagado | CRT beige, monitor de tubo | póster retro |
| E3–E4 | 90s / web glossy | gris/beige | torre + CRT color / plano | pizarra, CD |
| E5–E6 | flat / oscuro neón | neutro / oscuro | portátil, plano ancho | móvil, kit de streaming |
| E7 | glass / futuro | frío translúcido | pantalla holográfica | visor RV |

## 13. Criterios de aceptación (para la sub-fase 7B)

- [ ] Existe un set de piezas isométricas con specs idénticas (§1) sobre fondo transparente en `assets/iso/`.
- [ ] Una pieza ancla define el estilo y el resto es coherente con ella (contact sheet sin piezas que desentonen).
- [ ] `IsoOffice` compone la sala por capas, data-driven por era y etapa de escala.
- [ ] La oficina refleja el estado (poses/efectos por moral/crunch/éxito/crisis) sin lógica en la UI.
- [ ] La oficina se ve **acogedora e ilustrada** (objetivo: acercarse a GDT), no plana.
- [ ] La cobertura de eras se logra con piel + tinte + pocos props (§12), no con 7 sets completos, y es
      incremental (se puede arrancar con una sola era sin bloquear la 7B).
