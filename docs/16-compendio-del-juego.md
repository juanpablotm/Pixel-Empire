# 16 — Compendio del Juego (todo sobre Pixel Empire)

Documento maestro que reúne **todo el contenido y la progresión** del juego en un solo lugar,
sintetizado de los docs `00`–`14`. Sirve de referencia rápida para diseño, balance y desarrollo.

> **Nota:** todas las cifras son **baseline v1** (ver `12`), ajustables en playtest sin cambiar el
> diseño. Donde una lista era "semilla" en `09`, aquí se describe completa; ampliar contenido es
> trabajo de datos, no de diseño. Cada apartado indica el documento que lo detalla a fondo.

---

## 1. El juego en una página

Diriges un estudio de videojuegos desde un garaje en 1980 hasta una megacorporación en un futuro
cercano. Creas juegos eligiendo **tema + género + plataforma + público**, repartes el esfuerzo del
equipo, decides **precio y monetización**, haces **marketing** con creadores de contenido, y lanzas.
El mercado (modas, hype, saturación) convierte tu **calidad** en reseñas y ventas; la **comunidad** te
ensalza o te destroza. El eje que lo atraviesa todo es el **Dilema Moral: Reputación ↔ Capital** — no
puedes maximizar ambos, y ninguna filosofía (indie de culto, fábrica AAA, equilibrado) es "la
correcta". Detalle: `00`, `01`.

Recursos que gestionas: **Capital 💰**, **Reputación ⭐** (vector por público), **Tiempo 🗓️** (semanas),
**Equipo 👥**, **Conocimiento 💡** (investigación), **Hype 📣**.

---

## 2. Los sistemas (cómo funcionan)

| Sistema | Qué hace | Doc |
|---------|----------|-----|
| **Bucle y eras** | Crear un juego (3 fases), avance por ticks (1 tick = 1 semana), progresión por eras y escala | `02` |
| **Calidad transparente** | Calcula la calidad real `Q` (0–100) y **descompone la reseña** para que aprendas por qué | `03` |
| **Mercado y modas** | Popularidad de géneros/temas que sube y baja, hype, saturación, ciclos de plataformas → ventas y reseñas | `04` |
| **Personal y equipo** | Empleados con rasgos, moral, energía, química; contratar, formar, crunch, despedir | `05` |
| **Dilema moral y economía** | Palancas codicia/integridad, reputación segmentada, escándalos, economía completa | `06` |
| **Comunidad y streamers** | Sentimiento de comunidad, creadores de contenido, hype/leaks, review bombing, gestión de crisis | `07` |

**Cómo crear un juego (el bucle):** (1) concepción (tema/género/plataforma/público/tamaño/nombre) con
medidor de Fit → (2) equipo y presupuesto → (3) desarrollo en 3 fases con reparto de esfuerzo y
decisiones de features → (4) monetización y precio ◄ dilema moral → (5) marketing y creadores ◄
comunidad → (6) lanzamiento (calidad → reseñas por segmento → ventas) → (7) post-lanzamiento (parches,
DLC, crisis) → (8) reinversión (contratar, investigar, crecer). Detalle: `02` §2.

**Calidad `Q` (factores):** Fit (encaje tema/género/plataforma/público) · Balance Diseño/Técnica ·
Features/Alcance · Pulido/Bugs · Multiplicador de Equipo, con un pequeño modificador por Innovación.
Pesos baseline: `wF=0.30, wB=0.25, wC=0.20, wD=0.25`; `innovationMod` 0.9–1.15; `teamFactor` 0.5–1.3.
Detalle: `03`.

---

## 3. La progresión (eras, años, escala y ritmo)

El núcleo de "de la nada a megacorporación". Hay **dos ejes de progreso** que avanzan casi en paralelo:
las **eras históricas** (el mundo cambia) y las **etapas de escala** (tu estudio crece).

### 3.1 Línea temporal de eras `[baseline v1]` (doc `02` §5)

El paso de era es **automático por el avance del tiempo**, con un evento de transición. Cada era sube
el "listón de calidad" esperado y desbloquea plataformas, géneros, features y modelos de negocio.

| Era | Nombre | Años (juego) | Novedad de plataforma | Novedad de negocio |
|-----|--------|--------------|-----------------------|--------------------|
| **E1** | La chispa | ~1980–1985 | Micro-ordenadores (PC casero, Commo 64) | Venta de copias (cinta/disco) |
| **E2** | Las consolas | ~1985–1992 | 1ª gen de consolas (Gameling, Master V) | Cartuchos; licencias de plataforma |
| **E3** | El salto 3D | ~1993–2000 | CD-ROM, consolas 32/64-bit (Playsystem, N-Cube) | Presupuestos mayores; marketing masivo |
| **E4** | La red | ~2001–2008 | Online, PC dominante, portátiles (Playsystem 2) | Parches post-venta; primer DLC |
| **E5** | Digital y móvil | ~2009–2015 | Tiendas digitales, smartphones, indies | Free-to-play, microtransacciones |
| **E6** | Servicios y streamers | ~2016–2023 | Streaming, early access, cloud | Loot boxes, pases de batalla, games-as-a-service |
| **E7** | El futuro cercano | ~2024+ | Realidad mixta, IA generativa, nubes | Modelos emergentes (satíricos) |

### 3.2 Etapas de escala del estudio `[baseline v1 · rediseñado en Fase 8.8]` (doc `02` §4, doc `18` V4)

Transversal a las eras. Cada etapa cambia *qué decisiones tomas*. Desde la Fase 8.8 son **5 etapas**
y el avance **SE COMPRA**: cumplir el requisito (capital + plantilla) solo **habilita** el botón
"Ampliar estudio" de la cronología de escala; la ampliación se paga.

| Etapa | Aforo | Eres... | Requisito (habilita) | Coste de ampliar | Overhead/sem | Proyectos a la vez |
|-------|:---:|---------|----------------------|:---:|:---:|:---:|
| **1. Garaje** | 1 (tú) | Creador | Inicio de la partida | — | +0 | 1 |
| **2. Estudio pequeño** | 4 | Líder de equipo | 25k 💰 | 10k 💰 | +300 | 1 |
| **3. Estudio** | 10 | Director | 200k 💰 + 4 en plantilla | 100k 💰 | +1.500 | 2 |
| **4. Estudio grande** | 25 | Ejecutivo | 1,5M 💰 + 8 en plantilla | 750k 💰 | +7.000 | 4 |
| **5. Corporación** | 100 | Magnate | 8M 💰 + 20 en plantilla | 4M 💰 | +30.000 | 8 |

Umbrales, costes y aforos **viven en `data/balance.ts`** (`staff.scale`, `economy.upkeepExtraByStage`)
y son los que valida `expandStudio`; la **cronología de escala** (docs/10 §10.11) los lee de ahí, así
que lo que se enseña es lo que se aplica. El **overhead creciente** (docs/18 V4-d) mata el "punto
dulce": una Corporación quema ~1,5M 💰/año solo en infraestructura — sostenerla exige seguir sacando
éxitos. Los umbrales están escalonados para que Corporación aterrice hacia **E5–E6** (verificado con
los bots de docs/08 §8: la fábrica AAA la compra en E6).

### 3.3 Investigación y desbloqueos (doc `02` §3)

Acumulas **Puntos de Investigación 💡** al desarrollar juegos y al asignar personal a I+D (~1 por
persona·semana). Se gastan en un árbol que desbloquea nuevos géneros, combinaciones, features,
motores propios y capacidades de estudio (marketing avanzado, formación). Muchos desbloqueos están
**gateados por era** (no puedes investigar "online masivo" en 1985).

**Progresión del conocimiento (docs `17` P1/P2).** La investigación pesa aún más desde la Fase 8.4:
- **Temas gateados:** empiezas con **2–3 temas libres** (fantasía, ciencia ficción, espacio) y
  **desbloqueas el resto con 💡**. Pasar de era **no regala temas**: los **habilita** para investigarlos
  (coste creciente por era). Decides en qué se especializa tu estudio.
- **Conocimiento de mercado que se gana:** las **pistas predictivas** (medidor de Fit, precio
  recomendado, balance ideal del género) **empiezan TODAS ocultas** — empiezas a ciegas, y el mapa del
  mercado se conquista. Se revelan con **nodos globales** de Inteligencia de mercado o con **"Investigar
  resultados"** de un lanzamiento (aprende ese combo). Nunca bloquean: siempre puedes lanzar. Y el
  **desglose de reseña siempre es legible** (Pilar 2): solo se paga saberlo *antes*, no la explicación
  *después*.

### 3.4 Ritmo objetivo `[baseline v1]` (doc `02` §6)

- Partida completa E1→E7: **8–10 horas**; **35–45 juegos** en total.
- Juego pequeño de garaje: **6 semanas**. Mediano 18 · grande 42 · muy grande 72 · **AAA 120**
  (~2,3 años). La duración la fija **solo el tamaño**: **1 tick = 1 semana** y meter más gente
  **no acorta el plazo** — la capacidad del equipo (personas, motores) decide cómo de **bien** se
  ejecuta dentro de él, con rendimientos decrecientes (docs `02` §6.1). Para producir más, proyectos
  en paralelo.
- **El crunch es la única forma de comprimir el plazo:** dobles turnos = 2 semanas de trabajo por
  semana real, así que el juego sale en **la mitad de tiempo**… con el **doble de deuda de bugs**,
  moral/energía/lealtad por los suelos y el burnout esperando. La palanca de codicia hecha tiempo.
- Reparto orientativo (las eras tempranas van más rápidas; las tardías, más lentas por proyectos grandes):

| Tramo | % de la partida | Juegos aprox. | Etapa de escala típica |
|-------|-----------------|---------------|------------------------|
| E1–E2 | ~25% | 10–14 | Garaje → Estudio pequeño |
| E3–E4 | ~35% | 12–16 | Estudio → Estudio grande |
| E5–E6 | ~30% | 8–12 | Estudio grande → Corporación |
| E7 | ~10% | 3–5 | Corporación |

---

## 4. Catálogo: Géneros `[baseline v1]` (doc `09` §2)

Cada género tiene un **balance ideal Diseño/Técnica** (para la calidad, `03`) y una era de aparición.

| Género | Diseño | Técnica | Aparece | Notas |
|--------|:---:|:---:|:---:|-------|
| Aventura | 0.70 | 0.30 | E1 | Narrativa; premia Diseño e Historia |
| RPG | 0.65 | 0.35 | E1 | Profundo; el favorito de los Hardcore |
| Gestión/Tycoon | 0.65 | 0.35 | E2 | Sistemas y economía |
| Puzzle/Casual | 0.60 | 0.40 | E1 | Accesible; brilla en portátil/móvil |
| Terror | 0.60 | 0.40 | E3 | Ambiente y tensión |
| Estrategia | 0.55 | 0.45 | E1 | IA y equilibrio |
| Plataformas | 0.55 | 0.45 | E1 | "Feel" de control |
| Sandbox | 0.55 | 0.45 | E4 | Libertad y sistemas emergentes |
| Ritmo | 0.50 | 0.50 | E3 | Depende mucho del Audio |
| Simulación | 0.50 | 0.50 | E2 | Realismo y sistemas |
| Battle Royale | 0.45 | 0.55 | E6 | Online masivo; de moda tardía |
| Shooter | 0.40 | 0.60 | E2 | Técnica/rendimiento |
| Deportes | 0.40 | 0.60 | E2 | Físicas e IA; ideal para franquicias anuales |
| Carreras | 0.35 | 0.65 | E2 | Gráficos y físicas |

Se pueden **mezclar dos géneros** (desbloqueable) con pesos. La afinidad tema×género (Fit) se define en
`data/affinity.ts` (matriz `MuyBueno=1.0 / Bueno=0.75 / Neutro=0.5 / Malo=0.25`).

---

## 5. Catálogo: Temas `[baseline v1]` (doc `09` §3)

Cada tema tiene su curva de popularidad (modas, `04`). Algunos aparecen en eras posteriores. **Solo
fantasía, ciencia ficción y espacio son libres al empezar**; el resto se **desbloquea con 💡** una vez
su era ha llegado (docs `17` P1). La era habilita la opción; el tema cuesta 💡 igualmente.

| Tema | Aparece | Afinidad típica |
|------|:---:|-----------------|
| Fantasía | E1 | Excelente con RPG y Aventura |
| Ciencia ficción | E1 | Amplia; buena con Shooter y Estrategia |
| Espacio | E1 | Estrategia, Simulación, Shooter |
| Medieval | E1 | RPG, Estrategia |
| Militar | E2 | Shooter y Estrategia (muy bueno); mal con Casual |
| Deportes | E2 | Con el género Deportes/Carreras |
| Vida/Cotidiano | E2 | Casual y Simulación (excelente) |
| Piratas | E2 | Aventura, Acción |
| Superhéroes | E2 | Acción, Aventura |
| Crimen | E3 | Aventura, Sandbox, Shooter |
| Terror sobrenatural | E3 | Con el género Terror |
| Zombis | E3 | Shooter, Terror, Supervivencia |
| Cyberpunk | E3 | RPG, Shooter, Sandbox |
| Post-apocalíptico | E3 | RPG, Shooter, Sandbox |
| Historia/Épica | E1 | Estrategia, RPG |

---

## 6. Catálogo: Plataformas / Consolas `[baseline v1]` (doc `09` §4)

Nombres **ficticios reconocibles**. Cada una tiene un ciclo de vida (nace → crece → madura → declina →
descatalogada) que fija su base instalada y su tamaño de mercado (`04`). Algunas exigen **licencia/dev-kit**
(10k–100k 💰) e investigación.

| Plataforma | Era | Tipo | Fabricante (ficticio) | Nota |
|------------|:---:|------|-----------------------|------|
| PC Casero | E1 | Ordenador | (abierto) | Sin licencia; público amplio |
| Commo 64 | E1 | Micro-ordenador | Commodere | Base instalada enorme en E1 |
| Gameling | E2 | Portátil | Ninteno | Favorece Casual/Puzzle; monocromo |
| Master V | E2 | Consola sobremesa | Sega-like "Vega" | Cartuchos; guerra de consolas E2 |
| Playsystem | E3 | Consola 32-bit (CD) | Suny | El gran salto 3D |
| N-Cube | E3 | Consola 64-bit | Ninteno | Cartucho; familiar |
| PC (online) | E4 | Ordenador | (abierto) | Dominante; habilita online |
| Playsystem 2 | E4 | Consola | Suny | Base instalada récord |
| Portátil Advance | E4 | Portátil | Ninteno | Relevo del Gameling |
| Smartphone | E5 | Móvil | (varios) | Habilita F2P y microtransacciones |
| Tienda digital (PC) | E5 | Distribución | "Vapor" | Impulsa el boom indie |
| Cloud / Streaming | E6 | Servicio | (varios) | Games-as-a-service |
| Realidad mixta | E7 | RV/AR | (varios) | Nicho de alto valor |

(Se pueden añadir más por era como datos; la lógica es agnóstica.)

---

## 7. Catálogo: Features `[baseline v1]` (doc `09` §5)

Cada feature suma **calidad potencial** pero cuesta tiempo y puede generar bugs. Meter demasiadas para
el tamaño del proyecto tiene rendimientos decrecientes y dispara los bugs.

| Feature | Desde | Aporta | Riesgo | A quién encanta |
|---------|:---:|--------|--------|-----------------|
| Multijugador local | E2 | Medio | Bajo | Casual/Amplio |
| Final ramificado | E1 | Alto (narrativa) | Medio | Hardcore/Crítica |
| Físicas avanzadas | E3 | Alto | Alto | Hardcore |
| Sistema de crafteo | E3 | Medio-alto | Medio | Hardcore |
| Mundo abierto | E3 | Muy alto | Muy alto | Amplio/Hardcore |
| Multijugador online | E4 | Muy alto | Muy alto | Amplio |
| Modo foto | E6 | Bajo (marketing) | Muy bajo | Comunidad |
| Cross-play | E6 | Medio | Alto | Comunidad/Amplio |

---

## 8. Catálogo: Rasgos de personal `[baseline v1]` (docs `05`, `09` §6)

Cada empleado tiene 1–3 rasgos que dan carácter y decisiones interesantes.

| Rasgo | Efecto |
|-------|--------|
| **Perfeccionista** | +Calidad/pulido, −Velocidad; el crunch le hunde la moral |
| **Rápido pero descuidado** | +Velocidad, +Riesgo de bugs |
| **Visionario** | +Innovación; brilla en proyectos originales, se aburre clonando |
| **Estrella mediática** | Su nombre genera Hype extra; salario alto y ego |
| **Mentor** | Acelera el crecimiento de los juniors cercanos |
| **Llanero solitario** | +Rinde solo, −Sinergia en equipos grandes |
| **Sensible al crunch** | El crunch le afecta el doble |
| **Workaholic** | Tolera mejor el crunch... hasta que colapsa de golpe |
| **Generalista** | Equilibrado en todas las skills, sin picos |
| **Especialista-obsesivo** | Pico enorme en su especialidad, flojo en el resto |

Química de equipo (baseline): `sinergiaFactor = clamp(1 + Σ_pares (0.03·afín − 0.04·conflicto), 0.8, 1.2)`.
Especialidades: Diseño, Técnica, Arte, Audio, Marketing. Salarios baseline: junior 300 / senior 800 /
estrella 2.000 💰 por semana.

---

## 9. Catálogo: Creadores de contenido `[baseline v1]` (docs `07`, `09` §8)

Sustituyen "comprar anuncios". Repartes **claves de acceso** (recurso limitado por lanzamiento). El
resultado = Fit(juego, público del creador) × Calidad × estado de Bugs. En **E1–E3** los "creadores"
son **revistas y prensa especializada**; los streamers llegan en **E5–E6**.

| Arquetipo | Audiencia | Le encanta | Peligro |
|-----------|-----------|------------|---------|
| **Variedades masivo** | Enorme, casual | Juegos accesibles y vistosos | Se aburre con lo hardcore/lento en directo |
| **Competitivo hardcore** | Media, hardcore | Profundidad, balance, skill | Destroza el pay-to-win y los bugs |
| **VTuber** | Grande, fiel | Juegos con carisma/reacciones | Muy sensible a la afinidad de tono |
| **Crítico de culto** | Pequeña, influyente en Crítica | Arte, innovación, narrativa | Implacable con lo genérico |
| **Influencer casual** | Grande, superficial | La tendencia del momento | Volátil: hoy te ama, mañana te olvida |

Un **bug en directo** (bugLevel alto) puede volverse viral negativo y disparar review bombing.

---

## 10. Monetización y palancas morales `[baseline v1]` (doc `06`)

Modelos: `premium` (1.0×), `premium+dlc` (~1.15×), `premium+mtx` (~1.0 + 0.6·agresividad),
`f2p` (~0.3× en ventas base + microtransacciones sobre base instalada).

**Palancas de CODICIA (💰↑ / ⭐↓):** monetización agresiva (loot boxes, pases, pay-to-win), DLC day-one,
secuela-refrito apresurada, crunch, marketing engañoso, precio abusivo.
**Palancas de INTEGRIDAD (⭐↑ / 💰↓ o más lento):** precio justo, juego completo y pulido, DLC honesto,
cuidar al equipo, innovar, transparencia con la comunidad.

La codicia acumula **"deuda de reputación" oculta** que escala la probabilidad de **escándalos** →
review bombing, caída de ventas, fuga de talento, y a veces **regulación** (p. ej. prohibición de loot
boxes en E6/E7 que invalida ese modelo).

---

## 11. Segmentos de público (reputación) `[baseline v1]` (doc `06`)

La reputación es un **vector**, no un número. Cada decisión mueve segmentos distintos.

| Segmento | Valora | Le enfurece |
|----------|--------|-------------|
| **Crítica** | Innovación, pulido, ambición | Refritos, bugs, mediocridad |
| **Hardcore** | Profundidad, respeto al jugador | Monetización agresiva, simplificar |
| **Casual** | Accesibilidad, diversión, precio bajo | Dificultad/complejidad excesivas |
| **Prensa/Industria** | Relevancia, exclusivas, hype | Silencio, escándalos mal gestionados |
| **Comunidad** | Sentir que los escuchas | Promesas rotas, cambios abusivos |
| **Empleador** (talento) | Buen trato, proyectos con alma | Crunch, despidos, explotación |

---

## 12. Economía (cifras base) `[baseline v1]` (doc `12`)

| Concepto | Valor base |
|----------|------------|
| Capital inicial (garaje) | 10.000 💰 |
| Precio por juego | 20–60 💰 según tamaño/era |
| Coste base por tamaño | 500 / 2.000 / 8.000 / 60.000 / 250.000 💰 (Pequeño/Mediano/Grande/Muy grande/AAA), fijo al iniciar |
| Requisito por tamaño | plantilla mín. 1 / 3 / 8 / 15 / 40 · etapa mín. Garaje / E. pequeño / Estudio / E. grande / **Corporación** (AAA) |
| Ampliar el estudio (docs/18 V4-c) | coste 10k / 100k / 750k / 4M 💰 a etapa 2/3/4/5; requiere 25k / 200k+4 / 1,5M+8 / 8M+20 (capital+plantilla) |
| Overhead semanal por etapa (docs/18 V4-d) | +0 / +300 / +1.500 / +7.000 / +30.000 💰 sobre el fijo base |
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| Marketing escalonado | 2k / 10k / 40k / 120k 💰 (Nota de prensa → Anuncios → Feria/Expo → Campaña masiva) |
| Licencia de plataforma | 10k–100k 💰 según generación |
| Punto de I+D | ~1 por persona·semana en investigación |
| Préstamos | hasta ~6 meses de costes fijos; interés ~1%/semana |

El **tamaño** es una decisión con peso: coste base fijo + plantilla y etapa mínimas (el AAA solo como
Corporación de 40+). La **escala también**: cada ampliación se compra y encarece la semana — un estudio
grande sin éxitos se desangra. Bancarrota sostenida (sin poder pagar salarios) = **game over**.

---

## 13. Eventos, crisis y modas (docs `04`, `06`, `07`)

- **Modas:** géneros/temas suben y bajan (naciendo → pico → declive → muerto); el panel de tendencias
  muestra la dirección (↑→↓). Saturar un género con secuelas erosiona sus ventas.
- **Eventos de mercado:** ferias/expos (ventana de hype), boom indie, recesión, nacimiento de una moda,
  cambio regulatorio.
- **Hype y leaks:** el hype sube ventas iniciales pero endurece la reseña; un leak de alpha es un dilema
  (disculparse vs capitalizar). El manómetro marca **zona segura vs zona de riesgo**: pasar de la zona
  roja con un juego que no cumple hunde la **cola de ventas** y la reputación (hardcore/comunidad),
  proporcional a la brecha hype↔calidad. El marketing es **escalonado** (caro pero efectivo), con ROI
  positivo y rendimientos decrecientes salvo que caigas en el sobre-hype.
- **Crisis:** parche malo, subida de precio, bug viral, escándalo. Se gestionan con un evento con
  **reloj** y respuestas que mueven los segmentos; la reputación previa amortigua o amplifica.

---

## 14. Reconocimiento y cierre de partida (doc `06`)

- **Premios anuales** (tipo Game Awards): dan Reputación (Crítica/Prensa), hype y atractivo de contratación.
- **Puntuación de Legado** al final (o al retirarse), multi-dimensional: **Riqueza · Prestigio · Impacto
  (géneros que definiste) · Obras maestras (juegos 90+) · Ética (trato al equipo y honestidad)**.
  No hay victoria única: cada filosofía maximiza ejes distintos y cuenta una historia distinta.

---

## 15. Dónde se detalla cada cosa

| Tema | Doc |
|------|-----|
| Visión, pilares, objetivos medibles | `00` |
| Mapa de sistemas (GDD) | `01` |
| Bucle, eras, escala, investigación, ritmo | `02` |
| Fórmula de calidad y reseñas | `03` |
| Mercado, modas, plataformas | `04` |
| Personal, rasgos, química | `05` |
| Dilema moral, economía, escándalos, legado | `06` |
| Comunidad, creadores, crisis | `07` |
| Arquitectura técnica | `08` |
| Esquemas de datos y tablas | `09` |
| UI, animación, sonido | `10` |
| Roadmap de construcción | `11` |
| Decisiones cerradas (cifras) | `12` |
| Plan visual Fase 7 | `13` |
| Upgrade isométrico (opcional/futuro) | `14` |
| Checklist de playtest | `15` |
