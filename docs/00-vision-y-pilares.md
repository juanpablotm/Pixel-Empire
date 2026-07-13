# 00 — Visión y Pilares

## 1. La idea en una frase

> Un simulador de estudio de videojuegos donde cada decisión importante tira de dos cuerdas opuestas
> — **Reputación** (el respeto de la crítica y la comunidad) y **Capital** (dinero y crecimiento) —
> y donde no existe una única estrategia óptima, sino filosofías de estudio distintas y todas viables.

## 2. La fantasía central del jugador

Empiezas solo, en un garaje, a principios de los 80, programando tu primer juego en una tarde.
Terminas décadas después dirigiendo — o vendiendo el alma de — una megacorporación.

El jugador debe sentir tres fantasías encadenadas:

1. **Creador:** "Yo hice este juego con mis manos." (Fase garaje)
2. **Líder:** "Construí un equipo que hace juegos que yo no podría hacer solo." (Fase estudio)
3. **Magnate:** "Muevo la industria entera... ¿pero a qué precio?" (Fase corporación)

La transición entre estas tres fantasías **es** el juego. Y la pregunta que lo atraviesa todo es:
**¿qué legado vas a dejar?**

## 3. El problema que resolvemos

*Game Dev Tycoon* es un diseño elegante y adictivo, pero tiene un defecto central: **se "resuelve"**.
Una vez aprendes las combinaciones óptimas de tema+género+plataforma y los sliders correctos, el
juego pierde tensión. Es un problema de optimización con una solución conocida.

Nuestra apuesta de diseño para romper eso: **convertir cada decisión de optimización en un dilema de
valores**. Si no hay una respuesta "correcta" — solo trade-offs entre dinero, reputación, tu equipo y
tu comunidad — el juego sigue siendo interesante en la partida 20, porque cada partida es una
declaración de qué tipo de estudio quieres ser.

## 4. Los 5 pilares de diseño `[DECIDIDO]`

Todo lo que se construya debe reforzar al menos uno de estos pilares. Si una mecánica no sirve a
ninguno, no entra.

### Pilar 1 — El Dilema Moral es el eje
Reputación vs Capital. No son barras cosméticas: son dos recursos en tensión permanente. Meter
monetización agresiva sube Capital y baja Reputación. Cuidar a tu equipo y pulir tus juegos hace lo
contrario. **No se puede maximizar ambos a la vez**, y ninguno de los dos extremos es "ganar".

### Pilar 2 — Calidad transparente
El jugador nunca debe pensar "no sé por qué esto fracasó". La calidad de un juego se calcula con una
fórmula legible, y la reseña **descompone** el resultado en factores comprensibles ("gran encaje, pero
demasiados bugs y seguiste una moda ya muerta"). Aprender el sistema es parte de la diversión;
adivinar a ciegas, no.

### Pilar 3 — Mercado vivo
Géneros, temas y plataformas tienen ciclos de vida: nacen, llegan a su pico, decaen y mueren. Hay
hype y saturación. El **momento** de lanzar un juego importa tanto como su calidad. El mercado cambia
solo, obligando al jugador a adaptarse partida a partida.

### Pilar 4 — Personas, no números
Los empleados tienen personalidad, especialidades, moral, energía y química entre ellos. La comunidad
de jugadores es una entidad viva con estado de ánimo. Las decisiones tienen **víctimas y beneficiarios
concretos**, no solo efectos numéricos abstractos.

### Pilar 5 — De la nada a megacorporación
Muchas eras, con una curva de progresión larga y bien sentida. El jugador debe mirar atrás a mitad de
partida y pensar "no puedo creer que empecé en un garaje". La escala cambia: de decidir el nombre de
un juego a decidir la estrategia de una compañía de miles de empleados.

## 5. Los 4 sistemas de innovación y cómo se entrelazan

El corazón mecánico son cuatro sistemas que se refuerzan mutuamente. Ninguno funciona aislado.

- **Calidad transparente** produce un número (la calidad real del juego) que...
- **el Mercado** convierte en ventas y reseñas según modas, hype y saturación, lo cual...
- **el Dilema Moral** amplifica o castiga según cómo lo monetizaste y trataste a tu equipo, y todo ello...
- **la Comunidad y los streamers** lo dramatizan socialmente: te ensalzan o te destrozan en público.

Y por debajo, **el Personal** es el motor: la calidad depende de la competencia y moral de tu equipo,
y las palancas de codicia (como el crunch) queman a ese mismo equipo.

## 6. Tono y ambientación `[DECIDIDO]`

- **Ambientación:** industria de videojuegos **ficticia pero reconocible**. Parodias claras de la
  historia real (consolas tipo "Gameling", "Playsystem", "Master V", etc.) sin usar marcas reales.
  Esto da libertad total para la sátira sobre loot boxes, crunch y hype, sin pisar propiedades ajenas.
- **Tono:** cariñoso pero mordaz. Es una carta de amor a la industria y a la vez una crítica de sus
  peores hábitos. Humor, nostalgia y algo de conciencia.
- **Período simulado:** desde los primeros ordenadores personales (~1980) hasta un futuro cercano,
  atravesando todas las eras de hardware y modelos de negocio.
- **Identidad visual:** **flat / minimalista moderno, pero con acabado de juego** — una escena de
  oficina generada por código como foco visual, rodeada de una UI limpia, con movimiento y momentos
  señal. El listón es un juego **pulido y jugable**, no un panel de administración. Detalle en `10`.
  (Un upgrade isométrico ilustrado queda como opción futura en `14`, no es la dirección actual.)

## 7. Público objetivo

Jugadores de simulación y gestión (fans de *Game Dev Tycoon*, *Software Inc.*, *Two Point*,
*RimWorld* ligero), personas de la industria del videojuego que reconocerán y disfrutarán la sátira,
y jugadores que buscan un juego "con algo que decir" sobre creatividad vs comercio.

## 8. Qué ES y qué NO ES el juego

**ES:**
- Un simulador de gestión por turnos/ticks, dirigido por decisiones y datos.
- Un juego sobre **trade-offs de valores**, no solo de optimización.
- Una sátira jugable de la industria del videojuego.
- Un juego de progresión larga con muchas eras.

**NO ES `[DECIDIDO]`:**
- Un juego de acción, plataformas o tiempo real.
- Un juego 3D.
- Multijugador.
- Un juego con minijuegos jugables dentro (no "juegas" los juegos que creas; los diseñas y gestionas).
- Un clon 1:1 de *Game Dev Tycoon* (tomamos su esqueleto, pero innovamos en 4 ejes).

## 9. Objetivos de diseño medibles

Cómo sabremos que el diseño funciona:

1. **Rejugabilidad:** un jugador puede completar 3 partidas con filosofías distintas (indie de culto,
   fábrica AAA, estudio equilibrado) y las tres se sienten diferentes y viables.
2. **Legibilidad:** tras cada lanzamiento, el jugador puede explicar en una frase por qué le fue bien o mal.
3. **Tensión moral:** el jugador debe, al menos una vez por partida, dudar genuinamente ante una
   decisión de codicia vs integridad.
4. **Curva sentida:** el estado del garaje y el de la megacorporación deben sentirse como juegos casi
   distintos en escala y tipo de decisiones.

## 10. Riesgos de diseño conocidos `[SEGUIMIENTO CONTINUO]`

- **Complejidad excesiva:** cuatro sistemas entrelazados pueden abrumar. Mitigación: introducirlos
  gradualmente por eras (ver roadmap), no todos de golpe.
- **Balance del eje moral:** si la codicia es siempre óptima, el dilema muere. Debe haber castigos
  reales y tentaciones reales en ambos lados.
- **Contenido de late-game:** los tycoons se quedan sin cosas nuevas al final. Mitigación: nuevas
  eras, plataformas y crisis que sigan cambiando las reglas.
