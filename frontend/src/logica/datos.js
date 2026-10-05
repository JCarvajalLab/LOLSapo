// Lectura y validación básica de los JSON de datos (lol.json y tft.json).
import { validarDestacados } from "./destacados.js";
import { validarSinergia } from "./sinergia.js";

/** Ruta del JSON relativa a la página (funciona en localhost y en GitHub Pages). */
export const RUTA_DATOS = "./datos/lol.json";

/**
 * Error al leer los datos. `tipo` permite mostrar un mensaje accionable:
 * - "sin-datos": todavía no existe lol.json (hay que correr el recolector).
 * - "red": no se pudo conectar o el servidor falló; se reintenta solo.
 * - "formato": el archivo existe pero está dañado o no tiene la forma esperada.
 */
export class ErrorDatos extends Error {
  constructor(mensaje, tipo = "red") {
    super(mensaje);
    this.tipo = tipo;
  }
}

/** Comprueba la forma mínima y rellena lo que falte para no romper la interfaz. */
export function validarDatos(json) {
  if (!json || typeof json !== "object" || !Array.isArray(json.amigos)) {
    throw new ErrorDatos("El archivo de datos no tiene el formato esperado.", "formato");
  }
  const amigos = json.amigos.filter((a) => a && typeof a === "object" && typeof a.slug === "string");
  return {
    version: json.version ?? null,
    actualizado: typeof json.actualizado === "string" ? json.actualizado : null,
    ddragon: json.ddragon && typeof json.ddragon === "object" ? json.ddragon : null,
    en_vivo: Array.isArray(json.en_vivo) ? json.en_vivo.filter(Boolean) : [],
    amigos,
    ranking: Array.isArray(json.ranking) ? json.ranking.filter(Boolean) : [],
    // null en archivos anteriores a la fase 7: la sección no se muestra.
    destacados: validarDestacados(json.destacados, amigos),
    // null en archivos sin sinergia: el clic en el ranking abre las partidas como antes.
    sinergia: validarSinergia(json.sinergia, amigos),
  };
}

const SIN_DATOS = "Todavía no hay datos.";

/** Pide lol.json sin caché y lo valida. `fetchFn` se inyecta en los tests. */
export function cargarDatos(fetchFn = fetch) {
  return cargarJson(RUTA_DATOS, validarDatos, fetchFn);
}

/**
 * Pide un JSON de datos sin caché y lo pasa por `validar`.
 * Lo usan lol.json y tft.json; los errores siempre son ErrorDatos con su tipo.
 */
export async function cargarJson(ruta, validar, fetchFn = fetch) {
  let respuesta;
  try {
    respuesta = await fetchFn(ruta, { cache: "no-store" });
  } catch {
    throw new ErrorDatos("No se pudo conectar con el servidor.", "red");
  }
  if (respuesta.status === 404) throw new ErrorDatos(SIN_DATOS, "sin-datos");
  if (!respuesta.ok) {
    throw new ErrorDatos(`El servidor respondió con el código ${respuesta.status}.`, "red");
  }
  // En desarrollo, Vite responde index.html cuando el archivo no existe.
  const tipoContenido = respuesta.headers?.get?.("content-type") ?? "";
  if (tipoContenido.includes("text/html")) throw new ErrorDatos(SIN_DATOS, "sin-datos");

  let json;
  try {
    json = await respuesta.json();
  } catch {
    throw new ErrorDatos("El archivo de datos está dañado.", "formato");
  }
  return validar(json);
}
