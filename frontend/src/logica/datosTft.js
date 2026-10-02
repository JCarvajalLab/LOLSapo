// Lectura y validación básica de tft.json.
import { cargarJson, ErrorDatos } from "./datos.js";

/** Ruta relativa, igual que lol.json (funciona en localhost y en GitHub Pages). */
export const RUTA_DATOS_TFT = "./datos/tft.json";

const lista = (valor) => (Array.isArray(valor) ? valor.filter((x) => x && typeof x === "object") : []);

/** Comprueba la forma mínima de tft.json y rellena lo que falte para no romper la interfaz. */
export function validarDatosTft(json) {
  if (!json || typeof json !== "object" || !Array.isArray(json.amigos)) {
    throw new ErrorDatos("El archivo de datos no tiene el formato esperado.", "formato");
  }
  return {
    version: json.version ?? null,
    actualizado: typeof json.actualizado === "string" ? json.actualizado : null,
    error: typeof json.error === "string" && json.error.trim() ? json.error : null,
    // Si no viene, se asume disponible: el aviso solo aparece cuando el recolector lo dice.
    en_vivo_disponible: json.en_vivo_disponible !== false,
    ddragon: json.ddragon && typeof json.ddragon === "object" ? json.ddragon : null,
    en_vivo: lista(json.en_vivo),
    amigos: lista(json.amigos).filter((a) => typeof a.slug === "string"),
    ranking: lista(json.ranking),
  };
}

/** Pide tft.json sin caché y lo valida. `fetchFn` se inyecta en los tests. */
export function cargarDatosTft(fetchFn = fetch) {
  return cargarJson(RUTA_DATOS_TFT, validarDatosTft, fetchFn);
}
