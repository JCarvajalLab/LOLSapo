// Imágenes y nombres de Data Dragon para TFT (campeones, rasgos e ítems).
// Igual que en League: cada pieza se valida antes de armar la URL; si algo no cuadra,
// se devuelve null y la interfaz muestra el nombre o las iniciales en su lugar.
import { DDRAGON_BASE, versionDD } from "./ddragon.js";

// Nombre de archivo simple: "TFT18_Sivir_splash_centered_61.TFT_Set18.png".
// Sin barras, sin "..", sin esquema y sin empezar con punto o guion.
const IMAGEN_OK = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}\.png$/;
const ID_OK = /^[A-Za-z0-9_]{1,80}$/;

const CARPETAS = {
  campeones: "tft-champion",
  rasgos: "tft-trait",
  items: "tft-item",
};

/** true si `imagen` es un nombre de archivo .png seguro para poner en una URL. */
export function imagenTftValida(imagen) {
  return typeof imagen === "string" && !imagen.includes("..") && IMAGEN_OK.test(imagen);
}

function entrada(dd, tipo, id) {
  if (typeof id !== "string" || !ID_OK.test(id)) return null;
  const mapa = dd?.[tipo];
  if (!mapa || typeof mapa !== "object" || !Object.hasOwn(mapa, id)) return null;
  const valor = mapa[id];
  return valor && typeof valor === "object" ? valor : null;
}

function url(dd, tipo, id) {
  const v = versionDD(dd);
  const imagen = entrada(dd, tipo, id)?.imagen;
  if (!v || !imagenTftValida(imagen)) return null;
  return `${DDRAGON_BASE}/cdn/${v}/img/${CARPETAS[tipo]}/${imagen}`;
}

/**
 * Nombre legible a partir del id cuando Data Dragon no lo trae:
 * "DA_18_Morgana" -> "Morgana", "DA_Brambleback18" -> "Brambleback", "TFT_Item_Rabadon" -> "Rabadon".
 */
export function nombreDesdeId(id) {
  if (typeof id !== "string" || !id) return "Desconocido";
  const limpio = id
    .replace(/^(DA|TFT[A-Za-z0-9]*|Set\d+)_/i, "")
    .replace(/^\d+_/, "")
    .replace(/^Item_/i, "")
    .replace(/_?(UniqueTrait|Unique)$/i, "")
    .replace(/(\d+)(_[A-Z]+)?$/, "")
    .replace(/_/g, " ")
    .trim();
  return limpio || id;
}

function nombre(dd, tipo, id) {
  const n = entrada(dd, tipo, id)?.nombre;
  return typeof n === "string" && n.trim() ? n : nombreDesdeId(id);
}

export const urlCampeonTft = (dd, id) => url(dd, "campeones", id);
export const urlRasgoTft = (dd, id) => url(dd, "rasgos", id);
export const urlItemTft = (dd, id) => url(dd, "items", id);

export const nombreCampeonTft = (dd, id) => nombre(dd, "campeones", id);
export const nombreRasgoTft = (dd, id) => nombre(dd, "rasgos", id);
export const nombreItemTft = (dd, id) => nombre(dd, "items", id);

/**
 * Costo de oro de una unidad (1 a 5). Usa el de Data Dragon; si falta, lo estima
 * con la rareza de la partida (0 -> 1 de oro, ..., 4 o más -> 5).
 */
export function costoUnidad(dd, unidad) {
  const costo = entrada(dd, "campeones", unidad?.id)?.costo;
  if (Number.isInteger(costo) && costo >= 1) return Math.min(costo, 5);
  const rareza = unidad?.rareza;
  if (Number.isInteger(rareza) && rareza >= 0) return Math.min(rareza + 1, 5);
  return null;
}
