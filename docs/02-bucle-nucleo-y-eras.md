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
- **Plataforma(s)** objetivo (según las disponibles en la era actual). Desde la Fase 9.2 pueden ser
  **varias a la vez** si el motor tiene kit bi/multiplataforma (cada una paga su licencia; la demanda
  de ventas suma sus bases instaladas).
- **Motor** (Fase 9.2, docs/19 §9.2): uno **propio** del taller, uno **licenciado** del catálogo
  (moderno ya, pero con **royalty** sobre las ventas) o **código artesanal** (nivel 0, lo único que
  hay en 1980). Su **adecuación al proyecto es SIEMPRE visible** (es tu taller, no conocimiento de
  mercado) y es el término tecnológico del techo de calidad (`03` §3.1).
- **Público objetivo** (Hardcore / Amplio / Casual / Infantil) — afecta al fit y a los segmentos.
- **Tamaño del proyecto** (Pequeño / Mediano / Grande / **Muy grande** / AAA, 5 desde docs/18 V4) —
  escala tiempo, coste y potencial. Cada tamaño exige un **coste base fijo**, una **plantilla mínima**
  y una **etapa de escala mínima** (docs/17 E1 + docs/18 V4-b): el Muy grande pide un Estudio grande;
  el AAA queda bloqueado hasta ser **Corporación** con una organización de 40. Los tamaños no
  disponibles se muestran atenuados con su requisito. Ir a lo grande es una decisión con peso, no la
  opción por defecto.
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
Diseño/Técnica ideal** del género— **empiezan TODAS ocultas**. Nada se regala: el estudio novato de
1980 no sabe qué combina con qué, cuánto vale un juego ni qué pide cada género. El arranque es
deliberadamente a ciegas y el conocimiento se **gana** de dos formas:

- **Nodos globales de I+D** (rama *Inteligencia de mercado*): revelan una faceta para todo y para
  siempre. Compiten en 💡 con motores/QA: saber es una inversión con coste de oportunidad.
- **"Investigar resultados"** de un juego ya lanzado (gasta 💡): aprende el atajo predictivo de ESA
  combinación (su Fit y el balance ideal de su género). Es la vía orgánica: aprendes de lo que haces.

Aun con la pista oculta **siempre puedes concebir y lanzar**: nada se bloquea. Y el **Pilar 2** queda
intacto: el **desglose de reseña** de tus propios lanzamientos es **siempre legible** (ver `03`). Solo
se paga saberlo *antes*, nunca la explicación *después* — así descubrir el mapa del mercado es la
recompensa del Pilar 5, no un muro.

### 3.3 Motores: construir, licenciar, envejecer (Fase 9.2, docs/19 §9.2) `[DECIDIDO · baseline v1]`

El motor es **el gran gate tecnológico** y una escasez permanente. Dos vías, en tensión constante:

- **Construir motor propio** en el taller (pantalla de I+D): cuesta **💰 + 💡 + semanas de
  calendario** (una obra a la vez, pagada por adelantado; el tick la avanza). Qué **generación**
  puedes construir lo gatean los nodos de *Arquitectura de motores I/II/III* (gen ≤ 3/5/7) y la
  propia era (nunca por delante de su número). Las **capacidades** (Gráficos 3D, Físicas, Online,
  kits bi/multiplataforma) se investigan aparte y se pagan como extras de la obra. El motor propio es
  un **activo**: sin royalty, reutilizable entre juegos (amortiza) y con herramientas que hacen
  cundir al equipo (`devOutputByGeneration`; no acorta el calendario — §6.1).
- **Licenciar** uno de terceros (catálogo desde E3: RayTech, Irreal, Unify…): **moderno YA**, sin
  obra ni I+D, pero con **cuota por juego** al concebir y **royalty (7–12 %) sobre los ingresos
  brutos, para siempre** — y sin activo propio que amortizar. El puente clásico cuando tu motor se
  quedó viejo y la obra nueva no llega.

**Los motores envejecen** sin mecánica extra: su nivel es fijo y la exigencia de la era sube
(`03` §3.1). Mejorar el motor propio cuesta el **60 %** de construir de cero: el sumidero recurrente
de la fase — cada era toca pasar por caja. Todo data-driven: capacidades y catálogo en
`data/engines.ts`; niveles, costes y demanda en `balance.engines` y `balance.quality.ceiling.engine`.

## 4. Progresión de escala (las 5 etapas de estudio) `[DECIDIDO · rediseñado en docs/18 V4]`

Transversal a las eras históricas, el estudio crece en escala. Cada etapa cambia *qué decisiones tomas*.

| Etapa | Aforo | Proyectos a la vez | El jugador es... | Foco de decisiones |
|-------|:---:|:---:|------------------|--------------------|
| **1. Garaje** | 1 (tú) | 1 | Creador | Haces el juego con tus manos; cada slider es tu esfuerzo. |
| **2. Estudio pequeño** | 4 | 1 | Líder de equipo | Contratas, asignas, gestionas moral; empiezas a delegar. |
| **3. Estudio** | 10 | 2 | Director | Dos equipos en paralelo; estrategia de portfolio. |
| **4. Estudio grande** | 25 | 4 | Ejecutivo | Varios proyectos grandes a la vez; gestión por políticas. |
| **5. Corporación** | 100 | 8 | Magnate | Estrategia macro: franquicias, plataformas, ética a escala. |

**El avance SE COMPRA (docs/18 V4-c).** Cumplir el hito de **capital + plantilla** solo **habilita**
la ampliación; hay que **pagarla** con un desembolso desde la **cronología de escala** (`10` §10.11),
con el botón "Ampliar estudio (coste: X 💰)". Los umbrales están escalonados para que Corporación
aterrice hacia **E5–E6** (verificado con los bots de `08` §8). Requisitos y costes viven en
`data/balance.ts` → `staff.scale` (`requirementsByStage`, `upgradeCostByStage`); la cronología los
enseña leyéndolos de la misma fuente que valida la compra (`expandStudio`), y la tabla legible está
en `16` §3.2.

**Cada etapa quema más (docs/18 V4-d).** El overhead fijo semanal (alquiler/infraestructura,
`economy.upkeepExtraByStage`) sube considerablemente por etapa: una Corporación quema ~1,5M 💰/año
solo en infraestructura, antes de nóminas. Un estudio grande fabricando AAAs no es riesgo cero:
para sostenerlo hay que seguir sacando éxitos — no existe el "punto dulce" invencible.

La etapa también **gatea el tamaño de proyecto** (docs/17 E1 + docs/18 V4-b): el Muy grande pide un
Estudio grande; el AAA solo está al alcance de una **Corporación** con 40 en plantilla. Así la escala
del estudio importa de verdad a la hora de decidir qué juego construir.

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

### 6.1 El calendario no se compra con plantilla `[DECIDIDO · baseline v1]`

**1 tick = 1 semana, siempre.** La duración de un juego la fija **solo su tamaño** (pequeño 6 ·
mediano 18 · grande 42 · muy grande 72 · AAA 120 semanas de calendario,
`balance.development.phaseWeeksBySize`).
Meter más gente **no acorta el plazo**: lo que hace la capacidad del equipo (personas + motores
propios, menos el burnout) es decidir **cómo de bien se ejecuta dentro de ese plazo**.

**La única excepción es el crunch** (`balance.staff.crunch.weeksPerTick`, baseline 2): dobles turnos
sacan **2 semanas de trabajo por semana real**, así que el juego sale en la mitad de tiempo. Es
deliberado que sea la única vía de comprimir el plazo, porque es una decisión **explícita, acotada y
que se paga**: todo lo que se acumula por semana escala igual (el **doble de deuda de bugs**), más el
desgaste de moral, energía y lealtad — y el crunch sostenido lleva al **burnout**, que hunde la
ejecución. Es la palanca de codicia de `05`/`06` hecha tiempo: *sales antes, pero peor y quemando a
la gente*. La plantilla, en cambio, nunca compra calendario.

Se modela con la **dotación relativa**: `crewRatio = capacidad / plantilla esperada del tamaño`
(la esperada es el `minStaff` del gate de tamaño, docs/17 E1 + docs/18 V4-b: 1/3/8/15/40). Con la plantilla justa vale
1 y el QA rinde al ritmo nominal; ir corto deja el juego a medio cocer (menos QA y más bugs por falta
de manos); ir sobrado ayuda solo hasta `maxCrewRatio` (rendimientos decrecientes — ley de Brooks:
siete personas no hacen un juego pequeño en una semana). Para crecer de verdad no se amontona gente
en un proyecto: se abren **proyectos en paralelo** (§4).
- El número de juegos por partida objetivo cerrado: **35–45**, para que cada lanzamiento importe pero haya
  variedad. A balancear con datos de playtest.

## 7. Criterios de aceptación de este sistema (para Claude Code)

- [ ] El tiempo avanza por ticks semanales con controles de velocidad y pausa.
- [ ] Un juego se puede concebir eligiendo tema/género/plataforma/público/tamaño/nombre.
- [ ] El desarrollo pasa por 3 fases con reparto de esfuerzo y decisiones de features.
- [ ] Al lanzar, se calculan calidad, reseñas, ventas y ajuste de reputación (vía sistemas 03/04/06/07).
- [ ] Existe post-lanzamiento con parches y DLC.
- [ ] El estudio progresa por las 5 etapas de escala (comprando cada ampliación) y por las 7 eras,
      con eventos de transición.
- [ ] La bancarrota sostenida produce game over; existe cálculo de Puntuación de Legado al final.
