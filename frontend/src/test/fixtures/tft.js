// Datos INVENTADOS de TFT para los tests. Ningún nombre, Riot ID ni id de partida es real.
import { AHORA } from "./lol.js";

export { AHORA };
const HORA = 3600 * 1000;
const MIN = 60 * 1000;

export const ddragonTft = {
  version: "99.1.1",
  campeones: {
    TFTX_Renacuajo: { nombre: "Renacuajo", imagen: "TFTX_Renacuajo.TFT_SetX.png", costo: 1 },
    TFTX_Charca: { nombre: "Charca", imagen: "TFTX_Charca.TFT_SetX.png", costo: 4 },
    TFTX_Nenufar: { nombre: "Nenúfar", imagen: "TFTX_Nenufar.TFT_SetX.png", costo: 5 },
  },
  rasgos: {
    TFTX_Anfibio: { nombre: "Anfibio", imagen: "Trait_Icon_X_Anfibio.png" },
    TFTX_Saltarin: { nombre: "Saltarín", imagen: "Trait_Icon_X_Saltarin.png" },
    TFTX_Unico: { nombre: "Rey del Pantano", imagen: "Trait_Icon_X_Rey.png" },
  },
  items: {
    TFTX_Espada: { nombre: "Espada de Caña", imagen: "TFTX_Espada.png" },
    TFTX_Escudo: { nombre: "Escudo de Hoja", imagen: "TFTX_Escudo.png" },
  },
};

function lobby(slugAmigo, nombreAmigo, puestoAmigo, otroAmigo) {
  const nombres = ["Rival Uno#AAA", "Rival Dos#BBB", "Rival Tres#CCC", null, "Rival Cinco#EEE", "Rival Seis#FFF", "Rival Siete#GGG", "Rival Ocho#HHH"];
  return nombres.map((nombre, i) => {
    const puesto = i + 1;
    if (puesto === puestoAmigo) return { nombre: nombreAmigo, puesto, amigo: slugAmigo };
    if (otroAmigo && puesto === otroAmigo.puesto) return { nombre: otroAmigo.nombre, puesto, amigo: otroAmigo.slug };
    return { nombre, puesto, amigo: null };
  });
}

/** Partida con el puesto pedido (1 a 8) para el amigo Croac#LAS. */
export function partidaTft(puesto, cambios = {}) {
  return {
    id: `LA2_TFT_${puesto}`,
    fecha: AHORA - puesto * HORA,
    queue_id: 1100,
    modo: "Clasificatoria",
    categoria: "ranked",
    set: 99,
    duracion: 35 * 60 + 10,
    puesto,
    nivel: 8,
    ronda: 30,
    eliminados: puesto === 1 ? 2 : 0,
    danio: 0,
    unidades: [
      { id: "TFTX_Nenufar", estrellas: 2, rareza: 6, items: ["TFTX_Espada", "TFTX_Escudo", "TFTX_Desconocido"] },
      { id: "TFTX_Charca", estrellas: 3, rareza: 4, items: [] },
      { id: "TFTX_Renacuajo", estrellas: 1, rareza: 0, items: ["TFTX_Espada"] },
    ],
    rasgos: [
      { id: "TFTX_Unico", unidades: 1, estilo: 3, nivel: 1, unico: true },
      { id: "TFTX_Anfibio", unidades: 4, estilo: 4, nivel: 2, unico: false },
      { id: "TFTX_Saltarin", unidades: 2, estilo: 1, nivel: 1, unico: false },
    ],
    participantes: lobby("croac-las", "Croac#LAS", puesto, puesto === 8 ? null : { slug: "renacuaja-las", nombre: "Renacuaja#LAS", puesto: 8 }),
    ...cambios,
  };
}

export const partidaNormalTft = partidaTft(3, {
  id: "LA2_TFT_N",
  queue_id: 1090,
  modo: "Normal",
  categoria: "normal",
  danio: 87,
});

const h = (puesto, modo = "Clasificatoria", categoria = "ranked") => ({ puesto, modo, categoria });

/** Historial de 12 puestos de Croac, del más reciente al más antiguo: 8 rankeds, 3 normales y 1 de Otros. */
export const historialCroac = [
  h(2),
  h(1),
  h(5, "Normal", "normal"),
  h(8),
  h(3, "Dúo dinámico", "otros"),
  h(4),
  h(6),
  h(1, "Normal", "normal"),
  h(7),
  h(2),
  h(4, "Normal", "normal"),
  h(5),
];

export function crearDatosTft(cambios = {}) {
  return {
    version: 1,
    actualizado: new Date(AHORA - 5 * MIN).toISOString(),
    error: null,
    en_vivo_disponible: true,
    ddragon: ddragonTft,
    en_vivo: [],
    amigos: [
      {
        riot_id: "Croac#LAS",
        nombre: "Croac",
        tag: "LAS",
        slug: "croac-las",
        estado: "ok",
        perfil: { icono: 4022, nivel: 834 },
        error: null,
        seguimiento_desde: Date.UTC(2026, 8, 20, 12),
        rangos: {
          ranked: { tier: "PLATINUM", division: "II", lp: 61, top4: 30, partidas: 50, racha: true },
          doble: { tier: "GOLD", division: "I", lp: 12, top4: 6, partidas: 10, racha: false },
          turbo: { tier: "PURPLE", puntos: 3100, top4: 9, partidas: 15 },
        },
        jugando: null,
        estadisticas: {
          total: { partidas: 12, primeros: 2, top4: 7, top4_pct: 58.3, promedio: 3.9 },
          por_modo: [
            { queue_id: 1100, nombre: "Clasificatoria", categoria: "ranked", partidas: 10, primeros: 2, top4: 6, top4_pct: 60, promedio: 3.8 },
            { queue_id: 1090, nombre: "Normal", categoria: "normal", partidas: 2, primeros: 0, top4: 1, top4_pct: 50, promedio: 4.5 },
          ],
        },
        partidas: [partidaTft(1), partidaTft(2), partidaTft(4), partidaTft(5), partidaTft(8), partidaNormalTft],
        historial: historialCroac,
      },
      {
        riot_id: "Renacuaja#LAS",
        nombre: "Renacuaja",
        tag: "LAS",
        slug: "renacuaja-las",
        estado: "ok",
        perfil: null,
        error: null,
        seguimiento_desde: Date.UTC(2026, 8, 20, 12),
        rangos: { ranked: null, doble: null, turbo: null },
        jugando: null,
        estadisticas: { total: { partidas: 0, primeros: 0, top4: 0, top4_pct: null, promedio: null }, por_modo: [] },
        partidas: [],
        historial: [],
      },
      {
        // Archivo viejo: sin el campo historial.
        riot_id: "Lodo#LAS",
        nombre: "Lodo",
        tag: "LAS",
        slug: "lodo-las",
        estado: "error",
        perfil: { icono: 7, nivel: 0 },
        error: "No se pudieron actualizar los datos de este jugador.",
        seguimiento_desde: null,
        rangos: { ranked: { tier: "SILVER", division: "IV", lp: 0, top4: 4, partidas: 10, racha: false }, doble: null, turbo: null },
        jugando: null,
        estadisticas: { total: { partidas: 3, primeros: 0, top4: 1, top4_pct: 33.3, promedio: 5.3 }, por_modo: [] },
        partidas: [],
      },
    ],
    ranking: [
      { posicion: 1, slug: "croac-las", riot_id: "Croac#LAS", criterio: "rango" },
      { posicion: 2, slug: "lodo-las", riot_id: "Lodo#LAS", criterio: "rango" },
      { posicion: 3, slug: "renacuaja-las", riot_id: "Renacuaja#LAS", criterio: "top4" },
    ],
    ...cambios,
  };
}

/** Partida en vivo con Croac y Renacuaja en el mismo lobby; empezó 10 min antes de `actualizadoMs`. */
export function partidaEnVivoTft(actualizadoMs = AHORA - 5 * MIN) {
  return {
    id: 777,
    queue_id: 1100,
    modo: "Clasificatoria",
    categoria: "ranked",
    inicio: actualizadoMs - 10 * MIN,
    duracion: 600,
    amigos: ["croac-las", "renacuaja-las"],
    jugadores: [
      { nombre: "Croac#LAS", amigo: "croac-las" },
      { nombre: "Renacuaja#LAS", amigo: "renacuaja-las" },
      { nombre: "Rival Uno#AAA", amigo: null },
      { nombre: null, amigo: null },
      { nombre: "Rival Dos#BBB", amigo: null },
      { nombre: "Rival Tres#CCC", amigo: null },
      { nombre: "Rival Cuatro#DDD", amigo: null },
      { nombre: "Rival Cinco#EEE", amigo: null },
    ],
  };
}

/** Responde tft.json o lol.json según la ruta pedida, como el servidor real. */
export function fetchPorRuta({ lol, tft }) {
  return (ruta) => {
    const json = String(ruta).includes("tft.json") ? tft : lol;
    if (json === 404) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    return Promise.resolve({ ok: true, status: 200, json: async () => json });
  };
}
