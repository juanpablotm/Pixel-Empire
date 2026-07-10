# 01 — Documento de Diseño General (GDD)

Este documento es el **mapa de alto nivel**. Describe todos los sistemas y cómo encajan, sin entrar en
las fórmulas (eso vive en los documentos 03–07). Léelo para tener el modelo mental completo antes de
sumergirte en cualquier sistema.

---

## 1. Estructura general del juego

El juego es una simulación dirigida por el jugador que avanza en el tiempo mediante **ticks**
(unidad = 1 semana de juego; ver `08-arquitectura-tecnica.md`). El jugador toma decisiones entre y
durante los proyectos, y el mundo (mercado, comunidad, equipo) evoluciona alrededor.

```
FUNDAR ESTUDIO
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    BUCLE PRINCIPAL                        │
│                                                           │
│   1. Elegir proyecto (tema + género + plataforma + público)│
│   2. Asignar equipo y presupuesto                         │
│   3. Desarrollar (fases con decisiones de diseño)         │
│   4. Decidir monetización y precio  ◄── DILEMA MORAL      │
│   5. Marketing y campaña de creadores ◄── COMUNIDAD       │
│   6. Lanzar → reseñas + ventas ◄── CALIDAD + MERCADO      │
│   7. Post-lanzamiento (parches, DLC, crisis)              │
│   8. Reinvertir → contratar, investigar, mejorar          │
│                                                           │
└─────────────────────────────────────────────────────────┘
      │
      ▼  (el mundo evoluciona: modas cambian, rivales lanzan, eras avanzan)
      │
      └──► repetir, con escala creciente, a través de las ERAS
```

## 2. Recursos que el jugador gestiona

| Recurso | Descripción | Doc detalle |
|---------|-------------|-------------|
| **Capital (💰)** | Dinero. Se gasta en salarios, marketing, I+D, oficinas. Cero = game over. | 06 |
| **Reputación (⭐)** | Respeto de crítica y comunidad. Segmentada por público. Abre oportunidades. | 06, 07 |
| **Tiempo (🗓️)** | Ticks/semanas. El recurso más escaso; todo compite por él. | 02 |
| **Equipo (👥)** | Empleados, con su moral y energía. El motor de producción. | 05 |
| **Conocimiento (💡)** | Puntos de investigación para desbloquear géneros, features, tecnologías. | 02, 09 |
| **Hype (📣)** | Expectación acumulada antes de un lanzamiento. Volátil. | 07 |

## 3. Los sistemas y sus documentos

### 3.1 Bucle núcleo y eras (`02`)
Cómo se crea un juego paso a paso (fases de pre-producción, producción, pulido), cómo avanza el tiempo,
y cómo el juego progresa a través de eras que cambian escala, tecnología y modelos de negocio.

### 3.2 Sistema de calidad transparente (`03`)
Cómo se calcula la calidad real de un juego a partir de encaje (fit), balance diseño/técnica, features,
bugs y el multiplicador de equipo. Cómo la reseña descompone ese número para que el jugador aprenda.

### 3.3 Mercado y modas (`04`)
Cómo géneros, temas y plataformas suben y bajan de popularidad, cómo funcionan hype y saturación, y
cómo el mercado convierte calidad en ventas y reseñas según el *momento* del lanzamiento.

### 3.4 Personal y equipo (`05`)
Empleados con especialidades, rasgos, moral, energía, burnout y química. Contratación, formación,
gestión y la posibilidad de que el talento se vaya (a rivales, en fases posteriores).

### 3.5 Dilema moral y economía (`06`)
El eje central: palancas de codicia (monetización, crunch, refritos) frente a palancas de integridad.
La economía completa (ingresos, costes) y el sistema de escándalos y consecuencias.

### 3.6 Comunidad y streamers (`07`)
La capa social: sentimiento de comunidad, roster de creadores de contenido, fase de hype y leaks,
review bombing y el subsistema de gestión de crisis.

## 4. Cómo se entrelazan los sistemas (el diagrama de dependencias)

```
        ┌──────────────┐
        │   PERSONAL   │  competencia + moral del equipo
        │    (05)      │────────────┐
        └──────┬───────┘            │ multiplicador
               │ crunch quema       ▼
               │ al equipo   ┌──────────────┐
               │             │   CALIDAD    │  produce: calidad real del juego
               │             │    (03)      │──────────┐
               │             └──────────────┘          │
        ┌──────▼───────┐                               ▼
        │ DILEMA MORAL │                        ┌──────────────┐
        │    (06)      │  monetización/precio   │   MERCADO    │  calidad → ventas + reseña
        │              │───────────────────────►│    (04)      │
        └──────┬───────┘                        └──────┬───────┘
               │                                       │
               │ codicia/integridad                    │ resultado público
               ▼                                       ▼
        ┌──────────────────────────────────────────────────┐
        │              COMUNIDAD Y STREAMERS (07)           │
        │  dramatiza el resultado: hype, review bombing,    │
        │  crisis. Ajusta Reputación y ventas finales.      │
        └──────────────────────────────────────────────────┘
```

**Regla de oro:** ningún sistema debe implementarse como una isla. Cada uno lee salidas de otros y
alimenta a los siguientes. El roadmap (`11`) está ordenado para respetar estas dependencias.

## 5. Filosofías de estudio (arquetipos de partida)

El diseño debe hacer viables (y distintas) al menos estas tres formas de jugar. Sirven como test de
balance: si alguna es claramente inferior, hay que ajustar.

- **Indie de culto:** juegos pequeños, innovadores, muy pulidos; precio justo; equipo feliz. Capital
  bajo pero estable, Reputación altísima. Sobrevive a los flops porque la comunidad lo adora.
- **Fábrica AAA:** grandes producciones, sigue las modas, monetización agresiva, crunch. Capital
  enorme pero Reputación frágil; un escándalo puede hundirlo. Vive del hype.
- **Estudio equilibrado:** alterna proyectos comerciales que financian proyectos de pasión. La ruta
  "sostenible". Ni la más rica ni la más querida, pero la más resiliente.

## 6. Condiciones de victoria y derrota `[DECIDIDO]`

- **Derrota:** Capital en negativo sostenido (bancarrota) sin poder pagar salarios.
- **No hay "victoria" única.** El juego usa el modelo de *Game Dev Tycoon*: muchas eras y una partida
  larga. Al final (o cuando el jugador decide retirarse) se calcula una **Puntuación de Legado** que
  pondera dinero acumulado, reputación, juegos memorables creados, premios e impacto en la industria.
- **Modo sandbox** desbloqueable tras una primera partida completa.

Ver detalle de la Puntuación de Legado en `06-dilema-moral-economia.md` §Legado.

## 7. Loop de sesión típico (ejemplo narrativo)

Para alinear el "feel": así se ve un tramo de partida en la era de estudio pequeño.

1. Terminas tu RPG de fantasía. El sistema de calidad da 78/100.
2. Decides el precio. La tentación: meter un "pase de batalla" que subiría ingresos ~40% pero baja
   Reputación con los hardcore. Dudas. Lo dejas fuera esta vez (juegas "integridad").
3. Repartes 20 claves a creadores. Se la das al *Crítico de culto* (buen fit) y al *Variedades masivo*
   (mal fit, arriesgado). El crítico lo adora → +Reputación hardcore. El de variedades se aburre en
   directo → ventas casuales tibias.
4. Lanzas. Reseñas: 82 de crítica, "una joya honesta con algún bug". Ventas sólidas, no explosivas.
5. Con el dinero, contratas a una artista con el rasgo "Visionaria" y desbloqueas la investigación de
   la nueva consola "Playsystem 2", que está empezando a despegar en el mercado.
6. El mercado avanza: el género "shooter táctico" entra en moda. ¿Te subes en el próximo proyecto o
   sigues fiel a tus RPGs?

Ese momento de duda repetido, con escala creciente, es el juego.

## 8. Glosario de términos (contrato de vocabulario)

Para mantener consistencia en código y documentos:

- **Proyecto / Juego:** una producción que el estudio desarrolla y lanza.
- **Fit / Encaje:** grado de coherencia entre tema, género, plataforma y público objetivo.
- **Calidad real:** número interno (0–100) que resume lo bueno que es el juego.
- **Reseña:** nota pública (0–100) derivada de la calidad real modulada por mercado y expectativas.
- **Segmento:** un público con gustos y reacción propios (crítica, hardcore, casual, prensa, comunidad).
- **Palanca de codicia / integridad:** decisión que sube Capital a costa de Reputación, o viceversa.
- **Tick:** unidad mínima de avance temporal (= 1 semana de juego).
- **Era:** periodo histórico con tecnología, plataformas y modelos de negocio propios.
- **Creador de contenido / Streamer:** entidad de marketing con alcance y público objetivo.
