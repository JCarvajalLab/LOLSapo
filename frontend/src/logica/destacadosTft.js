// Destacados de TFT (tft.json → "destacados"): métricas de la semana y del mes.
// No existe bloque diario ("Hoy") por el menor volumen de partidas diarias.
import { esNumero } from "./formato.js";

/** Claves de la semana en TFT, en el orden de las tarjetas. */
export const CLAVES_SEMANA_TFT = [
  "mejor_jugador_semana",
  "mejor_top4_semana",
  "balance_semana",
  "mas_partidas_semana",
  "peor_jugador_semana",
];

/** Claves del mes en TFT, en el orden de las tarjetas. */
export const CLAVES_MES_TFT = [
  "mejor_jugador_mes",
  "mejor_top4_mes",
  "balance_mes",
  "mas_partidas_mes",
  "peor_jugador_mes",
];

export const CLAVES_DESTACADOS_TFT = [...CLAVES_SEMANA_TFT, ...CLAVES_MES_TFT];

export const TITULOS_TFT = {
  mejor_jugador_semana: "Mejor partida de la semana",
  mejor_top4_semana: "Mejor % Top 4 de la semana",
  balance_semana: "Balance de TFT de la semana",
  mas_partidas_semana: "Más partidas de la semana",
  peor_jugador_semana: "Puesto más bajo de la semana",
  mejor_jugador_mes: "Mejor partida del mes",
  mejor_top4_mes: "Mejor % Top 4 del mes",
  balance_mes: "Balance de TFT del mes",
  mas_partidas_mes: "Más partidas del mes",
  peor_jugador_mes: "Puesto más bajo del mes",
};

export const VACIO_SEMANA_TFT = "No existen partidas registradas de TFT esta semana";
export const VACIO_MES_TFT = "No existen partidas registradas de TFT este mes";

const DIA_MS = 24 * 3600 * 1000;
const SEMANA_MS = 7 * DIA_MS;
export const DIAS_MES_CERRADO = 3;

/** Comprueba si la semana de los datos ya expiró (más de 7 días). */
export function semanaVencidaTft(semanaDesde, ahora) {
  if (!esNumero(semanaDesde) || !esNumero(ahora)) return false;
  return ahora - semanaDesde >= SEMANA_MS;
}

/** Comprueba si el mes ya concluyó según la fecha de corte. */
export function mesCerradoTft(mes, ahora) {
  if (!mes || typeof mes !== "object") return false;
  if (mes.cerrado) return true;
  if (!esNumero(mes.hasta) || !esNumero(ahora)) return false;
  return ahora >= mes.hasta;
}

/** Comprueba si el mes ya expiró por completo para no mostrarse más. */
export function mesVencidoTft(mes, ahora) {
  if (!mes || !esNumero(mes.hasta) || !esNumero(ahora)) return false;
  return ahora >= mes.hasta + DIAS_MES_CERRADO * DIA_MS;
}

/** Devuelve true si todas las tarjetas de un bloque vienen vacías o null. */
export function destacadosVaciosTft(destacados, claves) {
  if (!destacados) return true;
  return claves.every((c) => !destacados[c]);
}

/** Filtra los destacados para vaciar semana o mes si están vencidos. */
export function destacadosVigentesTft(destacados, ahora) {
  if (!destacados) return null;
  const copia = { ...destacados };

  if (semanaVencidaTft(copia.semana_desde, ahora)) {
    for (const clave of CLAVES_SEMANA_TFT) {
      copia[clave] = null;
    }
  }

  if (mesVencidoTft(copia.mes, ahora)) {
    for (const clave of CLAVES_MES_TFT) {
      copia[clave] = null;
    }
  }

  return copia;
}

/** Obtiene el top 5 para una tarjeta de TFT. */
export function topDeTft(destacados, clave) {
  if (!destacados?.[clave]) return null;
  const lista = destacados.tops?.[clave];
  return Array.isArray(lista) && lista.length > 0 ? lista : null;
}

/** Obtiene el top 5 global de partidas para una tarjeta de TFT. */
export function topGlobalDeTft(destacados, clave) {
  if (!destacados?.[clave]) return null;
  const lista = destacados.tops_global?.[clave];
  return Array.isArray(lista) && lista.length > 0 ? lista : null;
}
