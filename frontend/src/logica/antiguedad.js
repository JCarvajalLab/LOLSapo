// Antigüedad de los datos: cuánto pasó desde que el recolector consultó a Riot (`actualizado`).
// Si el recolector deja de correr, las partidas "en vivo" pueden haber terminado.
import { esNumero } from "./formato.js";

/** Hasta estos minutos, los datos se consideran frescos. */
export const MINUTOS_DATOS_VIEJOS = 15;
/** Desde estos minutos, ya no se puede saber quién está en partida. */
export const MINUTOS_DATOS_CADUCOS = 60;

/**
 * Devuelve { nivel, minutos }:
 * - "fresco": hasta 15 min.
 * - "viejo": más de 15 y hasta 60 min.
 * - "caduco": más de 60 min, o sin fecha de actualización.
 */
export function antiguedadDatos(actualizadoMs, ahoraMs) {
  if (!esNumero(actualizadoMs) || !esNumero(ahoraMs)) return { nivel: "caduco", minutos: null };
  const minutos = Math.max(0, Math.floor((ahoraMs - actualizadoMs) / 60000));
  if (minutos <= MINUTOS_DATOS_VIEJOS) return { nivel: "fresco", minutos };
  if (minutos <= MINUTOS_DATOS_CADUCOS) return { nivel: "viejo", minutos };
  return { nivel: "caduco", minutos };
}
