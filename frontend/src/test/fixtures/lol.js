// Datos INVENTADOS para los tests. Ningún nombre ni Riot ID es real.

export const AHORA = Date.UTC(2026, 9, 1, 18, 0, 0); // 1 oct 2026, 18:00 UTC
const HORA = 3600 * 1000;

export const ddragon = {
  version: "16.1.1",
  campeones: {
    1: { id: "Annie", nombre: "Annie" },
    22: { id: "Ashe", nombre: "Ashe" },
    99: { id: "Lux", nombre: "Lux" },
    103: { id: "Ahri", nombre: "Ahri" },
    21: { id: "MissFortune", nombre: "Miss Fortune" },
    12: { id: "Alistar", nombre: "Alistar" },
    32: { id: "Amumu", nombre: "Amumu" },
    51: { id: "Caitlyn", nombre: "Caitlyn" },
    54: { id: "Malphite", nombre: "Malphite" },
    86: { id: "Garen", nombre: "Garen" },
  },
  hechizos: {
    4: { id: "SummonerFlash", nombre: "Destello" },
    14: { id: "SummonerDot", nombre: "Incendiar" },
  },
  items: {
    1001: { nombre: "Botas" },
    3340: { nombre: "Amuleto de Vigilancia" },
    6655: { nombre: "Tormenta de Luden" },
  },
  runas: {
    8112: { nombre: "Electrocutar", icono: "perk-images/Styles/Domination/Electrocute/Electrocute.png" },
    8000: { nombre: "Precisión", icono: "perk-images/Styles/7201_Precision.png" },
  },
};

function participantes() {
  return [
    { campeon_id: 103, equipo: 100, nombre: "Rana Azul#LAS", amigo: "rana-azul-las" },
    { campeon_id: 22, equipo: 100, nombre: "Sapito#LAS", amigo: "sapito-las" },
    { campeon_id: 12, equipo: 100, nombre: "Desconocido Uno#AAA", amigo: null },
    { campeon_id: 32, equipo: 100, nombre: null, amigo: null },
    { campeon_id: 51, equipo: 100, nombre: "Desconocido Dos#BBB", amigo: null },
    { campeon_id: 54, equipo: 200, nombre: "Rival Uno#CCC", amigo: null },
    { campeon_id: 86, equipo: 200, nombre: "Rival Dos#DDD", amigo: null },
    { campeon_id: 1, equipo: 200, nombre: "Rival Tres#EEE", amigo: null },
    { campeon_id: 99, equipo: 200, nombre: "Rival Cuatro#FFF", amigo: null },
    { campeon_id: 21, equipo: 200, nombre: "Rival Cinco#GGG", amigo: null },
  ];
}

export const partidaCompleta = {
  id: "LA2_1",
  fecha: AHORA - 18 * HORA,
  queue_id: 400,
  campeon: "Ahri",
  campeon_id: 103,
  resultado: "derrota",
  asesinatos: 17,
  muertes: 6,
  asistencias: 3,
  duracion: 31 * 60 + 4,
  modo: "Normal (Reclutamiento)",
  categoria: "normal",
  nivel: 17,
  cs: 177,
  participacion: 65,
  equipo: 100,
  items: [6655, 1001, 0, 0, 0, 0, 3340],
  hechizos: [4, 14],
  runas: { principal: 8112, secundaria: 8000 },
  participantes: participantes(),
};

export const partidaRanked = {
  id: "LA2_2",
  fecha: AHORA - 26 * HORA,
  queue_id: 420,
  campeon: "Lux",
  campeon_id: 99,
  resultado: "victoria",
  asesinatos: 5,
  muertes: 0,
  asistencias: 12,
  duracion: 25 * 60,
  modo: "Clasificatoria Solo/Dúo",
  categoria: "ranked",
};

export const partidaAram = {
  id: "LA2_3",
  fecha: AHORA - 50 * HORA,
  queue_id: 450,
  campeon: "Ashe",
  campeon_id: 22,
  resultado: "remake",
  asesinatos: 0,
  muertes: 0,
  asistencias: 0,
  duracion: 190,
  modo: "ARAM",
  categoria: "aram",
};

const estadisticasRana = {
  total: { partidas: 3, victorias: 1, derrotas: 1, remakes: 1, winrate: 50 },
  por_categoria: {
    ranked: { partidas: 1, victorias: 1, derrotas: 0, remakes: 0, winrate: 100 },
    normal: { partidas: 1, victorias: 0, derrotas: 1, remakes: 0, winrate: 0 },
    aram: { partidas: 1, victorias: 0, derrotas: 0, remakes: 1, winrate: null },
    otros: { partidas: 0, victorias: 0, derrotas: 0, remakes: 0, winrate: null },
  },
  por_modo: [
    { queue_id: 400, nombre: "Normal (Reclutamiento)", categoria: "normal", partidas: 1, victorias: 0, derrotas: 1, remakes: 0, winrate: 0 },
    { queue_id: 420, nombre: "Clasificatoria Solo/Dúo", categoria: "ranked", partidas: 1, victorias: 1, derrotas: 0, remakes: 0, winrate: 100 },
    { queue_id: 450, nombre: "ARAM", categoria: "aram", partidas: 1, victorias: 0, derrotas: 0, remakes: 1, winrate: null },
  ],
};

export function crearDatos(cambios = {}) {
  return {
    version: 1,
    actualizado: new Date(AHORA - 12 * 60 * 1000).toISOString(),
    ddragon,
    en_vivo: [],
    amigos: [
      {
        riot_id: "Rana Azul#LAS",
        nombre: "Rana Azul",
        tag: "LAS",
        slug: "rana-azul-las",
        estado: "ok",
        error: null,
        seguimiento_desde: Date.UTC(2026, 8, 12, 12),
        perfil: { icono: 29, nivel: 312 },
        rangos: {
          solo: { tier: "PLATINUM", division: "IV", lp: 45, victorias: 30, derrotas: 25 },
          flex: null,
        },
        jugando: null,
        estadisticas: estadisticasRana,
        partidas: [partidaCompleta, partidaRanked, partidaAram],
      },
      {
        riot_id: "Sapito#LAS",
        nombre: "Sapito",
        tag: "LAS",
        slug: "sapito-las",
        estado: "ok",
        error: null,
        seguimiento_desde: Date.UTC(2026, 8, 12, 12),
        perfil: { icono: 7, nivel: 88 },
        rangos: { solo: null, flex: { tier: "GOLD", division: "II", lp: 10, victorias: 4, derrotas: 6 } },
        jugando: null,
        estadisticas: {
          total: { partidas: 0, victorias: 0, derrotas: 0, remakes: 0, winrate: null },
          por_categoria: {},
          por_modo: [],
        },
        partidas: [],
      },
      {
        riot_id: "Charco#LAS",
        nombre: "Charco",
        tag: "LAS",
        slug: "charco-las",
        estado: "error",
        error: "Riot ID no encontrado",
        seguimiento_desde: null,
        perfil: null,
        rangos: { solo: null, flex: null },
        jugando: null,
        estadisticas: null,
        partidas: [],
      },
    ],
    ranking: [
      { posicion: 1, slug: "rana-azul-las", riot_id: "Rana Azul#LAS", criterio: "rango" },
      { posicion: 2, slug: "sapito-las", riot_id: "Sapito#LAS", criterio: "winrate" },
      { posicion: 3, slug: "charco-las", riot_id: "Charco#LAS", criterio: "winrate" },
    ],
    ...cambios,
  };
}

const RUNAS = { principal: 8112, secundaria: 8000 };

export const partidaEnVivo = {
  id: "LA2_99",
  queue_id: 450,
  modo: "ARAM",
  categoria: "aram",
  inicio: AHORA - 14 * 60 * 1000,
  duracion: 600,
  amigos: ["rana-azul-las", "sapito-las"],
  equipos: [
    {
      equipo: 100,
      bloqueos: [51, 21],
      jugadores: [
        {
          campeon_id: 103,
          equipo: 100,
          nombre: "Rana Azul#LAS",
          amigo: "rana-azul-las",
          hechizos: [4, 14],
          runas: RUNAS,
          rango: { tier: "DIAMOND", division: "IV", lp: 45 },
        },
        { campeon_id: 22, equipo: 100, nombre: null, amigo: "sapito-las", hechizos: [4, 14], runas: RUNAS, rango: null },
        {
          campeon_id: 12,
          equipo: 100,
          nombre: "Desconocido Uno#AAA",
          amigo: null,
          hechizos: [4, 14],
          runas: { principal: null, secundaria: null },
          rango: { tier: "MASTER", division: null, lp: 250 },
        },
      ],
    },
    {
      equipo: 200,
      bloqueos: [],
      jugadores: [
        {
          campeon_id: 54,
          equipo: 200,
          nombre: "Rival Uno#CCC",
          amigo: null,
          hechizos: [4, 14],
          runas: RUNAS,
          rango: { tier: "GOLD", division: "I", lp: 0 },
        },
        { campeon_id: 86, equipo: 200, nombre: null, amigo: null },
      ],
    },
  ],
};
