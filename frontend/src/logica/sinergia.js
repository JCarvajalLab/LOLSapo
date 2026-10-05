// Sinergia del grupo (lol.json → "sinergia"): con quién gana más cada amigo.
// Partidas en el mismo equipo, solo Normal y Ranked. Validación al leer y orden de la tabla.
// No depende de React.
import { calcularWinrate, esNumero } from "./formato.js";

const conteo = (v) => Number.isInteger(v) && v >= 0;

/** Una fila válida y normalizada, o null si no cuadra. */
function validarFila(fila, slugs, propio) {
  if (!fila || typeof fila !== "object") return null;
  const { amigo, partidas, victorias, derrotas, winrate } = fila;
  if (typeof amigo !== "string" || amigo === propio || !slugs.has(amigo)) return null;
  if (!conteo(partidas) || !conteo(victorias) || !conteo(derrotas)) return null;
  if (partidas < 1 || victorias + derrotas !== partidas) return null;
  let wr;
  if (winrate === null || winrate === undefined) wr = calcularWinrate(victorias, derrotas);
  else if (esNumero(winrate) && winrate >= 0 && winrate <= 100) wr = winrate;
  else return null;
  return { amigo, partidas, victorias, derrotas, winrate: wr };
}

/**
 * Valida la sinergia contra los amigos de lol.json.
 * - null si falta o no es un objeto (archivos anteriores a esta función).
 * - Si no, un objeto { <slug>: filas } con una entrada por cada amigo (lista vacía si no
 *   tiene compañeros). Se descartan slugs desconocidos, el propio amigo, repetidos y filas
 *   incoherentes. Las filas quedan ordenadas de más a menos partidas.
 */
export function validarSinergia(valor, amigos) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const slugs = new Set((amigos ?? []).map((a) => a?.slug).filter((s) => typeof s === "string"));
  const resultado = {};
  for (const slug of slugs) {
    const lista = Object.hasOwn(valor, slug) && Array.isArray(valor[slug]) ? valor[slug] : [];
    const vistos = new Set();
    const filas = [];
    for (const fila of lista) {
      const ok = validarFila(fila, slugs, slug);
      if (!ok || vistos.has(ok.amigo)) continue;
      vistos.add(ok.amigo);
      filas.push(ok);
    }
    resultado[slug] = ordenarSinergia(filas, "partidas", "desc");
  }
  return resultado;
}

/** Columnas por las que se puede ordenar la tabla. */
export const COLUMNAS_ORDEN = ["partidas", "winrate"];

/**
 * Copia ordenada de las filas. `columna` es "partidas" o "winrate"; `direccion` "desc" o "asc".
 * Empates: más partidas primero, luego por slug para que el orden sea estable.
 */
export function ordenarSinergia(filas, columna = "partidas", direccion = "desc") {
  const signo = direccion === "asc" ? 1 : -1;
  const valor = (f) => (esNumero(f[columna]) ? f[columna] : -1);
  return [...(filas ?? [])].sort(
    (a, b) =>
      signo * (valor(a) - valor(b)) || b.partidas - a.partidas || a.amigo.localeCompare(b.amigo),
  );
}

/** Siguiente orden al hacer clic en un encabezado: primero descendente, luego alterna. */
export function siguienteOrden(actual, columna) {
  if (actual?.columna !== columna) return { columna, direccion: "desc" };
  return { columna, direccion: actual.direccion === "desc" ? "asc" : "desc" };
}

/** Ancho de la barra de "Jugadas" en %, proporcional al máximo de la lista. */
export function anchoPartidas(partidas, maximo) {
  if (!esNumero(partidas) || !esNumero(maximo) || maximo <= 0) return 0;
  return Math.min(100, Math.max(0, (partidas / maximo) * 100));
}

/** true si la tasa de victorias se pinta como positiva (desde 50 %). */
export function esWinratePositivo(winrate) {
  return esNumero(winrate) && winrate >= 50;
}

const unDecimalFijo = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ESPACIO_DURO = String.fromCharCode(0xa0);

/** "47,7 %" (siempre con un decimal y espacio duro) o "—". */
export function formatearTasa(valor) {
  return esNumero(valor) ? `${unDecimalFijo.format(valor)}${ESPACIO_DURO}%` : "—";
}
