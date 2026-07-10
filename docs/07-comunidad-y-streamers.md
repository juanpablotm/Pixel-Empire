# 07 — Comunidad y Streamers

La **capa social** del juego y la gran modernización frente a *Game Dev Tycoon*, donde el marketing se
reducía a "comprar anuncios". Aquí el éxito lo deciden también los creadores de contenido y una
comunidad viva que puede ensalzarte o destrozarte. Es el **canal donde el Dilema Moral (`06`) se
dramatiza en público**.

---

## 1. Componentes del sistema

1. **Sentimiento de Comunidad** — un público vivo con estado de ánimo.
2. **Roster de Creadores de Contenido** — marketing moderno vía claves de acceso.
3. **Hype y Leaks** — la fase de expectación pre-lanzamiento y sus accidentes.
4. **Review Bombing y Gestión de Crisis** — cuando la comunidad se organiza en tu contra.

## 2. Sentimiento de Comunidad `[DECIDIDO]`

Añadimos "la Comunidad" como un **segmento propio de público** (junto a crítica, hardcore, casual y
prensa; "empleador" es la faceta de reputación laboral de `05`/`06` — ver el tipo `Segment` en `09`),
representado como un hub tipo Reddit/Discord con un **termómetro de sentimiento** (0–100) y un
feed de "posts" generados que reflejan cómo reacciona a tus actos.

- Sube con: juegos queridos, transparencia, escuchar feedback, parches generosos, precios justos.
- Baja con: monetización agresiva, promesas rotas, silencio ante problemas, subidas de precio.
- El sentimiento **modula ventas** (boca a boca, `04` `modificadorComunidad`) y es el terreno donde
  ocurren hype y crisis. Una comunidad caliente y feliz es tu mejor activo de marketing (gratis).

## 3. Roster de Creadores de Contenido `[DECIDIDO]`

Sustituye "comprar anuncios genéricos". Tienes acceso a un **elenco de creadores** (crece con las
eras: en E1–E3 son revistas/prensa; los streamers aparecen en E5–E6). Repartes **claves de acceso**
(un recurso limitado por lanzamiento).

Cada creador tiene: **alcance** (tamaño de audiencia), **público objetivo** (mapea a segmentos),
**personalidad/exigencia**, y un **coste/dificultad de conseguirlo** (los grandes son difíciles).

### Arquetipos de creador `[DECIDIDO]`
| Arquetipo | Audiencia | Le encanta | Peligro |
|-----------|-----------|------------|---------|
| **Variedades masivo** | Enorme, casual | Juegos accesibles y vistosos | Se aburre con lo hardcore/lento en directo |
| **Competitivo hardcore** | Media, hardcore | Profundidad, balance, skill | Destroza el pay-to-win y los bugs |
| **VTuber** | Grande, fiel | Juegos con carisma/reacciones | Muy sensible a la afinidad de tono |
| **Crítico de culto** | Pequeña, influyente en Crítica | Arte, innovación, narrativa | Implacable con lo genérico |
| **Influencer casual** | Grande, superficial | Tendencia del momento | Volátil; hoy te ama, mañana te olvida |

### La mecánica de reparto de claves `[DECIDIDO]`
El resultado de dar una clave a un creador depende del **FIT** entre tu juego y su público **× la
calidad real** (`03`) **× estado de bugs**:

```
resultadoCreador = fit(juego, públicoCreador) × factorCalidad(Q) × factorBugs(bugLevel)
efectoVentas   = alcanceCreador × resultadoCreador
efectoReputación = Δ segmento(públicoCreador) según resultado
```

- **Buen fit + juego pulido** → el creador lo disfruta en directo → **explosión de ventas** en su segmento + reputación.
- **Mal fit** (mandar tu sim lento de gestión al Variedades masivo) → aburrimiento en directo → tibio o contraproducente.
- **Bug ridículo en directo** (`bugLevel` alto) → momento viral **negativo** → riesgo de disparar review bombing (§5).

Esto convierte el marketing en una **decisión de casting** legible y con riesgo real, no en gastar dinero a ciegas.

## 4. Fase de Hype y Leaks `[DECIDIDO]`

Antes del lanzamiento se acumula **Hype (📣)** por marketing, ferias (`04`) y campaña de creadores. El
hype es de **doble filo** (ver `04` §4): sube ventas day-one pero endurece las reseñas.

### Eventos de pre-lanzamiento (dilemas)
- **Leak de la build alpha:** un empleado filtra una alpha por accidente en Discord. Dilema:
  - *Comunicado de disculpa y transparencia* → −sorpresa, +confianza de comunidad.
  - *Capitalizar el hype* ("¡ya que está fuera...!") → +hype/marketing, pero si el juego final no
    cumple, el backlash se **amplifica**.
- **Sobre-prometer en marketing:** inflar expectativas (palanca de codicia, `06`) dispara ventas
  iniciales, pero si el juego no cumple lo prometido → caída brutal + crisis casi garantizada.
- **Revelaciones/trailers:** decisiones de cuándo y cuánto enseñar, gestionando la curva de hype.

## 5. Review Bombing y Gestión de Crisis `[DECIDIDO]`

Cuando algo sale mal, la comunidad puede **organizarse en tu contra**. El review bombing es un
**estado temporal** que hunde la nota pública visible y las ventas hasta que se gestiona o amaina.

### Disparadores de crisis
Parche que rompe el juego, subida de precio o cambio de monetización tras el lanzamiento, bug viral en
directo (§3), escándalo de codicia (`06`), promesa incumplida, escándalo laboral por crunch (`05`).

### El subsistema de Gestión de Crisis `[DECIDIDO]`
Al estallar, se abre un **evento de crisis** con un **reloj** (la crisis empeora si no actúas) y un
menú de respuestas, cada una moviendo los segmentos de forma distinta:

| Respuesta | Efecto típico |
|-----------|---------------|
| **Silencio / esperar** | Barato; la crisis puede amainar sola o pudrirse. Arriesgado. |
| **Disculpa sincera + parche/compensación gratis** | Cuesta dinero/tiempo; recupera comunidad y hardcore si es creíble. |
| **Comunicado corporativo defensivo** | Barato; suele **empeorar** con hardcore/comunidad ("PR vacío"). |
| **Echar culpas / negar** | Puede funcionar a corto con casual; desastroso si se destapa. |
| **Revertir la decisión** (bajar precio, quitar monetización) | Sacrifica ingresos; apaga el fuego. |

**La reputación previa importa:** un estudio querido (`06`) sufre crisis más cortas y suaves — la
comunidad le da el beneficio de la duda. Un estudio odiado ve cada chispa convertida en incendio.

### Coherencia con "mayormente determinista" `[DECIDIDO]`
La comunidad reacciona de forma **legible a tus acciones**: subiste el precio → los hardcore se
enfurecen; mentiste en el marketing → el crash de reputación es proporcional a la brecha
promesa/realidad. El **azar solo decide el sabor** (qué creador se topa con el bug, el timing exacto
de un leak), **nunca arruina una buena decisión** de la nada. El jugador siempre puede trazar la
causa de una crisis hasta una decisión suya.

## 6. Interfaz con otros sistemas

- ← **Calidad (`03`):** `Q` y `bugLevel` determinan el resultado con creadores y el riesgo de crisis.
- ← **Mercado (`04`):** el hype ajusta ventas/reseñas; el sentimiento de comunidad modula ventas.
- ← **Dilema moral (`06`):** las palancas de codicia son los principales disparadores de crisis; la
  reputación previa amortigua o amplifica.
- ← **Personal (`05`):** "Estrellas mediáticas" dan hype extra; el crunch puede filtrarse como escándalo.

## 7. Progresión por eras `[DECIDIDO]`

- **E1–E3:** marketing = anuncios y **revistas/prensa**; boca a boca lento. No hay streamers aún.
- **E4–E5:** foros, primeras webs de reseñas, nace la cultura online; primeros creadores.
- **E6–E7:** streamers, review bombing, cultura de hype y cancelación en pleno apogeo. El sistema
  alcanza su máxima intensidad justo cuando las palancas de codicia (`06`) también son más potentes.

## 8. Criterios de aceptación (para Claude Code)

- [ ] Existe un segmento "Comunidad" con termómetro de sentimiento y feed de posts generados.
- [ ] El sentimiento modula ventas (boca a boca) y evoluciona por las acciones del jugador.
- [ ] Hay un roster de creadores con alcance, público, personalidad; el reparto de claves es un recurso limitado.
- [ ] `resultadoCreador` depende de fit × calidad × bugs y afecta ventas y reputación por segmento.
- [ ] El hype se acumula pre-lanzamiento y tiene doble filo (ventas ↑ / reseñas más duras).
- [ ] Existen eventos de leak y sobre-hype como dilemas.
- [ ] El review bombing es un estado temporal que afecta nota visible y ventas.
- [ ] El evento de crisis con reloj y menú de respuestas está implementado; la reputación previa modula el des