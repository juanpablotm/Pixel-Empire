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
| **Mercado y fiebres** | Popularidad base plana (nadie domina) + **fiebres** cortas que la rompen, hype, saturación, ciclos de plataformas → ventas y reseñas | `04` |
| **Personal y equipo** | Empleados con rasgos, moral, energía, química; contratar, formar, crunch, despedir | `05` |
| **Dilema moral y economía** | Palancas codicia/integridad, reputación segmentada, escándalos, economía completa | `06` |
| **Comunidad y streamers** | Sentimiento de comunidad, creadores de contenido, hype/leaks, review bombing, gestión de crisis | `07` |
| **Estudios rivales (9.5)** | Industria simulada: 12 estudios con tier y perfil que lanzan (saturan, encienden fiebres), disputan ventanas, cazan talento y son los nominados reales de la gala | `04` §9, docs/19 §9.5 |
| **Publishers + Early Access (9.6)** | El arco del negocio: contratos leoninos que financian el arranque (adelanto + distribución a cambio del 55–75 % y a veces la IP) hasta que reúnes capital para auto-publicarte; y el acceso anticipado (E5+) como autofinanciación con reloj de paciencia | `06` §4.1, `07` §4.1, docs/19 §9.6 |
| **GaaS + adquisiciones (9.7)** | El late-game de macro-gestión: operar juegos como SERVICIOS en vivo (ingreso continuo a cambio de equipo en exclusiva + servidores; descuidarlo desangra, exprimirlo estalla) y comprar rivales que pasan a ser FILIALES autónomas con directiva (exprimir/autónomo/invertir) | `06` §4.2, `07` §4.2, docs/19 §9.7 |

**Cómo crear un juego (el bucle):** (1) concepción (tema/género/plataforma/público/tamaño/nombre) con
medidor de Fit → (2) equipo y presupuesto → (3) desarrollo en 3 fases con reparto de esfuerzo y
decisiones de features (con **encaje por género** y variantes de trade-off, 9.3) → (4) monetización
y precio ◄ dilema moral → (5) marketing y creadores ◄
comunidad → (6) lanzamiento (calidad → reseñas por segmento → ventas) → (7) post-lanzamiento (parches,
DLC, crisis) → (8) reinversión (contratar, investigar, crecer). Detalle: `02` §2.

**Calidad `Q` (factores):** Fit (encaje tema/género/plataforma/público) · Balance Diseño/Técnica ·
Features/Alcance · Pulido/Bugs · Multiplicador de Equipo, con un pequeño modificador por Innovación.
Pesos baseline: `wF=0.30, wB=0.25, wC=0.20, wD=0.25`; `innovationMod` 0.9–1.15; `teamFactor` 0.5–1.3.
Detalle: `03`.

**Motores (Fase 9.2, docs/19 §9.2):** el término tecnológico del techo es el **MOTOR elegido al
concebir**: propio (se construye con 💰 + 💡 + semanas y se amortiza entre juegos), licenciado
(moderno YA, cuota por juego + **royalty 7–12 %** de las ventas para siempre) o artesanal (nivel 0,
lo único que hay en 1980). Los motores **envejecen** (nivel fijo, exigencia de era creciente): cada
era toca **mejorar** (60 % del coste) o cambiar — el sumidero recurrente. Un AAA sobre motor
obsoleto **topa bajo**; el juego pequeño/narrativo depende mucho menos. El motor también decide las
**plataformas simultáneas** (kits bi/multi que se investigan) y gatea features (el online exige
capacidad Online). Taller y catálogo en la pantalla de I+D; adecuación **siempre visible** al concebir.

**Publishers y Early Access (Fase 9.6, docs/19 §9.6):** en la concepción decides **quién publica**.
Con 4.000 💰 de arranque (recalibrado) el primer juego auto-publicado es una apuesta que pasa por
números rojos; los **publishers** ponen el arranque + un **adelanto** y su **distribución** agranda
la demanda (+15–45 %), a cambio del **55–75 % del bruto para siempre** — y a veces la **IP** o la
exclusividad de plataforma. Las ofertas son deterministas (perfil × tamaño × reputación) y el trato
se congela al firmar; la bolsa de marketing del publisher paga tus campañas hasta agotarse. La meta
es **independizarte**: el primer ≥ mediano auto-publicado tras un trato se celebra con su hito (y el
peaje acumulado a la vista). El **Early Access** (E5+, solo auto-publicados en Pulido) vende la
promesa: dinero antes y feedback que pule QA y bugs, con **paciencia de ~1 año** — demorarse quema
sentimiento y reputación en rampa; en la 1.0 los compradores de EA recortan el pico day-one y una
1.0 floja (< 60) es **traición** escalada por cuántos pagaron.

**GaaS y adquisiciones (Fase 9.7, docs/19 §9.7):** el late-game deja el piloto automático. Un juego
lanzado (≥ mediano, IP propia) se **opera como servicio** con la investigación de E6: la parroquia
(sembrada de sus ventas) paga ARPU semanal (más con pase/tienda — media palanca de codicia) a
cambio de **equipo en exclusiva** (3/5/8/16 por tamaño) y servidores; descuidarlo desangra
jugadores y enfría a la comunidad, y **exprimido + descuidado estalla** en review bombing. Desde el
Estudio grande se **compran rivales** (indie/medio; los gigantes no se venden, los que están en
racha rechazan) a precio determinista: salen de la competencia y su **filial** lanza juegos sola —
overhead continuo contra un flujo que sigue a su **talento**, gobernado por la **directiva**
(exprimir ×1,7 hoy y la casa se quema, con éxodos que refuerzan a la competencia; invertir
construye hasta el techo 85). Vender devuelve el valor actual con descuento. La política
**Dotación de servicios** mantiene los platos girando a escala de Corporación.

**La escalada (Fase 9.1, docs/19 §9.1):** el juego ya **no se resuelve**. La `Q` tiene un **techo
dinámico** — `min(era, madurez, talento, motor)` — que en el garaje ronda 45–52 juegues como
juegues y sube DESPACIO con lanzamientos y escala; una **obra maestra (85+) exige una estrella**
(skill ≥ 80) en el rol clave, y el AAA con estudio flojo **se hunde** (encaje de alcance). La reseña
compara `Q` contra un **listón por era en parte oculto** (`nota = 70 + 1.3·(Q − listón)`, listón
61→88), **repetir fórmula fatiga** la nota (y el público olvida con los años), y la nota lleva una
**banda ±4** determinista y SIEMPRE explicada. La gala celebra "tu mejor juego hasta ahora": un 45
temprano es un logro. El dilema muerde: la **reputación decae sola** hacia 50, solo las notas > 65
dan cariño, la **codicia rinde más** (mtx 0.85·agg, dlc 1.25, f2p 1.1·agg) y el **marketing no tiene
tope** (campañas re-comprables: amplificador de alta varianza).

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
persona·semana). Se gastan en un árbol que desbloquea nuevos géneros, combinaciones, features y
capacidades de estudio (QA, marketing), y — desde la Fase 9.2 — la **tecnología de motores**: los
nodos de *Arquitectura de motores I/II/III* gatean qué generación puedes construir y otros habilitan
capacidades del motor (3D, online, kits de plataforma). La obra del motor en sí cuesta 💰 + 💡 +
semanas aparte (§2 "Motores"). Muchos desbloqueos están **gateados por era** (no puedes investigar
"online masivo" en 1985).

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

Desde 9.4 los temas **no tienen curva de popularidad**: su base es **plana** como la de los géneros
(banda ~42–58 %), y la variación fuerte la dan las **fiebres** (doc `04` §2). La "afinidad típica" de
la tabla es el **fit tema×género** (calidad, doc `03`), no una moda permanente. Algunos aparecen en eras
posteriores. **Solo fantasía, ciencia ficción y espacio son libres al empezar**; el resto se
**desbloquea con 💡** una vez su era ha llegado (docs `17` P1). La era habilita la opción; el tema
cuesta 💡 igualmente.

Son **29** desde la 8.10: los 15 del baseline + **2 por era** (docs `18` V6). Las eras de esta tabla
son las de `data/themes.ts` (la fuente de verdad).

| Tema | Aparece | Afinidad típica |
|------|:---:|-----------------|
| Fantasía | E1 | Excelente con RPG y Aventura |
| Ciencia ficción | E1 | Amplia; buena con Shooter y Estrategia |
| Espacio | E1 | Estrategia, Simulación, Shooter |
| Medieval | E1 | RPG, Estrategia |
| Deportes | E1 | Con el género Deportes/Carreras |
| Vida/Cotidiano | E1 | Casual y Simulación (excelente) |
| Piratas | E1 | Aventura, Acción |
| **Mitología** | E1 | RPG, Aventura |
| **Oeste** | E1 | Aventura, Shooter (muere en E3, renace en E6) |
| Militar | E2 | Shooter y Estrategia (muy bueno); mal con Casual |
| Historia/Épica | E2 | Estrategia, RPG |
| **Ninjas / artes marciales** | E2 | Plataformas, Ritmo (pico arcade en E2–E3) |
| **Fantasía oscura** | E2 | RPG, Terror (su momento llega en E6) |
| Crimen | E3 | Aventura, Sandbox, Shooter |
| Terror sobrenatural | E3 | Con el género Terror |
| Zombis | E3 | Shooter, Terror, Supervivencia |
| **Terror psicológico** | E3 | Terror, Aventura (boom indie en E5–E6) |
| **Espías / conspiración** | E3 | Aventura, Shooter |
| Cyberpunk | E4 | RPG, Shooter, Sandbox |
| Post-apocalíptico | E4 | RPG, Shooter, Sandbox |
| **Supervivencia / naturaleza** | E4 | Sandbox, Simulación (explota en E5–E6) |
| **Steampunk** | E4 | RPG, Estrategia (nicho fiel) |
| Superhéroes | E5 | Acción, Aventura (fatiga en E7) |
| **Vida social / citas** | E5 | Simulación, Gestión |
| **Cocina / restaurante** | E5 | Gestión, Puzzle |
| **Isla / battle royale** | E6 | Battle Royale, Shooter (pico brutal, fatiga en E7) |
| **Urbano aumentado** | E6 | Aventura, Carreras (moda AR: pico corto) |
| **Transhumanismo / IA** | E7 | RPG, Terror |
| **Colonización espacial** | E7 | Estrategia, Simulación |

---

## 6. Catálogo: Plataformas / Consolas `[baseline v1]` (doc `09` §4)

Nombres **ficticios reconocibles**. Cada una tiene un ciclo de vida (nace → crece → madura → declina →
descatalogada) que fija su base instalada y su tamaño de mercado (`04`). Algunas exigen **licencia/dev-kit**
(10k–100k 💰) e investigación.

Desde 9.4 cada era tiene **2–3 consolas en competencia que salen escalonadas** dentro de la era
(`releaseWeek` distinto): decidir en cuál y cuándo lanzar es una lectura de mercado (dev-kit vs base
instalada). Lista según `data/platforms.ts` (la fuente de verdad):

| Plataforma | Era | Tipo | Fabricante (ficticio) | Nota |
|------------|:---:|------|-----------------------|------|
| PC Casero | E1 | Ordenador | (abierto) | Sin licencia; crece toda la partida |
| Commo 64 | E1 | Micro-ordenador | Commo Ltd. | Base instalada enorme en E1; muere pronto |
| Master V | E2 | Consola sobremesa | Vexa Corp. | Cartuchos; guerra de consolas E2 |
| Gameling | E2 | Portátil | Ninten-Go | Favorece Casual/Puzzle; monocromo |
| Playsystem | E3 | Consola 32-bit (CD) | Sonora | El gran salto 3D |
| N-Cube | E3 | Consola 64-bit | Ninten-Go | Cartucho; familiar |
| **Vortex 32** | E3 | Consola 32-bit | Vexa Corp. | Tercera en discordia; sale a mitad de E3 |
| Playsystem 2 | E4 | Consola | Sonora | Base instalada récord |
| **Vertex** | E4 | Consola | Microhard | Rival hardcore; entra a mitad de E4 |
| **Gameling Advance** | E4 | Portátil | Ninten-Go | Relevo del Gameling; familiar |
| Móvil | E5 | Móvil | Tiendas de apps | Habilita F2P y microtransacciones |
| Playsystem 4 | E5 | Consola | Sonora | Sobremesa hardcore de E5 |
| **N-Switch** | E5 | Híbrida | Ninten-Go | Sobremesa/portátil; sale más tarde en E5 |
| CloudPlay | E6 | Servicio/streaming | Streamium | Games-as-a-service |
| **Playsystem 5** | E6 | Consola | Sonora | Puntera de E6 |
| **Vertex X** | E6 | Consola | Microhard | Tercera de E6; escalonada |
| Visor RV Mixta | E7 | RV/AR | Aureal Labs | Nicho de alto valor |
| **Holo Deck** | E7 | Portátil streaming | Streamium | Entra tras el visor RV |

**Multiplataforma (9.2):** el motor decide cuántas consolas caben a la vez (kits bi/multi que se
investigan); cada una paga su licencia y la demanda suma sus bases instaladas.

### 6.1 Catálogo: Motores licenciables `[baseline v1 · Fase 9.2]` (doc `09` §4.1)

Nombres ficticios reconocibles, como las plataformas. Nivel **fijo** (también envejecen); el catálogo
se renueva por eras y los viejos se retiran de proyectos nuevos. Cuota **por juego** al concebir +
**royalty sobre ingresos brutos, para siempre**. El motor propio se construye en el taller (I+D).

| Motor | Vendor (ficticio) | Era | Gen | Nivel | Capacidades | Cuota/juego | Royalty |
|-------|-------------------|:---:|:---:|:---:|-------------|:---:|:---:|
| RayTech 3D | Software del Abismo | E3–E4 | 3 | 10 | 3D, físicas | 15k | 8 % |
| Irreal Engine 2 | Juegos Épicos | E4–E5 | 4 | 14 | 3D, físicas, online | 40k | 10 % |
| Unify | Unify Technologies | E5–E6 | 5 | 18 | + biplataforma | 25k | 7 % |
| Irreal Engine 3 | Juegos Épicos | E5–E6 | 5 | 19 | + biplataforma | 60k | 11 % |
| Unify 5 | Unify Technologies | E6+ | 6 | 24 | + multiplataforma | 40k | 8 % |
| Irreal Engine 5 | Juegos Épicos | E6+ | 6 | 26 | + multiplataforma | 100k | 12 % |
| Nebula Forge | Aureal Labs | E7 | 7 | 30 | todas | 150k | 12 % |

---

## 7. Catálogo: Features `[baseline v1 · afinidad por género desde 9.3]` (doc `09` §5, docs/19 §9.3)

Cada feature suma **calidad potencial** pero cuesta tiempo y puede generar bugs — y desde la Fase
9.3 tiene **afinidad por género**: la que **encaja** aporta entera (verde), la neutra a medias
(ámbar) y la que **no pega no aporta (resta) y multiplica sus bugs** (rojo). Elegir features es una
decisión de **criterio**, no de apilar. El encaje **se gana** (❓ hasta lanzarlo o investigar *Teoría
del diseño*) y el desglose de reseña **nombra** las piezas fuera de sitio. Algunas vienen en
**variantes excluyentes** de un trade-off (elegir una desmarca la otra).

| Feature | Desde | Aporta | Riesgo | Encaja en… | No pega en… |
|---------|:---:|--------|--------|------------|-------------|
| Multijugador local | E1 | Bajo | Bajo | Deportes, Carreras, Plataformas, Ritmo, Estrategia, Puzzle | Aventura, Terror, Gestión |
| Final ramificado | E1 | Medio | Bajo | RPG, Aventura, Terror | Deportes, Carreras, Ritmo, Puzzle, Battle Royale |
| Físicas avanzadas | E1 | Alto | Alto | Shooter, Carreras, Simulación, Plataformas, Puzzle | Ritmo, Gestión |
| Sistema de crafteo | E1 | Medio | Medio | RPG, Sandbox, Simulación, Terror | Deportes, Carreras, Ritmo, Puzzle |
| Mundo abierto artesanal ◄var| E1 | Muy alto | Muy alto | RPG, Aventura, Sandbox | Puzzle, Ritmo, Deportes, Gestión |
| Editor de niveles | E2 | Alto | Medio | Puzzle, Plataformas, Estrategia, Sandbox, Gestión | Aventura, Terror |
| Modo carrera | E2 | Alto | Medio | Deportes, Carreras, Gestión, Simulación | Aventura, Terror, Puzzle |
| Banda sonora original | E2 | Medio | Muy bajo | Ritmo, Carreras, Plataformas, Aventura | — |
| Voz digitalizada ◄var | E3 | Medio | Bajo | Aventura, RPG, Terror | Puzzle |
| Cinemáticas | E3 | Alto | Medio | RPG, Aventura, Shooter, Terror | Puzzle, Gestión, Ritmo |
| Multijugador online | E4 | Muy alto | Muy alto | Shooter, Deportes, Carreras, Estrategia, Battle Royale | Aventura |
| Doblaje completo ◄var | E4 | Muy alto | Medio | RPG, Aventura, Terror | Puzzle, Ritmo, Deportes, Carreras |
| Logros y desafíos | E4 | Bajo | Muy bajo | — (neutra) | — |
| Mundo procedural ◄var | E5 | Alto | Alto | Sandbox, RPG, Estrategia | Aventura, Ritmo, Deportes |
| Guardado en la nube | E5 | Bajo | Bajo | — (neutra) | — |
| Modo foto | E6 | Medio (marketing) | Muy bajo | Sandbox, Aventura, Carreras, Simulación | Puzzle, Ritmo |
| Cross-play | E6 | Alto | Alto | Shooter, Deportes, Battle Royale, Carreras | Aventura, Terror |
| Compañero con IA | E7 | Muy alto | Muy alto | RPG, Aventura, Terror, Simulación | Puzzle, Deportes, Carreras, Ritmo |

**Variantes (◄var):** `mundoAbierto` = artesanal (caro/lento/calidad) vs procedural (barato/rápido/
repetitivo); `voces` = voz digitalizada (barata) vs doblaje completo (caro, exige *Producción de
audio* en I+D). Multiplicadores en `balance.quality.featureAffinity` (1 / 0.5 / −0.25; bugs de
misfit ×1.75 sobre `featureBugScale` 1.3).

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
| Capital inicial (garaje) | **4.000 💰** (recalibrado en 9.6: el primer juego auto-publicado es una apuesta; firmar o prestarte, una decisión real) |
| Publisher (9.6) | se queda el 55–75 % del bruto para siempre · adelanto no recuperable (coste dev × 0,8–1,35 × rep) + arranque a su cargo · distribución +15–45 % de demanda · bolsa de marketing 3k–200k × perfil · a veces IP / exclusividad |
| Early Access (9.6, E5+) | solo auto-publicados en Pulido · precio ×0,7 · demanda ×0,2 con decaída · feedback +QA/−bugs semanal · paciencia 52 sem y quema en rampa · la 1.0 recorta el pico por compradores EA; floja (< 60) = traición |
| Precio por juego | 20–60 💰 según tamaño/era |
| Coste base por tamaño | 500 / 2.000 / 8.000 / 60.000 / 250.000 💰 (Pequeño/Mediano/Grande/Muy grande/AAA), fijo al iniciar |
| Requisito por tamaño | plantilla mín. 1 / 3 / 8 / 15 / 40 · etapa mín. Garaje / E. pequeño / Estudio / E. grande / **Corporación** (AAA) |
| Ampliar el estudio (docs/18 V4-c) | coste 10k / 100k / 750k / 4M 💰 a etapa 2/3/4/5; requiere 25k / 200k+4 / 1,5M+8 / 8M+20 (capital+plantilla) |
| Overhead semanal por etapa (docs/18 V4-d) | +0 / +300 / +1.500 / +7.000 / +30.000 💰 sobre el fijo base |
| Salario junior / senior / estrella | 300 / 800 / 2.000 💰 por semana |
| Coste de desarrollo | ~500 💰 por persona·semana |
| Coste de contratación | 2–4 semanas del salario del candidato |
| Marketing escalonado (re-comprable sin tope, 9.1) | 2k / 10k / 40k / 120k 💰 (Nota de prensa → Anuncios → Feria/Expo → Campaña masiva); cada compra repite coste y expectación |
| Licencia de plataforma | 10k–100k 💰 según generación (multiplataforma: cada una la suya) |
| Punto de I+D | ~1 por persona·semana en investigación |
| Construir motor propio (9.2) | por generación 1→7: 6k…2,5M 💰 + 8…120 💡 + 6…32 semanas; **mejorar = 60 %** |
| Licenciar motor (9.2) | cuota 15k–150k 💰 por juego + royalty 7–12 % de ingresos brutos |
| Servicio en vivo (9.7, E6+) | ARPU 0,5 💰/jugador·sem × (1 + 0,5·pase + 0,8·tienda) · servidores 200–9k/sem + 0,1/jugador · equipo EXCLUSIVO 3/5/8/16 (mediano→AAA) · churn 2 %/sem (+8 % descuidado) |
| Adquirir estudios (9.7, E. grande+) | indie 250k / medio 1,6M × fuerza · overhead 2,5k / 9k 💰/sem · bote por juego 90k–3M × calidad^1,75 (suelo reseña 45), cobrado al 6 %/sem · vender = valor actual × 0,55 |
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
- **La industria rival (Fase 9.5, docs/19 §9.5):** 12 estudios con tier (indie/medio/gigante) y
  perfil (fábrica de secuelas / prestigio / oportunista de fiebres) que **lanzan juegos de verdad**
  (suman a la saturación; sus bombazos encienden fiebres), **evolucionan** (promocionan, decaen,
  cierran), **cazan a tus empleados** con la lealtad baja (contraoferta: igualar para siempre o
  dejarle ir) y **disputan ventanas de lanzamiento**: la campaña de un gigante aplasta ~45 % del
  pico day-one de un juego ajeno de su género en ±3 semanas — el tuyo puede **retrasarse** para
  esquivarla (la nómina corre). Todo visible en el panel de **Industria** (ranking, calendario de
  anuncios con ⚠ de choque, lanzamientos recientes): decides con información, nunca es emboscada.
- **Comprar la competencia (Fase 9.7, docs/19 §9.7):** desde el Estudio grande, los rivales
  indie/medio se **adquieren** desde ese mismo ranking (los gigantes no se venden; el que está en
  racha rechaza): salen de la competencia para siempre y pasan a la sección **Tus filiales** —
  lanzando juegos para ti, con su directiva, su P&L y su botón de venta a la vista.

---

## 14. Reconocimiento y cierre de partida (doc `06`)

- **Premios anuales** (tipo Game Awards): **competitivos** (docs `18` V7) y — desde la 9.5 — contra
  los **RIVALES REALES**: los nominados son los mejores lanzamientos del año de la industria
  simulada, con tu mismo baremo (reseña + prestigio + escala × peso de la categoría). Te **nominan**
  si tu mejor juego del año pasa el umbral de la categoría, y compites por un **puesto** ("Estudio
  del año: 4.º"). Como la reseña está normalizada por era y la reputación satura pronto, **lo único
  que crece es la escala** — y los establecidos van un tamaño por delante hasta E5: ganar el GOTY
  solo es realista en **E6–E7**, con Corporación y un AAA excelente (en años flojos de la industria,
  una obra maestra pesca antes en las categorías de idea — Innovación/Diseño/Público — donde la
  escala casi no puntúa, ni para ti ni para sus AAA). La nominación ya deja poso en Crítica/Prensa;
  ganar da Reputación, hype y atractivo de contratación. Ni la fábrica cínica (no pasa el umbral) ni
  el indie de culto (sin escala) se llevan el gordo: es de quien navega el dilema.
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
