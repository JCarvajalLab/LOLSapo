import { cargarDatos } from "../logica/datos.js";
import { INTERVALO_ACTUALIZACION_MS, useDatosPeriodicos } from "./useDatosPeriodicos.js";

export { INTERVALO_ACTUALIZACION_MS };

/** lol.json, releído cada 2 minutos mientras la pestaña está visible. */
export function useDatosLol(fetchFn, intervaloMs = INTERVALO_ACTUALIZACION_MS) {
  return useDatosPeriodicos(cargarDatos, fetchFn, { intervaloMs });
}
