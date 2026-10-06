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

/** Períodos de la sinergia, en el orden de las pestañas. El primero es el de por defecto. */
export const PERIODOS_SINERGIA = ["ultimos_30_dias", "todo"];

/**
 * Valida un período ({ <slug>: filas }) contra los amigos de lol.json.
 * - null si falta o no es un objeto.
 * - Si no, un objeto con una entrada por cada amigo (lista vacía si no tiene compañeros).
 *   Se descartan slugs desconocidos, el propio amigo, repetidos y filas incoherentes.
 *   Las filas quedan ordenadas de más a menos partidas.
 */
export function validarPeriodoSinergia(valor, amigos) {
  if (!esObjeto(valor)) return null;
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

const esObjeto = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/**
 * Valida la sinergia completa: { ultimos_30_dias, todo }, cada período validado aparte
 * (null si falta o no es un objeto).
 * - Formato viejo (objeto { <slug>: filas } sin claves de período): se toma como "todo"
 *   y "ultimos_30_dias" queda en null.
 * - null si falta, no es un objeto o no trae ningún período: el ranking abre las partidas.
 */
export function validarSinergia(valor, amigos) {
  if (!esObjeto(valor)) return null;
  const formatoNuevo = PERIODOS_SINERGIA.some((p) => Object.hasOwn(valor, p));
  const fuente = formatoNuevo ? valor : { ultimos_30_dias: null, todo: valor };
  const resultado = {};
  for (const periodo of PERIODOS_SINERGIA) {
    resultado[periodo] = validarPeriodoSinergia(Object.hasOwn(fuente, periodo) ? fuente[periodo] : null, amigos);
  }
  return PERIODOS_SINERGIA.every((p) => resultado[p] === null) ? null : resultado;
}

/**
 * Filas de la tabla para un amigo: todos los demás amigos del grupo, en `companeros`
 * (lista de slugs). Los que tienen partidas juntos van primero, en el orden pedido;
 * los que no, al final en el orden del grupo, con `sinPartidas: true` y cifras en null.
 */
export function filasConTodos(filas, companeros, columna = "partidas", direccion = "desc") {
  const conPartidas = new Map((filas ?? []).map((f) => [f.amigo, f]));
  const conDatos = ordenarSinergia(
    (companeros ?? []).filter((slug) => conPartidas.has(slug)).map((slug) => conPartidas.get(slug)),
    columna,
    direccion,
  );
  const sinDatos = (companeros ?? [])
    .filter((slug) => !conPartidas.has(slug))
    .map((amigo) => ({ amigo, partidas: 0, victorias: 0, derrotas: 0, winrate: null, sinPartidas: true }));
  return [...conDatos, ...sinDatos];
}

/** Orden con el que se abre la tabla: más partidas primero. */
export const ORDEN_INICIAL = { columna: "partidas", direccion: "desc" };

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
