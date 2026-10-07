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
    11: { id: "MasterYi", nombre: "Maestro Yi" },
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
          rango: { tier: "DIAMOND", division: "IV", lp: 45, victorias: 70, derrotas: 50, winrate: 58.3, racha: true },
          maestria: { nivel: 7, puntos: 150000 },
        },
        {
          campeon_id: 22,
          equipo: 100,
          nombre: null,
          amigo: "sapito-las",
          hechizos: [4, 14],
          runas: RUNAS,
          rango: null,
          maestria: null,
        },
        {
          campeon_id: 12,
          equipo: 100,
          nombre: "Desconocido Uno#AAA",
          amigo: null,
          hechizos: [4, 14],
          runas: { principal: null, secundaria: null },
          rango: { tier: "MASTER", division: null, lp: 250, victorias: 40, derrotas: 60, winrate: null, racha: false },
          maestria: { nivel: 0, puntos: 0 },
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

/** Destacados de hoy, de la semana y del mes INVENTADOS, con la forma que escribe el recolector. */
export function crearDestacados(cambios = {}) {
  return {
    // Inicio de la semana (lunes a la 01:00 de Chile), inventado.
    semana_desde: AHORA - 4 * 24 * HORA,
    // Inicio del "día" de los destacados de hoy (las 12:00 de Chile), inventado.
    hoy_desde: AHORA - 5 * HORA,
    mas_partidas: { amigos: ["rana-azul-las", "sapito-las"], partidas: 20 },
    mejor_winrate: { amigos: ["sapito-las"], winrate: 62.5, victorias: 5, derrotas: 3, partidas: 8 },
    mejor_jugador_hoy: {
      amigos: ["sapito-las"],
      partida_id: "LA2_77",
      campeon_id: 11,
      campeon: "MasterYi",
      asesinatos: 11,
      muertes: 2,
      asistencias: 8,
      kda: 9.5,
      danio: 32450,
      resultado: "derrota",
      modo: "Clasificatoria Flex",
      fecha: AHORA - 2 * HORA,
    },
    // Rachas en equipo. Las fechas son locales para que el día no dependa de la zona horaria.
    racha_victorias_grupo: {
      racha: 4,
      amigos: ["sapito-las", "rana-azul-las"],
      partidas: { "sapito-las": 4, "rana-azul-las": 3 },
      desde: new Date(2026, 8, 30, 21, 0).getTime(),
      hasta: new Date(2026, 9, 1, 1, 30).getTime(),
    },
    // Charco se sumó solo a la última partida: lleva la nota «(1 partida)».
    racha_derrotas_grupo: {
      racha: 3,
      amigos: ["rana-azul-las", "sapito-las", "charco-las"],
      partidas: { "rana-azul-las": 3, "sapito-las": 3, "charco-las": 1 },
      desde: new Date(2026, 9, 1, 10, 0).getTime(),
      hasta: new Date(2026, 9, 1, 12, 0).getTime(),
    },
    peor_jugador_hoy: {
      amigos: ["rana-azul-las"],
      partida_id: "LA2_99",
      campeon_id: 1,
      campeon: "Annie",
      asesinatos: 0,
      muertes: 4,
      asistencias: 0,
      kda: 0.0,
      danio: 4180,
      resultado: "victoria",
      modo: "Normal (Reclutamiento)",
      fecha: AHORA - 4 * HORA,
    },
    // Partidas en grupo de hoy: cada una cuenta una vez.
    balance_hoy: {
      partidas: 6,
      victorias: 4,
      derrotas: 2,
      winrate: 66.7,
      amigos: ["sapito-las", "rana-azul-las", "charco-las"],
      jugadas: { "sapito-las": 6, "rana-azul-las": 6, "charco-las": 4 },
    },
    // Mejor y peor jugador de la semana: misma forma que los de hoy, otras partidas.
    mejor_jugador_semana: {
      amigos: ["charco-las"],
      partida_id: "LA2_55",
      campeon_id: 103,
      campeon: "Ahri",
      asesinatos: 15,
      muertes: 1,
      asistencias: 9,
      kda: 24,
      danio: 41200,
      resultado: "victoria",
      modo: "Clasificatoria Solo/Dúo",
      fecha: AHORA - 3 * 24 * HORA,
    },
    peor_jugador_semana: {
      amigos: ["sapito-las"],
      partida_id: "LA2_44",
      campeon_id: 22,
      campeon: "Ashe",
      asesinatos: 1,
      muertes: 9,
      asistencias: 2,
      kda: 0.33,
      danio: 6050,
      resultado: "derrota",
      modo: "Normal (Selección oculta)",
      fecha: AHORA - 6 * 24 * HORA,
    },
    // Mes en curso (octubre de 2026, del día 1 a la 01:00 de Chile al 1 de noviembre), inventado.
    mes: {
      anio: 2026,
      mes: 10,
      nombre: "octubre",
      desde: Date.UTC(2026, 9, 1, 4),
      hasta: Date.UTC(2026, 10, 1, 4),
      cerrado: false,
    },
    mejor_jugador_mes: {
      amigos: ["rana-azul-las"],
      partida_id: "LA2_33",
      campeon_id: 51,
      campeon: "Caitlyn",
      asesinatos: 18,
      muertes: 2,
      asistencias: 6,
      kda: 12,
      danio: 52300,
      resultado: "victoria",
      modo: "Clasificatoria Flex",
      fecha: AHORA - 6 * HORA,
    },
    // Partidas en equipo del mes: cada una cuenta una vez.
    balance_mes: {
      partidas: 28,
      victorias: 15,
      derrotas: 13,
      winrate: 53.6,
      amigos: ["sapito-las", "rana-azul-las", "charco-las"],
      jugadas: { "sapito-las": 28, "rana-azul-las": 25, "charco-las": 9 },
    },
    peor_jugador_mes: {
      amigos: ["charco-las"],
      partida_id: "LA2_22",
      campeon_id: 54,
      campeon: "Malphite",
      asesinatos: 0,
      muertes: 11,
      asistencias: 3,
      kda: 0.27,
      danio: 3900,
      resultado: "derrota",
      modo: "Normal (Reclutamiento)",
      fecha: AHORA - 7 * HORA,
    },
    ...cambios,
  };
}

// Sinergia INVENTADA (lol.json → "sinergia"). Usa un cuarto amigo, `renacuajo`.
export const renacuajo = {
  riot_id: "Renacuajo#LAS",
  nombre: "Renacuajo",
  tag: "LAS",
  slug: "renacuajo-las",
  estado: "ok",
  error: null,
  perfil: { icono: 11, nivel: 40 },
  rangos: { solo: { tier: "EMERALD", division: "II", lp: 12, victorias: 20, derrotas: 18 }, flex: null },
  jugando: null,
  estadisticas: null,
  partidas: [],
};

const filaSinergia = (amigo, partidas, victorias, derrotas, winrate) => ({
  amigo,
  partidas,
  victorias,
  derrotas,
  winrate,
});

/** Sinergia en el formato nuevo: { ultimos_30_dias, todo }. */
export function crearSinergia(cambios = {}) {
  return {
    ultimos_30_dias: {
      "rana-azul-las": [filaSinergia("sapito-las", 6, 2, 4, 33.3), filaSinergia("renacuajo-las", 4, 3, 1, 75)],
      "sapito-las": [],
    },
    todo: {
      "rana-azul-las": [
        filaSinergia("sapito-las", 12, 5, 7, 41.7),
        filaSinergia("renacuajo-las", 8, 6, 2, 75),
        filaSinergia("charco-las", 3, 2, 1, null),
        filaSinergia("desconocido-las", 99, 50, 49, 50.5),
      ],
      "sapito-las": [],
    },
    ...cambios,
  };
}

// Tops de los destacados INVENTADOS (lol.json → "destacados.tops"). Usan cinco amigos:
// los tres de `crearDatos`, `renacuajo` y `pozo`.
export const pozo = { ...renacuajo, riot_id: "Pozo#LAS", nombre: "Pozo", slug: "pozo-las", perfil: { icono: 12, nivel: 9 } };

/** Amigos para los tops: los de `crearDatos` más renacuajo y pozo. */
export const AMIGOS_TOPS = [...crearDatos().amigos, renacuajo, pozo];

/** Una partida de un top: la de un amigo con un campeón y un KDA inventados. */
export function partidaTop(slug, campeon_id, campeon, asesinatos, muertes, asistencias, resultado, cambios = {}) {
  return {
    amigos: [slug],
    partida_id: `LA2_${campeon_id}`,
    campeon_id,
    campeon,
    asesinatos,
    muertes,
    asistencias,
    kda: Math.round(((asesinatos + asistencias) / Math.max(1, muertes)) * 100) / 100,
    danio: 10000 + asesinatos * 1000,
    resultado,
    modo: "Clasificatoria Solo/Dúo",
    fecha: AHORA - 3 * HORA,
    ...cambios,
  };
}

/** Un récord de un amigo en un top. */
export const recordTop = (slug, victorias, derrotas) => ({
  amigos: [slug],
  partidas: victorias + derrotas,
  victorias,
  derrotas,
  winrate: Math.round((victorias / (victorias + derrotas)) * 1000) / 10,
});

/** Los tops completos, ya ordenados como los manda el recolector. */
export function crearTops(cambios = {}) {
  const mejores = [
    partidaTop("charco-las", 103, "Ahri", 15, 1, 9, "victoria"),
    partidaTop("sapito-las", 11, "MasterYi", 12, 2, 4, "victoria"),
    partidaTop("rana-azul-las", 51, "Caitlyn", 9, 3, 7, "derrota"),
    partidaTop("renacuajo-las", 22, "Ashe", 6, 3, 5, "victoria"),
    partidaTop("pozo-las", 1, "Annie", 4, 4, 4, "derrota", { danio: null }),
  ];
  const peores = [...mejores].reverse().map((p) => ({ ...p, resultado: "derrota" }));
  const records = [
    recordTop("sapito-las", 3, 1),
    recordTop("rana-azul-las", 2, 2),
    recordTop("charco-las", 1, 2),
    recordTop("renacuajo-las", 1, 3),
    recordTop("pozo-las", 0, 2),
  ];
  const masPartidas = [
    recordTop("rana-azul-las", 12, 8),
    recordTop("sapito-las", 6, 4),
    recordTop("charco-las", 2, 3),
    recordTop("renacuajo-las", 1, 1),
    recordTop("pozo-las", 0, 1),
  ];
  return {
    mejor_jugador_hoy: mejores,
    peor_jugador_hoy: peores,
    balance_hoy: records,
    mas_partidas: masPartidas,
    mejor_winrate: records,
    mejor_jugador_semana: mejores,
    peor_jugador_semana: peores,
    mejor_jugador_mes: mejores,
    peor_jugador_mes: peores,
    balance_mes: records,
    ...cambios,
  };
}

/**
 * Tops globales INVENTADOS (lol.json → "destacados.tops_global"): las mejores/peores partidas
 * del período, ya ordenadas, con Charco repetido (dos partidas en distinto modo y fecha).
 */
export function crearTopsGlobal(cambios = {}) {
  const mejores = [
    partidaTop("charco-las", 103, "Ahri", 15, 1, 9, "victoria"),
    partidaTop("charco-las", 104, "Akali", 14, 1, 8, "victoria", { modo: "ARAM", fecha: AHORA - 5 * HORA }),
    partidaTop("sapito-las", 11, "MasterYi", 12, 2, 4, "victoria"),
    partidaTop("rana-azul-las", 51, "Caitlyn", 9, 3, 7, "derrota"),
    partidaTop("renacuajo-las", 22, "Ashe", 6, 3, 5, "victoria"),
  ];
  const peores = [...mejores].reverse().map((p) => ({ ...p, resultado: "derrota" }));
  return {
    mejor_jugador_hoy: mejores,
    peor_jugador_hoy: peores,
    mejor_jugador_semana: mejores,
    peor_jugador_semana: peores,
    mejor_jugador_mes: mejores,
    peor_jugador_mes: peores,
    ...cambios,
  };
}
