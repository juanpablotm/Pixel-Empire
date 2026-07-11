import type { CrisisCause, StreamTier } from '../core/model/community';

/**
 * Plantillas del feed de la comunidad y del chat del directo (docs/10 §7.2 y
 * §7.3): texto generado por plantillas + variables, barato y sin IA en
 * runtime. El PRNG solo elige la variante (sabor); el TONO lo decide siempre
 * el estado del juego en core/systems/community.ts.
 *
 * Variables disponibles: {game} {creator} {hashtag}
 */

/** Handles ficticios del muro "Chirp"; el PRNG elige el autor. */
export const feedAuthors: readonly string[] = [
  '@JugonaDelBarrio',
  '@PixelPurista88',
  '@ManduquePlays',
  '@LaTecla_Rota',
  '@ComboBreakerES',
  '@NoemiRespawn',
  '@ElChavalDelCable',
  '@Save_Scummer',
  '@TurboAbuela',
  '@CriticonAmargado',
];

export interface PostTemplates {
  positivo: readonly string[];
  negativo: readonly string[];
  neutro: readonly string[];
}

/** Posts ambientales según la banda del termómetro de sentimiento. */
export const ambientPosts: PostTemplates = {
  positivo: [
    'Este estudio sí que nos escucha. Ojalá todos fueran así.',
    'Pocas veces he visto una comunidad tan a gusto. Se nota el cariño.',
    'Día bueno para ser fan de este estudio. Sin más.',
  ],
  negativo: [
    'El ambiente en el foro está irrespirable, y con razón.',
    'Cada semana nos dan un motivo nuevo para desconfiar.',
    'Yo ya no me creo nada de lo que anuncie esta gente.',
  ],
  neutro: [
    'A ver qué se traen entre manos esta semana.',
    'Semana tranquila en el foro. Demasiado tranquila…',
    'Alguien sabe algo del próximo juego? Aquí se aburre una.',
  ],
};

/** Reacción del feed a un lanzamiento, por tramo de reseña visible. */
export const releasePosts: Record<'hit' | 'ok' | 'flop', readonly string[]> = {
  hit: [
    '«{game}» es EXACTAMENTE lo que pedíamos. Bravo. 👏',
    'Llevo todo el finde con «{game}» y no pienso salir de casa.',
    'GOTY. No acepto discusión: «{game}».',
  ],
  ok: [
    '«{game}» está… bien. Sin más. Esperaba otra cosa.',
    'Le doy un aprobado a «{game}», pero de aquí no pasa.',
    '«{game}» cumple. Ni fu ni fa.',
  ],
  flop: [
    '«{game}» es un chiste. Y de los malos.',
    'Quién aprobó lanzar «{game}» así? En serio.',
    'Pedí el reembolso de «{game}» a los 20 minutos.',
  ],
};

/** El feed reacciona a las palancas de codicia/integridad al lanzar (docs/06 §2). */
export const leverPosts: Record<
  'lootboxes' | 'mtx' | 'dayOneDLC' | 'abusivePrice' | 'generousPrice' | 'honest',
  readonly string[]
> = {
  lootboxes: [
    'Loot boxes en «{game}». Un casino con mando, lo que faltaba.',
    'Las cajitas de «{game}» huelen a tragaperras desde la puerta.',
  ],
  mtx: [
    'La tienda de «{game}» pide más dinero que el juego entero.',
    'Pay-to-win en «{game}»? Ahí os quedáis.',
  ],
  dayOneDLC: [
    'DLC el día uno en «{game}». Nos venden el juego a trozos.',
    'Lo que recortaron de «{game}» te lo venden aparte. De traca.',
  ],
  abusivePrice: [
    'Habéis visto el precio de «{game}»? JA. JA. JA.',
    'A ese precio, «{game}» viene con hipoteca incluida.',
  ],
  generousPrice: [
    'El precio de «{game}» es un regalo. Así da gusto.',
    'Por lo que cuesta «{game}», es de cajón comprarlo. Chapó.',
  ],
  honest: [
    'Juego completo, sin tiendas ni trampas: «{game}». Como debe ser.',
    '«{game}» sale entero y a precio justo. Tomad nota, industria.',
  ],
};

/** El directo salió bien/regular/mal (docs/07 §3). */
export const streamPosts: Record<StreamTier, readonly string[]> = {
  exito: [
    '{creator} lleva 3 horas con «{game}» y esto es una fiesta. 🔥',
    'El directo de {creator} con «{game}» me ha vendido el juego. Comprado.',
  ],
  tibio: [
    '{creator} probó «{game}» y se le veía el aburrimiento en la cara.',
    'Media hora de «{game}» en el canal de {creator} y cambió de juego. Mal asunto.',
  ],
  desastre: [
    'El mal rato de {creator} con «{game}» es lo mejor que he visto este mes. Y lo peor para el estudio.',
    '{creator} poniendo a caldo «{game}» en directo. Merecido, todo sea dicho.',
  ],
};

/** El clip del bug en directo (docs/10 §7.2: sello "CLIP'D"). */
export const liveBugPosts: readonly string[] = [
  'EL BUG de «{game}» en el directo de {creator} JAJAJA no puedo respirar {hashtag}',
  'Clip del bug de «{game}» con {creator}: 2 millones de visitas y subiendo {hashtag}',
];

/** Posts de crisis por causa (la manguera roja del feed, docs/10 §7.3). */
export const crisisPosts: Record<CrisisCause, readonly string[]> = {
  lootboxes: [
    'Boicot a las cajas de este estudio. Se acabó. {hashtag}',
    'Mi dinero no vuelve hasta que quiten el casino. {hashtag}',
  ],
  mtxAgresivas: [
    'La tienda in-game es un atraco y lo sabéis. {hashtag}',
    'Reseña negativa dejada. A ver si así aprenden. {hashtag}',
  ],
  dayOneDLC: [
    'El juego COMPLETO o nada. {hashtag}',
    'Día uno y ya con la mano en mi cartera. Vergüenza. {hashtag}',
  ],
  precioAbusivo: [
    'A ese precio que lo compre el consejo de administración. {hashtag}',
    'Bajad el precio y hablamos. {hashtag}',
  ],
  crunch: [
    'Detrás de cada retraso evitado hay gente rota. {hashtag}',
    'No quiero juegos hechos a base de madrugadas forzadas. {hashtag}',
  ],
  refrito: [
    'Es el mismo juego con otro sombrero. OTRA VEZ. {hashtag}',
    'Copiar-pegar y a cobrar. Así no. {hashtag}',
  ],
  bugEnDirecto: [
    'Si el juego se rompe EN EL DIRECTO, imagina en tu casa. {hashtag}',
    'Mandaron ESO a los creadores sin probarlo. Increíble. {hashtag}',
  ],
  promesaRota: [
    'Esto NO es lo que enseñaron en los tráilers. {hashtag}',
    'Nos vendieron humo y encima caro. {hashtag}',
  ],
};

/** Reacciones del feed a la respuesta del estudio ante una crisis. */
export const responsePosts: Record<
  'disculpa' | 'corporativo' | 'culpar' | 'culparBackfire' | 'revertir' | 'amaina' | 'pudre',
  readonly string[]
> = {
  disculpa: [
    'Disculpa clara y compensación. Así se hace. Punto para el estudio.',
    'Errar es humano; rectificar con parche gratis, también. Aceptada.',
  ],
  corporativo: [
    '"Lamentamos si alguien se sintió ofendido…" — el comunicado de siempre. 🙄',
    'Tres párrafos de PR para no decir NADA.',
  ],
  culpar: [
    'Ahora resulta que la culpa es de los jugadores. Claro que sí.',
    'Negándolo todo. Apunten esta también.',
  ],
  culparBackfire: [
    'MINTIERON. Hay pruebas. Esto ya no hay quien lo arregle.',
    'La negación duró lo que tardó en salir la verdad. Vergonzoso.',
  ],
  revertir: [
    'LO HAN QUITADO. La presión funciona, señores. Victoria de la comunidad.',
    'Rectificar es de sabios: decisión revertida. Ahora sí.',
  ],
  amaina: [
    'Al final tampoco era para tanto. Este estudio tiene crédito ganado.',
    'Se les perdona por esta vez. El historial pesa.',
  ],
  pudre: [
    'El silencio del estudio lo dice todo. TODO.',
    'Ni una palabra. Así confirman lo que ya sabíamos.',
  ],
};

/** Posts de los dilemas de pre-lanzamiento (docs/07 §4). */
export const dilemmaPosts: Record<
  'leak' | 'leakTransparencia' | 'leakCapitalizar' | 'sobreHypePrometer',
  readonly string[]
> = {
  leak: [
    'FILTRADA una alpha de «{game}»!! corred antes de que la tumben',
    'La build filtrada de «{game}» ya está en todos lados. Madre mía.',
  ],
  leakTransparencia: [
    'El estudio da la cara con la filtración de «{game}». Transparencia se agradece.',
    'Comunicado honesto sobre el leak de «{game}». Bien jugado.',
  ],
  leakCapitalizar: [
    'El estudio le saca partido al leak de «{game}»… listillos. Más les vale cumplir.',
    'Convertir la filtración de «{game}» en marketing: jugada arriesgada.',
  ],
  sobreHypePrometer: [
    'Lo que están prometiendo con «{game}» es DEMASIADO bonito. Que no nos mientan.',
    'El marketing de «{game}» promete la luna. Apunten mis dudas.',
  ],
};

/** Líneas de chat del Directo del streamer (docs/10 §7.2), por resultado. */
export const streamChatLines: Record<StreamTier, readonly string[]> = {
  exito: [
    'ESTO ES BUENÍSIMO',
    'clip it! CLIP IT!',
    'compradísimo, lo juro',
    'no puede parar de jugar jajaja',
    'GG el estudio, GG',
  ],
  tibio: [
    'zzz…',
    'cambia de juego porfa',
    'tiene… potencial? supongo',
    'meh',
    'a qué hora el sorteo?',
  ],
  desastre: [
    'JAJAJAJAJAJA',
    'esto lo probó alguien antes de salir??',
    'F por el estudio',
    'reembolso SPEEDRUN',
    'el juego es el bug',
  ],
};

/** Líneas extra del chat cuando salta el bug en directo (sello CLIP'D). */
export const liveBugChatLines: readonly string[] = [
  'CLIP\'D 📎',
  'EL BUG JAJAJAJA',
  'se rompió EN DIRECTO',
  'esto va directo a viral',
  'QA? conocemos?',
];
