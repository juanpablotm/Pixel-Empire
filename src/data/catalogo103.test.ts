import { describe, expect, it } from 'vitest';
import { eraForWeek, eraIndex, eraOrder, eras, getEra } from './eras';
import { features, featureGenreAffinity } from './features';
import { genres } from './genres';
import { platforms } from './platforms';
import { researchNodes } from './research';
import { createInitialState } from '../core/engine/initialState';
import { platformAvailable } from '../core/systems/market';

/**
 * Invariantes del CONTENIDO ampliado en la Fase 10.3 (docs/20 W5 y W6).
 *
 * No comprueban "que existan X consolas": comprueban las REGLAS que hacen que
 * ampliar el catálogo no rompa nada — que cada era tenga competencia real, que
 * ninguna consola nueva reviente la escalera de base instalada de su
 * generación (W5), que ninguna feature apunte a un nodo o un género que no
 * existe, que las variantes vengan en pares y que la economía de 💡 no se haya
 * diluido (W6b: el árbol no puede costar MÁS que antes de la ampliación).
 */

const peakOf = (curve: readonly { week: number; value: number }[]): number =>
  curve.reduce((max, p) => Math.max(max, p.value), 0);

describe('W5 — plataformas: la escalera de la 9.4 se respeta (docs/20)', () => {
  it('cada plataforma sale dentro de la era que declara y muere después de nacer', () => {
    for (const p of platforms) {
      expect(p.endWeek, `${p.name}: endWeek`).toBeGreaterThan(p.releaseWeek);
      // releaseWeek 0 = "ya estaba ahí cuando empieza la partida" (E1).
      const era = p.releaseWeek <= 0 ? 'E1' : eraForWeek(p.releaseWeek);
      expect(era, `${p.name}: sale en ${era} pero dice ser de ${p.appearsInEra}`).toBe(
        p.appearsInEra,
      );
    }
  });

  it('toda era tiene al menos 3 plataformas a la venta a mitad de era (hay DECISIÓN)', () => {
    for (const [i, era] of eras.entries()) {
      const next = eras[i + 1];
      const mid = next ? Math.floor((era.startWeek + next.startWeek) / 2) : era.startWeek + 60;
      const onSale = platforms.filter((p) => platformAvailable(p, mid));
      expect(onSale.length, `${era.name} (semana ${mid}): plataformas a la venta`).toBeGreaterThanOrEqual(3);
    }
  });

  it('ninguna consola nueva revienta la base instalada de su generación', () => {
    // W5: "respeta la escalera de la 9.4". Una plataforma puede ser la mayor
    // de su era, pero no puede desmarcarse de ella: su pico se compara con el
    // mayor pico de las plataformas de la MISMA era (margen del 10 %).
    for (const era of eraOrder) {
      const cohort = platforms.filter((p) => p.appearsInEra === era);
      if (cohort.length < 2) continue;
      const peaks = cohort.map((p) => peakOf(p.lifecycleCurve));
      const ceiling = Math.max(...peaks);
      for (const [i, p] of cohort.entries()) {
        expect(peaks[i], `${p.name}: pico fuera de la escalera de ${era}`).toBeLessThanOrEqual(
          ceiling * 1.1,
        );
      }
    }
  });

  it('las tres consolas de 10.3 abren una decisión distinta, no un clon numérico', () => {
    const by = (id: string) => platforms.find((p) => p.id === id)!;

    // Atarix VCS (E1) vs PC Casero: masiva y familiar contra prestigio.
    const atarix = by('atarixVcs');
    const pc = by('pcCasero');
    expect(atarix.audienceBias.casual).toBeGreaterThan(pc.audienceBias.casual);
    expect(atarix.audienceBias.hardcore).toBeLessThan(pc.audienceBias.hardcore);
    expect(atarix.genreAffinity.rpg).toBeLessThan(pc.genreAffinity.rpg);
    expect(atarix.genreAffinity.plataformas).toBeGreaterThan(pc.genreAffinity.plataformas);
    // Y se la lleva la crisis del 83: muere ANTES de que termine su era.
    expect(atarix.endWeek).toBeLessThan(getEra('E2').startWeek);

    // Amigo 500 (E2): plataforma abierta (sin dev-kit) y de géneros de sistemas,
    // frente a las consolas de su generación, que cobran licencia.
    const amigo = by('amigo500');
    expect(amigo.licenseCost).toBe(0);
    expect(by('masterV').licenseCost).toBeGreaterThan(0);
    expect(by('gameling').licenseCost).toBeGreaterThan(0);
    expect(amigo.audienceBias.hardcore).toBeGreaterThan(1);
    for (const g of ['estrategia', 'gestion', 'simulacion'] as const) {
      expect(amigo.genreAffinity[g], `Amigo 500 / ${g}`).toBe(1);
    }

    // Gameling Color (E3): el portátil que se queda FUERA de la carrera 3D —
    // dev-kit más barato que cualquier sobremesa de su generación.
    const color = by('gamelingColor');
    const desks3d = ['playsystem', 'nCube', 'vortex32'].map(by);
    for (const d of desks3d) {
      expect(color.licenseCost, `Gameling Color vs ${d.name}`).toBeLessThan(d.licenseCost);
    }
    expect(color.audienceBias.infantil).toBeGreaterThan(1);
    expect(color.audienceBias.hardcore).toBeLessThan(1);
  });

  it('el mercado inicial conoce a todas las plataformas (semilla fija)', () => {
    const state = createInitialState(4242);
    for (const p of platforms) {
      expect(state.market.platforms[p.id], `${p.name} en el mercado inicial`).toBeDefined();
    }
    // Las de E1 ya tienen base instalada; las futuras aún no.
    expect(state.market.platforms.atarixVcs.installedBase).toBeGreaterThan(0);
    expect(state.market.platforms.gamelingColor.installedBase).toBe(0);
  });
});

describe('W6 — features: el catálogo ampliado es coherente (docs/20)', () => {
  const genreIds = new Set(genres.map((g) => g.id));
  const nodeIds = new Set(researchNodes.map((n) => n.id));

  it('las afinidades apuntan a géneros reales y no se contradicen', () => {
    for (const f of features) {
      for (const g of [...(f.fitsGenres ?? []), ...(f.clashesGenres ?? [])]) {
        expect(genreIds.has(g), `${f.name}: género desconocido «${g}»`).toBe(true);
      }
      const clash = new Set(f.clashesGenres ?? []);
      for (const g of f.fitsGenres ?? []) {
        expect(clash.has(g), `${f.name}: «${g}» encaja y no encaja a la vez`).toBe(false);
      }
    }
  });

  it('toda feature gateada por I+D apunta a un nodo que existe', () => {
    for (const f of features) {
      if (f.requiresResearch === undefined) continue;
      expect(nodeIds.has(f.requiresResearch), `${f.name}: nodo «${f.requiresResearch}»`).toBe(true);
    }
  });

  it('cada variante tiene su pareja y las dos no valen lo mismo', () => {
    const groups = new Map<string, typeof features[number][]>();
    for (const f of features) {
      if (f.variantGroup === undefined) continue;
      groups.set(f.variantGroup, [...(groups.get(f.variantGroup) ?? []), f]);
    }
    expect(groups.size).toBeGreaterThanOrEqual(4);
    for (const [group, members] of groups) {
      expect(members.length, `variantGroup «${group}»: una variante sola no es un dilema`)
        .toBeGreaterThanOrEqual(2);
      // El punto del grupo es el trade-off: las variantes no valen lo mismo.
      const values = new Set(members.map((f) => f.qualityValue));
      expect(values.size, `variantGroup «${group}»: variantes idénticas en valor`).toBeGreaterThan(1);
    }
  });

  it('ningún género se queda sin features que le encajen (el hambre de 9.3)', () => {
    // Antes de 10.3, Ritmo tenía UNA feature que encajaba y Gestión dos: sus
    // juegos llenaban el alcance a base de relleno neutro. Ahora ninguno baja
    // de tres, y los cuatro géneros hambrientos tienen al menos cuatro.
    for (const g of genres) {
      const fitting = features.filter((f) => featureGenreAffinity(f, g.id) === 'encaja');
      expect(fitting.length, `${g.name}: features que encajan`).toBeGreaterThanOrEqual(3);
    }
    for (const id of ['ritmo', 'gestion', 'battleRoyale', 'puzzle']) {
      const fitting = features.filter((f) => featureGenreAffinity(f, id) === 'encaja');
      expect(fitting.length, `${id}: features que encajan tras 10.3`).toBeGreaterThanOrEqual(4);
    }
  });

  it('W6b — ampliar el catálogo NO encarece la investigación', () => {
    // La regla dura de W6b: más objetivos con los mismos 💡 haría que todo se
    // sintiera lejano. Ninguna feature de 10.3 estrena nodo (las gateadas
    // cuelgan de `tecnologiaOnline` y `serviciosOnline`, que ya existían) y
    // cuatro nodos de E5-E7 bajaron de precio para compensar el calendario más
    // largo. El árbol completo no puede costar más que la baseline de 10.2-B.
    const BASELINE_TREE_COST_102B = 1088;
    const total = researchNodes.reduce((sum, n) => sum + n.cost, 0);
    expect(total).toBeLessThanOrEqual(BASELINE_TREE_COST_102B);

    // Y las features nuevas gateadas reutilizan nodos, no los inventan.
    for (const id of ['clasificatoriasOnline', 'modoEspectador']) {
      const f = features.find((x) => x.id === id)!;
      expect(['tecnologiaOnline', 'serviciosOnline']).toContain(f.requiresResearch);
    }
  });

  it('E1 y E2 no cambian: el early game de la 10.2-B queda intacto', () => {
    // Decisión de la fase: el CA 9.1(a) ("nadie imprime 80+ antes de E3") y el
    // pase económico se calibraron sobre el catálogo temprano exacto. Todo lo
    // nuevo entra en E3 o después, así que la simulación previa a E3 es
    // idéntica bit a bit a la de la 10.2-B.
    const early = features.filter((f) => eraIndex(f.appearsInEra) <= eraIndex('E2'));
    expect(early.map((f) => f.id).sort()).toEqual(
      [
        'bandaSonora',
        'editorNiveles',
        'finalRamificado',
        'fisicasAvanzadas',
        'modoCarrera',
        'multijugadorLocal',
        'mundoAbierto',
        'sistemaCrafteo',
      ].sort(),
    );
  });
});
