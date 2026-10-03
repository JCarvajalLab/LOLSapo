// Destacados de los últimos 7 días (lol.json → "destacados").
// Validación al leer el JSON y formato de los números. No depende de React.
import { esNumero } from "./formato.js";

/** Orden fijo de las tarjetas, como lo decidió Deo. */
export const CLAVES_DESTACADOS = [
  "mas_partidas",
  "mejor_winrate",
  "mejor_partida",
  "racha_victorias_grupo",
  "racha_derrotas_grupo",
  "peor_partida",
];

/** Mínimo de partidas seguidas para que una racha cuente (lo mismo que usa el recolector). */
export const RACHA_MINIMA = 2;

/** Partidas por amigo para winrate y mejor y peor partida si el archivo no lo dice. */
export const ULTIMAS_PARTIDAS_POR_DEFECTO = 7;

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
  mejor_partida: validarPartida,
  racha_victorias_grupo: validarRacha,
  racha_derrotas_grupo: validarRacha,
  peor_partida: validarPartida,
};

// El formato viejo traía "mejor_kda" (KDA acumulado): se ignora como "peor_kda".
function validarPartida(t) {
  return (
    conteo(t.asesinatos) &&
    conteo(t.muertes) &&
    conteo(t.asistencias) &&
    decimal(t.kda) &&
    RESULTADOS_OK.has(t.resultado) &&
    decimal(t.fecha) &&
    (t.campeon_id === null || t.campeon_id === undefined || conteo(t.campeon_id)) &&
    textoOpcional(t.campeon) &&
    textoOpcional(t.modo) &&
    textoOpcional(t.partida_id)
  );
}

/** Daño a campeones: entero ≥ 0; si falta (partidas o archivos viejos) o es inválido, null. */
function validarDanio(valor) {
  return conteo(valor) ? valor : null;
}

// Los formatos viejos ("racha", "racha_victorias", "racha_derrotas") se ignoran: el
// recolector regenera lol.json en cada pasada.
function validarRacha(t) {
  return Number.isInteger(t.racha) && t.racha >= RACHA_MINIMA;
}

const fechaMs = (v) => (Number.isInteger(v) && v > 0 ? v : null);

/**
 * Completa una racha en equipo ya validada: `partidas` por amigo (entero de 1 a `racha`;
 * si falta o es inválido vale `racha`) y `desde`/`hasta` (null si faltan o son inválidos).
 */
function completarRacha(t, amigos) {
  const crudas = t.partidas && typeof t.partidas === "object" && !Array.isArray(t.partidas) ? t.partidas : {};
  const partidas = {};
  for (const slug of amigos) {
    const n = Object.hasOwn(crudas, slug) ? crudas[slug] : undefined;
    partidas[slug] = Number.isInteger(n) && n >= 1 && n <= t.racha ? n : t.racha;
  }
  let desde = fechaMs(t.desde);
  let hasta = fechaMs(t.hasta);
  if (desde === null) desde = hasta;
  if (hasta === null) hasta = desde;
  if (desde !== null && hasta < desde) [desde, hasta] = [hasta, desde];
  return { racha: t.racha, amigos, partidas, desde, hasta };
}

/** Una tarjeta válida (con `amigos` filtrados) o null si está mal formada o sin amigos conocidos. */
export function validarTarjeta(clave, tarjeta, slugs) {
  if (!tarjeta || typeof tarjeta !== "object" || Array.isArray(tarjeta)) return null;
  const validar = VALIDADORES[clave];
  if (!validar || !validar(tarjeta)) return null;
  const amigos = amigosConocidos(tarjeta.amigos, slugs);
  if (amigos.length === 0) return null;
  if (validar === validarRacha) return completarRacha(tarjeta, amigos);
  if (validar === validarPartida) return { ...tarjeta, amigos, danio: validarDanio(tarjeta.danio) };
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
    ultimas_partidas: validarUltimasPartidas(destacados.ultimas_partidas),
    ...tarjetas,
  };
}

/** Entero de 1 a 50; si falta o es inválido, el valor por defecto (7). */
function validarUltimasPartidas(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 50 ? valor : ULTIMAS_PARTIDAS_POR_DEFECTO;
}

/** true si ninguna tarjeta tiene datos. */
export function destacadosVacios(destacados) {
  return CLAVES_DESTACADOS.every((clave) => !destacados?.[clave]);
}

const unDecimal = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const hastaDosDecimales = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

const ESPACIO_DURO = String.fromCharCode(0xa0);

/** "62,5 %" con espacio duro para que no se corte la línea. */
export function formatearPorcentaje(valor) {
  return esNumero(valor) ? `${unDecimal.format(valor)}${ESPACIO_DURO}%` : "—";
}

/** KDA de una partida: "9,5", "3,02", "0". */
export function formatearKdaDestacado(valor) {
  return esNumero(valor) ? hastaDosDecimales.format(valor) : "—";
}

const miles = new Intl.NumberFormat("es-CL");

/** "Daño: 32.450" o null si no hay dato (la tarjeta no muestra la línea). */
export function formatearDanio(valor) {
  return conteo(valor) ? `Daño: ${miles.format(valor)}` : null;
}

/** Color del texto según el resultado de la partida; neutro si no es victoria ni derrota. */
export function colorResultado(resultado) {
  if (resultado === "victoria") return "text-victoria";
  if (resultado === "derrota") return "text-derrota";
  return "text-texto";
}

const diaMes = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

const mismoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Fecha de una racha en la zona horaria local: "1 oct" si empieza y termina el mismo día,
 * "30 sept – 2 oct" si no. null si no hay fechas.
 */
export function fechaRacha(desde, hasta) {
  if (!esNumero(desde) || !esNumero(hasta)) return null;
  const inicio = new Date(desde);
  const fin = new Date(hasta);
  if (mismoDia(inicio, fin)) return diaMes.format(inicio);
  return `${diaMes.format(inicio)} – ${diaMes.format(fin)}`;
}

/** "1 partida", "8 partidas". */
export function plural(cantidad, singular, pluralTexto = `${singular}s`) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
