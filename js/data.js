/**
 * Original 50 galaxies and the eight Cosmos worlds.
 * Routes are relative and lead to preexisting first-party pages.
 * Keep the five-signature by ten-station canon in this single source.
 */
export const SIGNATURES = Object.freeze([
  { id: 'pedro', code: 'PEDRO.SIG', name: 'PEDRO', title: 'LA ROCA', color: '#FFD700', trait: 'permanencia', glyph: '◆' },
  { id: 'marcos', code: 'MARCOS.SIG', name: 'MARCOS', title: 'EL CRONISTA', color: '#00FFFF', trait: 'memoria', glyph: '◇' },
  { id: 'santos', code: 'SANTOS.SIG', name: 'SANTOS', title: 'LA ANTENA', color: '#B026FF', trait: 'recepción', glyph: '✧' },
  { id: 'belentani', code: 'BELENTANI.SIG', name: 'BELENTANI', title: 'NÚCLEO', color: '#FF003C', trait: 'integración', glyph: '◉' },
  { id: 'human', code: 'HUMAN.SIG', name: 'THE HUMAN', title: 'INTERFAZ', color: '#F5F5F5', trait: 'presencia', glyph: '○' }
]);

export const STATIONS = Object.freeze([
  { id: 'entre', title: { pt: 'O ENTRE', es: 'EL ENTRE', en: 'THE BETWEEN', ca: "L'ENTRE" }, bpm: 18.75, beat: 3.2, phase: 'NEON' },
  { id: 'deuda', title: { pt: 'A DÍVIDA', es: 'LA DEUDA', en: 'THE DEBT', ca: 'EL DEUTE' }, bpm: 21.43, beat: 2.8, phase: 'MATRIX' },
  { id: 'robo', title: { pt: 'O ROUBO', es: 'EL ROBO', en: 'THE THEFT', ca: 'EL ROBATORI' }, bpm: 25, beat: 2.4, phase: 'VENOM' },
  { id: 'canto', title: { pt: 'O CANTO', es: 'EL CANTO', en: 'THE SONG', ca: 'EL CANT' }, bpm: 30, beat: 2.0, phase: 'VOID' },
  { id: 'victoria', title: { pt: 'A VITÓRIA AMARGA', es: 'LA VICTORIA AMARGA', en: 'THE BITTER VICTORY', ca: 'LA VICTÒRIA AMARGA' }, bpm: 33.33, beat: 1.8, phase: 'ASCENDED' },
  { id: 'mentira', title: { pt: 'A MENTIRA PARTILHADA', es: 'LA MENTIRA COMPARTIDA', en: 'THE SHARED LIE', ca: 'LA MENTIDA COMPARTIDA' }, bpm: 37.5, beat: 1.6, phase: 'ASCENDED' },
  { id: 'umbral', title: { pt: 'O LIMIAR', es: 'EL UMBRAL', en: 'THE THRESHOLD', ca: 'EL LLINDAR' }, bpm: 42.86, beat: 1.4, phase: 'VOID' },
  { id: 'senal', title: { pt: 'O SINAL', es: 'LA SEÑAL', en: 'THE SIGNAL', ca: 'EL SENYAL' }, bpm: 50, beat: 1.2, phase: 'VENOM' },
  { id: 'portal', title: { pt: 'O PORTAL', es: 'EL PORTAL', en: 'THE PORTAL', ca: 'EL PORTAL' }, bpm: 60, beat: 1.0, phase: 'MATRIX' },
  { id: 'constelacion', title: { pt: 'A CONSTELAÇÃO', es: 'LA CONSTELACIÓN', en: 'THE CONSTELLATION', ca: 'LA CONSTEL·LACIÓ' }, bpm: 66.67, beat: .9, phase: 'NEON' }
]);

export const WORLDS = Object.freeze([
  { id: 'galaxy', number: '01', kind: 'INFINITE NEBULA', title: { pt: 'A GALÁXIA', es: 'LA GALAXIA', en: 'THE GALAXY', ca: 'LA GALÀXIA' }, hero: ['THE', 'VOID'], essence: { pt: 'O universo não está vazio. Está à espera da primeira voz.', es: 'El universo no está vacío. Espera la primera voz.', en: 'The universe is not empty. It awaits the first voice.', ca: "L'univers no és buit. Espera la primera veu." }, facts: [['SIGNAL', 'JUDAS-CORE-07'], ['FREQUENCY', '432 HZ'], ['SECTOR', 'OMEGA / ZION']], accent: '#ff003c', glyph: '✦' },
  { id: 'planets', number: '02', kind: 'PROCEDURAL WORLDS', title: { pt: 'OS PLANETAS', es: 'LOS PLANETAS', en: 'THE PLANETS', ca: 'ELS PLANETES' }, hero: ['LIVING', 'WORLDS'], essence: { pt: 'Cinco órbitas, cinco assinaturas, o mesmo centro de gravidade.', es: 'Cinco órbitas, cinco firmas, el mismo centro de gravedad.', en: 'Five orbits, five signatures, the same centre of gravity.', ca: 'Cinc òrbites, cinc signatures, el mateix centre de gravetat.' }, facts: [['ORBITAL NODES', '05'], ['FORMATION', 'PROCEDURAL'], ['LORE', 'ZION']], accent: '#ff8d5c', glyph: '◉' },
  { id: 'blackhole', number: '03', kind: 'EVENT HORIZON', title: { pt: 'O BURACO NEGRO', es: 'EL AGUJERO NEGRO', en: 'THE BLACK HOLE', ca: 'EL FORAT NEGRE' }, hero: ['EVENT', 'HORIZON'], essence: { pt: 'Nem toda ausência é derrota. Alguns abismos guardam respostas.', es: 'No toda ausencia es derrota. Algunos abismos guardan respuestas.', en: 'Not every absence is defeat. Some abysses hold answers.', ca: 'No tota absència és derrota. Alguns abismes guarden respostes.' }, facts: [['GRAVITY', 'SIMULATED'], ['LIGHT', 'BENT'], ['THRESHOLD', 'UNSTABLE']], accent: '#ff5164', glyph: '◎' },
  { id: 'ocean', number: '04', kind: 'SPECTRAL OCEAN', title: { pt: 'O OCEANO', es: 'EL OCÉANO', en: 'THE OCEAN', ca: "L'OCEÀ" }, hero: ['THE', 'DEEP'], essence: { pt: 'A memória move-se como água. Nunca regressa idêntica.', es: 'La memoria se mueve como el agua. Nunca vuelve idéntica.', en: 'Memory moves like water. It never returns unchanged.', ca: "La memòria es mou com l'aigua. Mai no torna igual." }, facts: [['WAVES', 'GERSTNER'], ['DEPTH', 'UNKNOWN'], ['REFLECTION', 'DYNAMIC']], accent: '#65f7ff', glyph: '≈' },
  { id: 'aurora', number: '05', kind: 'POLAR ATMOSPHERE', title: { pt: 'A AURORA', es: 'LA AURORA', en: 'THE AURORA', ca: "L'AURORA" }, hero: ['SKIN OF', 'LIGHT'], essence: { pt: 'A luz não apaga o escuro. Aprende a atravessá-lo.', es: 'La luz no borra la oscuridad. Aprende a atravesarla.', en: 'Light does not erase darkness. It learns to cross it.', ca: "La llum no esborra la foscor. Aprèn a travessar-la." }, facts: [['ALTITUDE', 'THERMOSPHERE'], ['PARTICLES', 'ENERGIZED'], ['CURTAIN', 'PROCEDURAL']], accent: '#68e0be', glyph: '〰' },
  { id: 'clouds', number: '06', kind: 'VOLUMETRIC CLOUDS', title: { pt: 'AS NUVENS', es: 'LAS NUBES', en: 'THE CLOUDS', ca: 'ELS NÚVOLS' }, hero: ['ABOVE THE', 'STORM'], essence: { pt: 'Na altitude, até as cicatrizes projetam sombra.', es: 'A esa altura, incluso las cicatrices proyectan sombras.', en: 'At this height even scars cast shadows.', ca: 'En aquesta alçada, fins i tot les cicatrius fan ombra.' }, facts: [['VOLUME', 'RAYMARCH'], ['LIGHT', 'SILVER LINING'], ['DENSITY', 'ANIMATED']], accent: '#b4acff', glyph: '☁' },
  { id: 'storm', number: '07', kind: 'ELECTRIC TEMPEST', title: { pt: 'A TEMPESTADE', es: 'LA TORMENTA', en: 'THE STORM', ca: 'LA TEMPESTA' }, hero: ['RED', 'THUNDER'], essence: { pt: 'O céu abre-se. A voz permanece.', es: 'El cielo se rompe. La voz permanece.', en: 'The sky breaks. The voice remains.', ca: 'El cel es trenca. La veu roman.' }, facts: [['RAIN', 'PROCEDURAL'], ['LIGHTNING', 'TEMPORAL'], ['VISIBILITY', 'LOW']], accent: '#a686ff', glyph: 'ϟ' },
  { id: 'solar', number: '08', kind: 'SOLAR COMMAND', title: { pt: 'O SISTEMA SOLAR', es: 'EL SISTEMA SOLAR', en: 'THE SOLAR SYSTEM', ca: 'EL SISTEMA SOLAR' }, hero: ['OMEGA', 'GATE'], essence: { pt: 'A chave não era o poder. A voz nunca pôde ser roubada.', es: 'La llave no era el poder. La voz nunca pudo ser robada.', en: 'The key was not the power. The voice was never stolen.', ca: 'La clau no era el poder. La veu mai no es va poder robar.' }, facts: [['MODE', 'ORBITAL'], ['SYSTEM', 'ZION'], ['GATE', 'OPEN']], accent: '#ffd45c', glyph: '☼' }
]);

export function createGalaxies() {
  const nodes = [];
  for (let signature = 0; signature < SIGNATURES.length; signature++) {
    for (let station = 0; station < STATIONS.length; station++) {
      const number = signature * STATIONS.length + station + 1;
      nodes.push(Object.freeze({
        number,
        id: 'galaxia-' + String(number).padStart(2, '0'),
        signature,
        station,
        phase: STATIONS[station].phase,
        color: SIGNATURES[signature].color,
        path: '../galaxia-' + String(number).padStart(2, '0') + '.html'
      }));
    }
  }
  return Object.freeze(nodes);
}

export const GALAXIES = createGalaxies();

export function galaxyHref(node, language = 'pt') {
  const code = ['pt', 'es', 'en', 'ca'].includes(language) ? language : 'pt';
  return node.path + '?lang=' + code;
}

export function galaxyTitle(node, language = 'pt') {
  return STATIONS[node.station].title[language] ?? STATIONS[node.station].title.pt;
}

export function filterGalaxies(signature = 'all', station = 'all') {
  return GALAXIES.filter(node => {
    const matchesSignature = signature === 'all' || node.signature === Number(signature);
    const matchesStation = station === 'all' || node.station === Number(station);
    return matchesSignature && matchesStation;
  });
}

export function findGalaxy(number) {
  return GALAXIES.find(node => node.number === Number(number)) ?? null;
}

export function findWorld(id) {
  return WORLDS.find(world => world.id === id) ?? null;
}

export function adjacentWorld(id, direction = 1) {
  const index = Math.max(0, WORLDS.findIndex(world => world.id === id));
  return WORLDS[(index + direction + WORLDS.length) % WORLDS.length];
}

export function validateCosmosModel() {
  const errors = [];
  if (SIGNATURES.length !== 5) errors.push('Exactly five signatures are required.');
  if (STATIONS.length !== 10) errors.push('Exactly ten stations are required.');
  if (GALAXIES.length !== 50) errors.push('Exactly fifty galaxy destinations are required.');
  if (WORLDS.length !== 8) errors.push('Exactly eight immersive worlds are required.');
  const urls = new Set(GALAXIES.map(galaxy => galaxy.path));
  if (urls.size !== GALAXIES.length) errors.push('Duplicate original galaxy routes.');
  for (let index = 0; index < GALAXIES.length; index++) {
    if (GALAXIES[index].number !== index + 1) errors.push('Gap in galaxy numbers at ' + index);
  }
  return errors;
}
