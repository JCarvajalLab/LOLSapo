// Destacados de LoL (lol.json → "destacados"): los de hoy y los de los últimos 7 días.
// Validación al leer el JSON y formato de los números. No depende de React.
import { esNumero } from "./formato.js";

/** Tarjetas de hoy (desde las 6:00 de Chile), en el orden de la fila: el balance al centro. */
export const CLAVES_HOY = ["mejor_jugador_hoy", "balance_hoy", "peor_jugador_hoy"];

/** Tarjetas de los últimos 7 días, en el orden que decidió Deo. */
export const CLAVES_SEMANA = [
  "mas_partidas",
  "mejor_winrate",
  "mejor_jugador_semana",
  "racha_victorias_grupo",
  "racha_derrotas_grupo",
  "peor_jugador_semana",
];

/** Todas las tarjetas que se validan. */
export const CLAVES_DESTACADOS = [...CLAVES_HOY, ...CLAVES_SEMANA];

/** Mínimo de partidas seguidas para que una racha cuente (lo mismo que usa el recolector). */
export const RACHA_MINIMA = 2;

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
  mejor_jugador_hoy: validarPartida,
  peor_jugador_hoy: validarPartida,
  balance_hoy: validarBalance,
  mejor_jugador_semana: validarPartida,
  peor_jugador_semana: validarPartida,
  racha_victorias_grupo: validarRacha,
  racha_derrotas_grupo: validarRacha,
};

/**
 * Balance del grupo hoy: cada partida en grupo cuenta una vez. Enteros coherentes
 * (victorias + derrotas = partidas, al menos 1) y winrate de 0 a 100 o null.
 */
function validarBalance(t) {
  return (
    conteo(t.partidas) &&
    conteo(t.victorias) &&
    conteo(t.derrotas) &&
    t.partidas > 0 &&
    t.victorias + t.derrotas === t.partidas &&
    (t.winrate === null || t.winrate === undefined || (decimal(t.winrate) && t.winrate <= 100))
  );
}

/** Solo los campos conocidos; sin winrate se calcula con las victorias. */
function completarBalance(t, amigos) {
  const winrate = esNumero(t.winrate) ? t.winrate : (t.victorias / t.partidas) * 100;
  return { partidas: t.partidas, victorias: t.victorias, derrotas: t.derrotas, winrate, amigos };
}

// Los formatos viejos ("mejor_kda", "peor_kda", "mejor_partida", "peor_partida") se ignoran.
function validarPartida(t) {
  return (
    conteo(t.asesinatos) &&
    conteo(t.muertes) &&
    conteo(t.asistencias) &&
    decimal(t.kda) &&
    RESULTADOS_OK.has(t.resultado) &&
    fechaValida(t.fecha) &&
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

// Máximo que acepta Date (año 275760): fuera de eso, formatear la fecha lanza RangeError.
const MAX_FECHA_MS = 8.64e15;
const fechaValida = (v) => Number.isInteger(v) && v > 0 && v <= MAX_FECHA_MS;
const fechaMs = (v) => (fechaValida(v) ? v : null);

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
  if (validar === validarBalance) return completarBalance(tarjeta, amigos);
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
    hoy_desde: fechaMs(destacados.hoy_desde),
    ...tarjetas,
  };
}

const DIA_MS = 24 * 3600 * 1000;

/**
 * true si el "día" de los datos ya terminó: pasaron 24 h o más desde `hoyDesde`
 * (lol.json quedó viejo). Sin `hoyDesde` (archivos viejos) o sin `ahora`, false.
 */
export function hoyVencido(hoyDesde, ahora) {
  if (!esNumero(hoyDesde) || !esNumero(ahora)) return false;
  return ahora - hoyDesde >= DIA_MS;
}

/** Destacados con las tarjetas de hoy en null si su día ya terminó. */
export function destacadosVigentes(destacados, ahora) {
  if (!destacados || !hoyVencido(destacados.hoy_desde, ahora)) return destacados;
  const vigentes = { ...destacados };
  for (const clave of CLAVES_HOY) vigentes[clave] = null;
  return vigentes;
}

/** true si ninguna de las tarjetas `claves` (por defecto, las de 7 días) tiene datos. */
export function destacadosVacios(destacados, claves = CLAVES_SEMANA) {
  return claves.every((clave) => !destacados?.[clave]);
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
