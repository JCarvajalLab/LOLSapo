// Lógica para extraer y formatear estadísticas de campeones en el frontend.

export const PERIODOS = [
  { clave: "dias_30", etiqueta: "30 días" },
  { clave: "dias_90", etiqueta: "90 días" },
  { clave: "todo", etiqueta: "Año 2026" },
];

export const LINEAS = [
  { clave: "TOP", nombre: "Superior", alias: "Top" },
  { clave: "JUNGLE", nombre: "Jungla", alias: "Jg" },
  { clave: "MIDDLE", nombre: "Central", alias: "Mid" },
  { clave: "BOTTOM", nombre: "Tirador", alias: "ADC" },
  { clave: "UTILITY", nombre: "Soporte", alias: "Supp" },
];

/**
 * Obtiene el bloque de datos de campeones para un amigo (o global) y período dado.
 */
export function obtenerBloqueCampeones(campeones, amigoSlug = "global", periodo = "todo") {
  if (!campeones || typeof campeones !== "object") return null;

  const fuente =
    amigoSlug === "global"
      ? campeones.global
      : campeones.por_amigo?.[amigoSlug];

  if (!fuente || typeof fuente !== "object") return null;
  return fuente[periodo] ?? fuente.todo ?? null;
}

/**
 * Retorna la lista de campeones (opcionalmente filtrada por línea).
 */
export function listaCampeones(bloque, linea = null) {
  if (!bloque) return [];
  if (linea) {
    return Array.isArray(bloque.por_linea?.[linea]) ? bloque.por_linea[linea] : [];
  }
  return Array.isArray(bloque.campeones) ? bloque.campeones : [];
}

/**
 * Retorna el resumen de las 5 líneas con conteos y porcentajes.
 */
export function resumenLineas(bloque) {
  if (!bloque || !bloque.resumen_lineas) {
    return LINEAS.map((l) => ({
      posicion: l.clave,
      partidas: 0,
      victorias: 0,
      derrotas: 0,
      winrate: null,
      porcentaje: 0,
    }));
  }
  return LINEAS.map((l) => bloque.resumen_lineas[l.clave] ?? {
    posicion: l.clave,
    partidas: 0,
    victorias: 0,
    derrotas: 0,
    winrate: null,
    porcentaje: 0,
  });
}

/**
 * Retorna el campeón más jugado de cada amigo del grupo, ordenados por partidas descendente.
 */
export function campeonesPrincipalesAmigos(campeones, amigos, periodo = "todo") {
  if (!campeones?.por_amigo || !Array.isArray(amigos)) return [];

  const resultado = [];
  for (const amigo of amigos) {
    const bloque = obtenerBloqueCampeones(campeones, amigo.slug, periodo);
    const lista = listaCampeones(bloque);
    if (lista.length > 0) {
      const top = lista[0];
      resultado.push({
        ...top,
        amigo_slug: amigo.slug,
        amigo_nombre: amigo.nombre || amigo.riot_id?.split("#")[0] || amigo.slug,
      });
    }
  }

  resultado.sort((a, b) => b.partidas - a.partidas || (b.winrate ?? 0) - (a.winrate ?? 0));
  return resultado;
}
