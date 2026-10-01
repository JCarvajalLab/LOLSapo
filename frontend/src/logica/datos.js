// Lectura y validación básica de lol.json.

/** Ruta del JSON relativa a la página (funciona en localhost y en GitHub Pages). */
export const RUTA_DATOS = "./datos/lol.json";

export class ErrorDatos extends Error {}

/** Comprueba la forma mínima y rellena lo que falte para no romper la interfaz. */
export function validarDatos(json) {
  if (!json || typeof json !== "object" || !Array.isArray(json.amigos)) {
    throw new ErrorDatos("El archivo de datos no tiene el formato esperado.");
  }
  return {
    version: json.version ?? null,
    actualizado: typeof json.actualizado === "string" ? json.actualizado : null,
    ddragon: json.ddragon && typeof json.ddragon === "object" ? json.ddragon : null,
    en_vivo: Array.isArray(json.en_vivo) ? json.en_vivo.filter(Boolean) : [],
    amigos: json.amigos.filter((a) => a && typeof a === "object" && typeof a.slug === "string"),
    ranking: Array.isArray(json.ranking) ? json.ranking.filter(Boolean) : [],
  };
}

/** Pide lol.json sin caché y lo valida. `fetchFn` se inyecta en los tests. */
export async function cargarDatos(fetchFn = fetch) {
  let respuesta;
  try {
    respuesta = await fetchFn(RUTA_DATOS, { cache: "no-store" });
  } catch {
    throw new ErrorDatos("No se pudo conectar con el servidor local.");
  }
  if (!respuesta.ok) {
    throw new ErrorDatos(
      respuesta.status === 404
        ? "No existe datos/lol.json. Ejecuta el script de datos."
        : `El servidor respondió con el código ${respuesta.status}.`,
    );
  }
  let json;
  try {
    json = await respuesta.json();
  } catch {
    throw new ErrorDatos("El archivo de datos está dañado. Ejecuta de nuevo el script de datos.");
  }
  return validarDatos(json);
}
