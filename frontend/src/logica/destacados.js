// Destacados de los últimos 7 días (lol.json → "destacados").
// Validación al leer el JSON y formato de los números. No depende de React.
import { esNumero } from "./formato.js";

/** Orden fijo de las tarjetas, como lo decidió Deo. */
export const CLAVES_DESTACADOS = ["mas_partidas", "mejor_winrate", "mejor_kda", "peor_kda", "racha", "peor_partida"];

const RESULTADOS_OK = new Set(["victoria", "derrota"]);

const conteo = (v) => Number.isInteger(v) && v >= 0;
const decimal = (v) => esNumero(v) && v >= 0;
const textoOpcional = (v) => v === null || v === undefined || typeof v === "string";

/** Slugs válidos y conocidos, sin repetir. Los desconocidos se ignoran. */
function amigosConocidos(lista, slugs) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter((s) => typeof s === "string" && slugs.has(s)))];
}

const VALIDADORES = {
  mas_partidas: (t) => conteo(t.partidas) && t.partidas > 0,
  mejor_winrate: (t) =>
    decimal(t.winrate) &&
    t.winrate <= 100 &&
    conteo(t.victorias) &&
    conteo(t.derrotas) &&
    conteo(t.partidas) &&
    t.partidas > 0,
  mejor_kda: validarKda,
  peor_kda: validarKda,
  racha: (t) => conteo(t.racha) && t.racha > 0,
  peor_partida: (t) =>
    conteo(t.asesinatos) &&
    conteo(t.muertes) &&
    conteo(t.asistencias) &&
    decimal(t.kda) &&
    RESULTADOS_OK.has(t.resultado) &&
    decimal(t.fecha) &&
    (t.campeon_id === null || t.campeon_id === undefined || conteo(t.campeon_id)) &&
    textoOpcional(t.campeon) &&
    textoOpcional(t.modo) &&
    textoOpcional(t.partida_id),
};

function validarKda(t) {
  return (
    decimal(t.kda) &&
    conteo(t.asesinatos) &&
    conteo(t.muertes) &&
    conteo(t.asistencias) &&
    conteo(t.partidas) &&
    t.partidas > 0
  );
}

/** Una tarjeta válida (con `amigos` filtrados) o null si está mal formada o sin amigos conocidos. */
export function validarTarjeta(clave, tarjeta, slugs) {
  if (!tarjeta || typeof tarjeta !== "object" || Array.isArray(tarjeta)) return null;
  const validar = VALIDADORES[clave];
  if (!validar || !validar(tarjeta)) return null;
  const amigos = amigosConocidos(tarjeta.amigos, slugs);
  if (amigos.length === 0) return null;
  return { ...tarjeta, amigos };
}

/**
 * Destacados validados o null si el archivo no trae el campo (archivos viejos).
 * `amigos` es la lista ya validada de lol.json; solo se aceptan sus slugs.
 */
export function validarDestacados(destacados, amigos) {
  if (!destacados || typeof destacados !== "object" || Array.isArray(destacados)) return null;
  const slugs = new Set((amigos ?? []).map((a) => a.slug));
  const tarjetas = {};
  for (const clave of CLAVES_DESTACADOS) {
    tarjetas[clave] = validarTarjeta(clave, destacados[clave], slugs);
  }
  return {
    dias: Number.isInteger(destacados.dias) && destacados.dias > 0 ? destacados.dias : 7,
    desde: decimal(destacados.desde) ? destacados.desde : null,
    ...tarjetas,
  };
}

/** true si ninguna tarjeta tiene datos. */
export function destacadosVacios(destacados) {
  return CLAVES_DESTACADOS.every((clave) => !destacados?.[clave]);
}

const unDecimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const dosDecimales = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESPACIO_DURO = String.fromCharCode(0xa0);

/** "62,5 %" con espacio duro para que no se corte la línea. */
export function formatearPorcentaje(valor) {
  return esNumero(valor) ? `${unDecimal.format(valor)}${ESPACIO_DURO}%` : "—";
}

/** "3,02" */
export function formatearKdaDestacado(valor) {
  return esNumero(valor) ? dosDecimales.format(valor) : "—";
}

/** "1 partida", "8 partidas". */
export function plural(cantidad, singular, pluralTexto = `${singular}s`) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
