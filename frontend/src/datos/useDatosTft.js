import { cargarDatosTft } from "../logica/datosTft.js";
import { INTERVALO_ACTUALIZACION_MS, useDatosPeriodicos } from "./useDatosPeriodicos.js";

/**
 * tft.json, con la misma lógica que lol.json (cada 2 minutos con la pestaña visible).
 * Solo se pide mientras `activo` es true, es decir, cuando se mira la pestaña TFT.
 */
export function useDatosTft(fetchFn, activo = true, intervaloMs = INTERVALO_ACTUALIZACION_MS) {
  return useDatosPeriodicos(cargarDatosTft, fetchFn, { intervaloMs, activo });
}
