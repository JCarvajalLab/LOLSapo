// Arma las tres líneas del resumen de un amigo: Solo/Dúo, Flex y Total.
import { calcularWinrate, esNumero, nombreRango } from "./formato.js";

function lineaRango(etiqueta, rango) {
  const nombre = nombreRango(rango);
  if (!nombre) {
    return { etiqueta, texto: "Sin clasificar", vacio: true, victorias: null, derrotas: null, winrate: null };
  }
  const victorias = esNumero(rango.victorias) ? rango.victorias : 0;
  const derrotas = esNumero(rango.derrotas) ? rango.derrotas : 0;
  return {
    etiqueta,
    titulo: nombre,
    detalle: `${esNumero(rango.lp) ? rango.lp : 0} LP`,
    vacio: false,
    victorias,
    derrotas,
    winrate: calcularWinrate(victorias, derrotas),
  };
}

function lineaTotal(total) {
  const partidas = esNumero(total?.partidas) ? total.partidas : 0;
  if (partidas === 0) {
    return { etiqueta: "Total", texto: "Sin partidas", vacio: true, victorias: null, derrotas: null, winrate: null };
  }
  return {
    etiqueta: "Total",
    texto: partidas === 1 ? "1 partida" : `${partidas} partidas`,
    vacio: false,
    victorias: esNumero(total.victorias) ? total.victorias : 0,
    derrotas: esNumero(total.derrotas) ? total.derrotas : 0,
    winrate: esNumero(total.winrate) ? total.winrate : null,
  };
}

export function lineasResumen(amigo) {
  return [
    lineaRango("Solo/Dúo", amigo?.rangos?.solo),
    lineaRango("Flex", amigo?.rangos?.flex),
    lineaTotal(amigo?.estadisticas?.total),
  ];
}
