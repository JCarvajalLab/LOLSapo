// Lectura y validación básica de los JSON de datos (lol.json y tft.json).
import { validarDestacados } from "./destacados.js";
import { validarSinergia } from "./sinergia.js";

/** Ruta del JSON relativa a la página (funciona en localhost y en GitHub Pages). */
export const RUTA_DATOS = "./datos/lol.json";
/** URL directa a la rama datos en GitHub Raw (actualizada cada 5 min sin depender del deploy de Pages). */
export const RUTA_DATOS_RAW = "https://raw.githubusercontent.com/JCarvajalLab/LOLSapo/datos/datos/lol.json";
export const RUTA_DATOS_TFT_RAW = "https://raw.githubusercontent.com/JCarvajalLab/LOLSapo/datos/datos/tft.json";

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
    // null en archivos anteriores o sin estadísticas de campeones.
    campeones: json.campeones && typeof json.campeones === "object" ? json.campeones : null,
    // null en archivos anteriores o sin récords.
    records: json.records && typeof json.records === "object" ? json.records : null,
  };
}

const SIN_DATOS = "Todavía no hay datos.";

/** Pide lol.json sin caché y lo valida. `fetchFn` se inyecta en los tests. */
export function cargarDatos(fetchFn = fetch) {
  return cargarJson(RUTA_DATOS, validarDatos, fetchFn);
}

function esHostGitHubPages(hostname) {
  if (typeof hostname !== "string") return false;
  return hostname === "github.io" || hostname.endsWith(".github.io");
}

/**
 * Pide un JSON de datos sin caché y lo pasa por `validar`.
 * Lo usan lol.json y tft.json; los errores siempre son ErrorDatos con su tipo.
 */
export async function cargarJson(ruta, validar, fetchFn = fetch) {
  let respuesta;
  const esGitHubPages =
    typeof window !== "undefined" && typeof window.location === "object" && esHostGitHubPages(window.location.hostname);
  const esFetchNativo = typeof window !== "undefined" && typeof window.fetch === "function" && fetchFn === window.fetch;

  // En producción (GitHub Pages), se pide directo a la rama datos en GitHub Raw para
  // tener los datos frescos de hace 5 minutos sin depender del desempaquetado de Pages.
  if (esGitHubPages && esFetchNativo) {
    const urlRemota = ruta === RUTA_DATOS ? RUTA_DATOS_RAW : ruta.endsWith("tft.json") ? RUTA_DATOS_TFT_RAW : null;
    if (urlRemota) {
      try {
        const resRemota = await fetchFn(`${urlRemota}?_t=${Date.now()}`, { cache: "no-store" });
        if (resRemota.ok) {
          const json = await resRemota.json();
          return validar(json);
        }
      } catch {
        // Fallback al archivo empaquetado si GitHub Raw falla.
      }
    }
  }

  const usarAntiCache = esFetchNativo;
  const urlFinal = usarAntiCache ? `${ruta}${ruta.includes("?") ? "&" : "?"}_t=${Date.now()}` : ruta;
  try {
    respuesta = await fetchFn(urlFinal, { cache: "no-store" });
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
