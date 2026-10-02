// Filtros por modo (RF-17). Las categorías vienen ya calculadas en lol.json.

export const FILTROS = [
  { clave: "todos", etiqueta: "Todos" },
  { clave: "ranked", etiqueta: "Rankeds" },
  { clave: "normal", etiqueta: "Normales" },
  { clave: "aram", etiqueta: "ARAM" },
  { clave: "otros", etiqueta: "Otros" },
];

const CLAVES = new Set(FILTROS.map((f) => f.clave));

export function esFiltroValido(clave) {
  return CLAVES.has(clave);
}

export function etiquetaFiltro(clave) {
  return FILTROS.find((f) => f.clave === clave)?.etiqueta ?? "Todos";
}

/** Categoría normalizada de una partida; lo desconocido cae en "otros". */
export function categoriaDe(item) {
  const c = item?.categoria;
  return c === "ranked" || c === "normal" || c === "aram" ? c : "otros";
}

export function filtrarPartidas(partidas, filtro) {
  if (!Array.isArray(partidas)) return [];
  if (filtro === "todos" || !esFiltroValido(filtro)) return partidas;
  return partidas.filter((p) => categoriaDe(p) === filtro);
}

const VACIO = { partidas: 0, victorias: 0, derrotas: 0, remakes: 0, winrate: null };

/** Resumen (partidas, victorias, derrotas, remakes, winrate) del filtro elegido. */
export function resumenDe(estadisticas, filtro) {
  if (!estadisticas) return VACIO;
  const fuente =
    filtro === "todos" || !esFiltroValido(filtro)
      ? estadisticas.total
      : estadisticas.por_categoria?.[filtro];
  return { ...VACIO, ...(fuente ?? {}) };
}

/** Modos del filtro elegido, ordenados por cantidad de partidas. */
export function modosDe(estadisticas, filtro) {
  const modos = Array.isArray(estadisticas?.por_modo) ? estadisticas.por_modo : [];
  const filtrados =
    filtro === "todos" || !esFiltroValido(filtro)
      ? modos
      : modos.filter((m) => categoriaDe(m) === filtro);
  return [...filtrados].sort((a, b) => (b.partidas ?? 0) - (a.partidas ?? 0));
}
