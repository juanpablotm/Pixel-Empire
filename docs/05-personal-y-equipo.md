# 05 — Personal y Equipo

Este es el **Pilar 4** ("personas, no números") aplicado a tu plantilla. Los empleados son el **motor**
de la producción (alimentan el `teamFactor` de `03`) y, a la vez, las **víctimas o beneficiarios** de
tus decisiones morales (`06`): el crunch los quema, tratarlos bien los fideliza.

---

## 1. Anatomía de un empleado

Cada empleado es una entidad con estado propio:

| Atributo | Rango | Descripción |
|----------|-------|-------------|
| **Nombre / Avatar** | — | Generado (avatar procedural determinista por semilla, ver `10`). |
| **Especialidad** | Diseño / Técnica / Arte / Audio / Marketing | Rol principal. |
| **Skills** | 0–100 cada una | Nivel en cada disciplina (no solo la principal). |
| **Rasgos** | 1–3 | Modificadores de personalidad (ver §3). |
| **Moral** | 0–100 | Cómo de contento está. Afecta rendimiento y retención. |
| **Energía** | 0–100 | Se agota con el trabajo; se recupera con descanso. Baja = burnout. |
| **Salario** | 💰/semana | Coste fijo. Sube con nivel y expectativas. |
| **Lealtad** | 0–100 | Resistencia a irse. Sube con buen trato, baja con crunch/agravios. |
| **Nivel / XP** | — | Crece con la experiencia; mejora skills. |

## 2. Especialidades y roles `[DECIDIDO]`

- **Diseño:** jugabilidad, sistemas, historia. Clave en RPG, Estrategia, Aventura.
- **Técnica (Programación):** motor, rendimiento, IA. Clave en Shooter, Simulación, online.
- **Arte:** gráficos, dirección visual. Sube el techo de "Técnica" percibida y el atractivo.
- **Audio:** música y sonido. Multiplicador de pulido/inmersión.
- **Marketing:** amplifica hype y eficacia de campañas (`07`); en el garaje lo haces tú.

Cada género pondera las especialidades de forma distinta al calcular `teamFactor` (`03`). Un equipo
desequilibrado (todo Técnica, cero Diseño) hará ciertos géneros bien y otros mal.

## 3. Rasgos de personalidad `[DECIDIDO]`

Los rasgos dan **carácter** y decisiones interesantes. Ejemplos:

- **Perfeccionista:** +calidad/pulido, −velocidad. Frustrado si le metes prisa (crunch le hunde la moral).
- **Rápido pero descuidado:** +velocidad, +riesgo de bugs.
- **Visionario:** boost a innovación; brilla en proyectos originales, se aburre clonando.
- **Estrella mediática:** su nombre asociado a un juego genera hype extra; exige salario alto y ego.
- **Mentor:** acelera el crecimiento de los juniors a su alrededor.
- **Llanero solitario:** rinde más solo, penaliza la sinergia en equipos grandes.
- **Sensible al crunch:** el crunch le afecta el doble (moral y energía).
- **Workaholic:** tolera el crunch mejor... hasta que colapsa de golpe.

Los rasgos **interactúan** con las palancas morales (`06`): una plantilla de "sensibles al crunch"
convierte la estrategia de crunch en un suicidio de moral.

## 4. Moral, energía y burnout `[DECIDIDO]`

- **Moral** sube con: éxitos/buenas reseñas, salarios justos, descanso, buen ambiente, trabajar en
  proyectos afines a sus rasgos. Baja con: crunch, flops, agravios (recortes, despidos, ver escándalos).
- **Energía** baja cada tick trabajado; el crunch la drena rápido. Se recupera con menor carga,
  vacaciones y tiempo entre proyectos.
- **Burnout:** energía sostenidamente baja → penalización fuerte a rendimiento, cae la moral y sube el
  riesgo de renuncia. Es el mecanismo que hace del crunch una **deuda**, no un truco gratis.

```
rendimientoEfectivo = skill × f(moral) × f(energía) × modsRasgos
```

## 5. Química de equipo `[DECIDIDO]`

Ciertas combinaciones de personas/rasgos generan **sinergia** (+`sinergiaFactor` en `03`) o **fricción**
(−). Ej.: dos "Estrellas mediáticas" chocan de ego; un "Mentor" + juniors = sinergia. Se calcula por
proyecto según quién trabaja junto. Da textura a las decisiones de asignación (no basta con juntar a
los de mayor skill).

**Modelo v1:** `sinergiaFactor = clamp(1 + Σ_pares (0.03·afín − 0.04·conflicto), 0.8, 1.2)`.
Pares afines: Mentor+junior, especialidades complementarias para el género, rasgos compatibles.
Pares en conflicto: dos «Estrella mediática» juntas, varios «Llanero solitario» en un mismo equipo
grande, egos que chocan. El factor entra en el `teamFactor` de `03`.

## 6. Ciclo de vida del empleado (acciones del jugador) `[DECIDIDO]`

- **Contratar:** de un pool de candidatos (calidad/coste según era y reputación del estudio — un
  estudio querido atrae mejor talento). Coste de contratación + salario.
- **Formar:** invertir tiempo/dinero en subir skills (o desbloquear especialidades). Los "Mentor"
  abaratan esto.
- **Asignar:** a proyectos y a fases; gestionar carga de trabajo.
- **Motivar:** subidas de salario, vacaciones, bonus, mejores oficinas/perks.
- **Crunch:** forzar sobre-esfuerzo → +producción a corto, −moral/energía/lealtad. **Palanca de codicia** (`06`).
- **Despedir:** ahorra salario pero golpea la moral de los que quedan y la reputación como empleador.
  Un despido puntual justificado tiene un coste modesto; los **despidos masivos** (3+ en ~8 semanas,
  docs/17 E3) son un ERE sonado que hunde con fuerza la reputación de **Empleador**, la moral de los
  supervivientes y —al filtrarse como noticia— también a la **Comunidad**.

## 7. Retención y fuga de talento `[DECIDIDO]`

- Moral+lealtad bajas → probabilidad creciente de **renuncia**. Perder a una estrella a mitad de
  proyecto es un desastre productivo y de hype.
- **Reputación como empleador** (una faceta de la Reputación, ver `06`): estudios conocidos por el
  crunch atraen peor talento y más caro; estudios "buen sitio para trabajar" atraen a los mejores.
- En **fase avanzada** (con rivales, `04`/`11`), el talento que se va puede **irse a la competencia**
  y potenciar a un rival — drama y consecuencia real.

## 8. Escala: de hacerlo tú a dirigir `[DECIDIDO · 5 etapas desde docs/18 V4]`

Coherente con las 5 etapas (`02` §4):

- **Garaje:** eres 1 empleado (tú); tus skills son todo. La gestión de personal casi no existe.
- **Estudio pequeño:** hasta 4; empieza la moral, la asignación y la química.
- **Estudio:** hasta 10; dos proyectos en paralelo, primeros equipos separados.
- **Estudio grande:** hasta 25; varios proyectos grandes, gestionas por **políticas** (p. ej. política
  de crunch de empresa, formación automática) más que persona a persona.
- **Corporación:** hasta 100; la organización de 40+ que exige un AAA. El trato al personal se vuelve
  una decisión *ética a escala* (Pilar 1) — y la nómina, un incendio semanal que pagar.

## 9. Interfaz con otros sistemas

- → **Calidad (`03`):** aporta `teamFactor` (competencia × moral × sinergia).
- ← **Dilema moral (`06`):** el crunch y los despidos son palancas de codicia; el buen trato es integridad.
- → **Comunidad (`07`):** las "Estrellas mediáticas" generan hype; los escándalos laborales (crunch
  filtrado) pueden estallar como crisis públicas.
- ← **Mercado (`04`):** el tamaño y calidad del pool de contratación dependen de la era.

## 10. Criterios de aceptación (para Claude Code)

- [ ] Un empleado tiene especialidad, skills, 1–3 rasgos, moral, energía, salario, lealtad, nivel/XP.
- [ ] `rendimientoEfectivo` combina skill, moral, energía y rasgos, y alimenta el `teamFactor` de `03`.
- [ ] El crunch sube producción a corto plazo y degrada moral/energía/lealtad; el burnout penaliza fuerte.
- [ ] Existe pool de contratación cuya calidad/coste dependen de era y reputación de empleador.
- [ ] Formar, asignar, motivar, crunchear, despedir están implementados con sus efectos.
- [ ] La química de equipo modifica el resultado por composición del proyecto.
- [ ] Moral/lealtad bajas producen renuncias; en fase con rivales, el talento puede migrar a la competencia.
- [ ] La gestión pasa de individual (garaje) a por políticas (corporación).
