# 02 — Bucle Núcleo y Eras

Define el latido del juego: cómo avanza el tiempo, cómo se crea un juego paso a paso, y cómo se
progresa a través de las eras desde el garaje hasta la megacorporación.

---

## 1. El tiempo `[DECIDIDO]`

- La unidad de tiempo es el **tick = 1 semana** de juego.
- El tiempo avanza en tiempo real pausable, con controles de velocidad (Pausa / x1 / x2 / x4).
- El jugador **puede y debe pausar** para tomar decisiones. El juego nunca fuerza una decisión
  importante sin pausa (coherente con "mayormente determinista y legible").
- 52 ticks = 1 año de juego. Las eras duran varios años (ver §5).

## 2. El bucle principal (visión detallada)

Cada proyecto atraviesa este ciclo. Es el corazón repetible del juego.

### Paso 1 — Concepción del proyecto
El jugador define:
- **Tema** (p. ej. Fantasía, Espacio, Zombis, Deportes, Vida...) — ver tabla en `09`.
- **Género** (RPG, Shooter, Estrategia, Aventura, Simulación, Casual...) — ver `09`.
- **Sub-género / mezcla** (opcional, desbloqueable): combinar dos géneros con pesos.
- **Plataforma(s)** objetivo (según las disponibles en la era actual).
- **Público objetivo** (Hardcore / Amplio / Casual / Infantil) — afecta al fit y a los segmentos.
- **Tamaño del proyecto** (Pequeño / Mediano / Grande / AAA) — escala tiempo, coste y potencial.
  Cada tamaño exige un **coste base fijo**, una **plantilla mínima** y una **etapa de escala mínima**
  (docs/17 E1): el AAA queda bloqueado hasta ser **Corporación**. Los tamaños no disponibles se
  muestran atenuados con su requisito. Ir a lo grande es una decisión con peso, no la opción por defecto.
- **Nombre del juego** (texto libre; se usa en portada procedural y en la comunidad).

El sistema muestra en tiempo real un **medidor de Fit** (ver `03`) que orienta sin dar la respuesta.

### Paso 2 — Planificación de equipo y presupuesto
- Asignar qué empleados trabajan en el proyecto (en fases tempranas, eres tú solo).
- Fijar presupuesto de desarrollo y, más adelante, de marketing.
- Elegir la **duración objetivo** (más tiempo = más calidad potencial, más coste y riesgo de perder la moda).

### Paso 3 — Desarrollo por fases
El desarrollo de cada juego se divide en **3 fases** internas. En cada fase el jugador reparte el
esfuerzo del equipo entre pares de aspectos (estilo *Game Dev Tycoon*, pero con lectura transparente):

| Fase | Aspectos que se equilibran | Peso típico |
|------|----------------------------|-------------|
| **Fase 1 — Concepto** | Motor / Jugabilidad / Historia | Diseño-heavy |
| **Fase 2 — Producción** | Diálogos / Nivel/Mundo / IA | Mixto |
| **Fase 3 — Pulido** | Gráficos / Sonido / Corrección de bugs (QA) | Técnica-heavy |

Durante las fases aparecen:
- **Decisiones de features** (`[DECIDIDO]`): eventos donde eliges añadir una característica
  (p. ej. "¿mundo abierto?", "¿modo online?"). Cada feature suma calidad potencial pero cuesta
  tiempo/dinero y puede generar bugs si el equipo no da abasto. Detalle en `03` y `09`.
- **Decisiones de foco** (los sliders/reparto de esfuerzo) que determinan el balance Diseño/Técnica.

**Ritmo del desarrollo** `[DECIDIDO · Fase 8.5]`: cada fase es un **hito con pausa**, no una pantalla
que se vigila. La **ventana de desarrollo** (modal, `10` §10.3) se abre al concebir y en **cada cambio
de fase**; ahí se decide el reparto de esa fase (y, en Concepto, las features). **"Continuar desarrollo"**
cierra la ventana y reanuda el tiempo a x1: el jugador ve trabajar a la **Oficina Viva** (`10` §5) hasta
el siguiente hito, cuando el reloj para solo y la ventana vuelve con la fase nueva. Al terminar Pulido el
juego se lanza y encadena con la gala de reseña. El bucle es: **decidir → mirar → decidir**, en vez de
una lista de controles siempre a la vista. El núcleo no cambia por esto: `advanceProjects` ya mueve las
fases y el store ya pausa en ellas (`08` §6).

### Paso 4 — Monetización y precio ◄ DILEMA MORAL
Antes de lanzar, el jugador decide el **modelo de negocio** y el **precio**. Aquí entran las palancas
de codicia/integridad (loot boxes, DLC day-one, pases, precio justo...). Ver `06`.

### Paso 5 — Marketing y campaña de creadores ◄ COMUNIDAD
Se construye hype mediante anuncios, ferias y — sobre todo en eras modernas — el reparto de claves a
creadores de contenido. Ver `07`.

### Paso 6 — Lanzamiento
El sistema calcula:
1. **Calidad real** (motor de `03`).
2. **Reseñas** por segmento (calidad modulada por expectativas/hype y modas — `04`, `07`).
3. **Ventas** iniciales y su curva en el tiempo (`04`, `06`).
4. **Ajuste de Reputación** por segmento (`06`, `07`).

### Paso 7 — Post-lanzamiento
Durante varias semanas tras el lanzamiento:
- Las ventas siguen una curva (pico inicial + cola larga según reputación y boca a boca).
- El jugador puede lanzar **parches** (corrigen bugs → recuperan reseña/comunidad, cuestan tiempo) o
  **DLC/expansiones** (nuevos ingresos; honestos o exprimidores según cómo se hagan — `06`).
- Pueden estallar **crisis** (bug viral, backlash por precio) que exigen gestión (`07`).

### Paso 8 — Reinversión y crecimiento
Con los ingresos, el jugador: contrata/forma personal, investiga nuevas tecnologías/géneros, mejora o
cambia de oficina, y abre nuevas líneas de negocio en eras avanzadas. Vuelta al Paso 1 con más escala.

## 3. Investigación y desbloqueos `[DECIDIDO]`

- Se acumulan **Puntos de Investigación (💡)** al desarrollar juegos y al asignar personal a I+D.
- Se gastan en un árbol de desbloqueos: nuevos géneros, combinaciones de género, features,
  motores propios, y capacidades de estudio (marketing avanzado, formación, etc.).
- Algunos desbloqueos están **gateados por era** (no puedes investigar "online multijugador masivo"
  en 1985).

### 3.1 Temas gateados por investigación (docs/17 P1) `[DECIDIDO · baseline v1]`

Empiezas con **2–3 temas libres** (baseline: fantasía, ciencia ficción, espacio) y **desbloqueas el
resto gastando 💡**. Pasar de era **no regala temas**: la era **habilita la opción** de investigarlos,
pero cuestan 💡 (más caros cuanto más tardía la era). Así la investigación pesa de verdad y decides
"en qué se especializa tu estudio". Todo data-driven: la lista de starters y el coste por era viven en
`data/balance.ts`; la era de cada tema, en `data/themes.ts`.

### 3.2 El conocimiento del mercado se gana (docs/17 P2) `[DECIDIDO · baseline v1]`

Las **pistas predictivas** —medidor de **Fit** (tema×género), **precio recomendado** y **balance
Diseño/Técnica ideal** del género— siguen la regla **"conoces lo que empiezas; descubres lo que
desbloqueas"**: las de tu contenido de partida (temas starter × géneros de E1, precio de juegos
pequeños) son visibles desde el inicio; las de lo que desbloqueas luego empiezan **ocultas** y se
revelan de dos formas: (a) **nodos globales de I+D** (Inteligencia de mercado) que revelan una faceta
para todo; (b) tras lanzar un juego, **"Investigar resultados"** (gasta 💡) aprende el atajo predictivo
de ESA combinación. Es transparencia con **Pilar 2** intacto: el **desglose de reseña** de tus propios
lanzamientos es **siempre legible** (ver `03`); solo se paga saberlo *antes*, nunca la explicación
*después*.

## 4. Progresión de escala (las 4 etapas de estudio) `[DECIDIDO]`

Transversal a las eras históricas, el estudio crece en escala. Cada etapa cambia *qué decisiones tomas*.

| Etapa | Tamaño | El jugador es... | Foco de decisiones |
|-------|--------|------------------|--------------------|
| **1. Garaje** | 1 persona (tú) | Creador | Haces el juego con tus manos; cada slider es tu esfuerzo. |
| **2. Estudio pequeño** | 2–8 | Líder de equipo | Contratas, asignas, gestionas moral; empiezas a delegar. |
| **3. Estudio consolidado** | 9–40 | Director | Múltiples equipos/proyectos en paralelo; estrategia de portfolio. |
| **4. Corporación** | 40+ / estudios | Magnate | Estrategia macro: franquicias, adquisiciones, plataformas, ética a escala. |

La transición entre etapas se desbloquea por hitos de **capital + plantilla** (los umbrales concretos,
en `data/balance.ts` → `staff.scale`; la tabla legible, en `16` §3.2) y es uno de los grandes momentos
de recompensa del juego. Desde la Fase 8.6 el jugador los ve: la **cronología de escala** (`10` §10.11)
enseña los requisitos de cada etapa leyéndolos de la misma fuente que los comprueba. La etapa también
**gatea el tamaño de proyecto**
(docs/17 E1): el AAA solo está al alcance de una **Corporación** (con su plantilla mínima), así la
escala del estudio importa de verdad a la hora de decidir qué juego construir.

## 5. Las Eras históricas `[DECIDIDO · baseline v1]`

Las eras dan el "de la nada a megacorporación" del Pilar 5. Cada era introduce nuevas plataformas,
géneros, tecnologías y — clave para la sátira — nuevos modelos de negocio. El paso de era es
automático por el avance del tiempo, con un evento de transición que resume qué cambia.

| Era | Periodo aprox. | Novedades de plataforma | Novedad de modelo de negocio |
|-----|----------------|-------------------------|------------------------------|
| **E1 — La chispa** | ~1980–1985 | Micro-ordenadores (tipo "PC casero", "Commo") | Venta de copias en cinta/disco |
| **E2 — Las consolas** | ~1985–1992 | 1ª gen de consolas ("Gameling", "Master V") | Cartuchos; licencias de plataforma |
| **E3 — El salto 3D** | ~1993–2000 | CD-ROM, consolas 32/64-bit ("Playsystem") | Presupuestos mayores; marketing masivo |
| **E4 — La red** | ~2001–2008 | Online, PC dominante, portátiles | Parches post-venta; primer DLC |
| **E5 — Digital y móvil** | ~2009–2015 | Tiendas digitales, smartphones, indies | Free-to-play, microtransacciones, app stores |
| **E6 — Servicios y streamers** | ~2016–2023 | Streaming, early access, cloud | Loot boxes, pases de batalla, games-as-a-service |
| **E7 — El futuro cercano** | ~2024+ | Realidad mixta, IA generativa, nubes | Modelos emergentes (satíricos/especulativos) |

Cada era también **mueve las modas** (ver `04`): géneros y temas que triunfan en E2 pueden estar
muertos en E5. Y cada era sube el "listón de calidad esperado" por el público (lo que era un 90 en
1985 sería un 50 en 2015).

## 6. Ritmo y duración de partida `[DECIDIDO]`

- Objetivo de diseño (cerrado): una partida completa (E1→E7) de **8–10 horas**.
- Un juego pequeño en el garaje: ~4–8 semanas de desarrollo. Un AAA en E6: ~2–3 años.
- El número de juegos por partida objetivo cerrado: **35–45**, para que cada lanzamiento importe pero haya
  variedad. A balancear con datos de playtest.

## 7. Criterios de aceptación de este sistema (para Claude Code)

- [ ] El tiempo avanza por ticks semanales con controles de velocidad y pausa.
- [ ] Un juego se puede concebir eligiendo tema/género/plataforma/público/tamaño/nombre.
- [ ] El desarrollo pasa por 3 fases con reparto de esfuerzo y decisiones de features.
- [ ] Al lanzar, se calculan calidad, reseñas, ventas y ajuste de reputación (vía sistemas 03/04/06/07).
- [ ] Existe post-lanzamiento con parches y DLC.
- [ ] El estudio progresa por las 4 etapas de escala y por las 7 eras, con eventos de transición.
- [ ] La bancarrota sostenida produce game over; existe cálculo de Puntuación de Legado al final.
