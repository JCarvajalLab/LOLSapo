// Destacados de LoL (lol.json → "destacados"): los de hoy, los de la semana (lunes a domingo)
// y los del mes.
// Validación al leer el JSON y formato de los números. No depende de React.
import { esNumero } from "./formato.js";

/** Tarjetas de hoy (desde las 12:00 de Chile), en el orden de la fila: el balance al centro. */
export const CLAVES_HOY = ["mejor_jugador_hoy", "balance_hoy", "peor_jugador_hoy"];

/**
 * Tarjetas de la semana (lunes 01:00 de Chile a domingo, solo partidas en equipo), en el
 * orden que decidió Deo.
 */
export const CLAVES_SEMANA = [
  "mas_partidas",
  "mejor_winrate",
  "mejor_jugador_semana",
  "racha_victorias_grupo",
  "racha_derrotas_grupo",
  "peor_jugador_semana",
];

/**
 * Tarjetas del mes (del día 1 a la 01:00 de Chile al mes siguiente, solo partidas en equipo),
 * en el orden de la fila, como las de hoy: el balance al centro.
 */
export const CLAVES_MES = ["mejor_jugador_mes", "balance_mes", "peor_jugador_mes"];

/** Todas las tarjetas que se validan. */
export const CLAVES_DESTACADOS = [...CLAVES_HOY, ...CLAVES_SEMANA, ...CLAVES_MES];

/**
 * Tarjetas que abren un top 5 del grupo (lol.json → "destacados.tops"). Las rachas no:
 * son del equipo, no de un amigo.
 */
export const CLAVES_TOPS = CLAVES_DESTACADOS.filter(
  (clave) => clave !== "racha_victorias_grupo" && clave !== "racha_derrotas_grupo",
);

/** Máximo de filas de un top. */
export const MAX_TOP = 5;

/** Nombres de los meses en español, en el orden del calendario (los mismos del recolector). */
export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

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
  mejor_jugador_mes: validarPartida,
  peor_jugador_mes: validarPartida,
  balance_mes: validarBalance,
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

/**
 * Partidas jugadas por amigo: entero de 1 a `total`; si falta, es inválido o el archivo
 * no trae el objeto (archivos viejos), vale `total`.
 */
function partidasPorAmigo(crudas, amigos, total) {
  const objeto = crudas && typeof crudas === "object" && !Array.isArray(crudas) ? crudas : {};
  const resultado = {};
  for (const slug of amigos) {
    const n = Object.hasOwn(objeto, slug) ? objeto[slug] : undefined;
    resultado[slug] = Number.isInteger(n) && n >= 1 && n <= total ? n : total;
  }
  return resultado;
}

/**
 * Solo los campos conocidos; sin winrate se calcula con las victorias. `jugadas` dice
 * cuántas de las partidas en grupo jugó cada amigo (ver `partidasPorAmigo`).
 */
function completarBalance(t, amigos) {
  const winrate = esNumero(t.winrate) ? t.winrate : (t.victorias / t.partidas) * 100;
  const jugadas = partidasPorAmigo(t.jugadas, amigos, t.partidas);
  return { partidas: t.partidas, victorias: t.victorias, derrotas: t.derrotas, winrate, amigos, jugadas };
}

/**
 * Récord de un amigo en un top (balance, más partidas y mejor winrate): enteros coherentes
 * (victorias + derrotas = partidas, al menos 1) y winrate de 0 a 100.
 */
function validarRecord(t) {
  return validarBalance(t) && decimal(t.winrate) && t.winrate <= 100;
}

/** Tops que son de partidas (mejor y peor jugador); el resto son récords. */
export const esTopDePartida = (clave) => VALIDADORES[clave] === validarPartida;

/**
 * Una entrada de un top validada o null: un solo slug, conocido, en `amigos`; la partida con
 * los mismos validadores de la tarjeta y el récord solo con sus campos conocidos.
 */
function validarEntradaTop(clave, entrada, slugs) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return null;
  const { amigos } = entrada;
  if (!Array.isArray(amigos) || amigos.length !== 1 || !slugs.has(amigos[0])) return null;
  if (esTopDePartida(clave)) return validarTarjeta(clave, entrada, slugs);
  if (!validarRecord(entrada)) return null;
  const { partidas, victorias, derrotas, winrate } = entrada;
  return { amigos: [amigos[0]], partidas, victorias, derrotas, winrate };
}

/**
 * Tops validados ({ clave: [entradas] } solo con las claves de `CLAVES_TOPS`) o null si el
 * archivo no trae el campo (archivos viejos). Se respeta el orden del recolector; se
 * descartan las entradas inválidas y las de un amigo repetido, y quedan como máximo 5.
 */
export function validarTops(tops, slugs) {
  if (!tops || typeof tops !== "object" || Array.isArray(tops)) return null;
  const resultado = {};
  for (const clave of CLAVES_TOPS) {
    const lista = Object.hasOwn(tops, clave) && Array.isArray(tops[clave]) ? tops[clave] : [];
    const vistos = new Set();
    const validas = [];
    for (const entrada of lista) {
      const ok = validarEntradaTop(clave, entrada, slugs);
      if (!ok || vistos.has(ok.amigos[0])) continue;
      vistos.add(ok.amigos[0]);
      validas.push(ok);
      if (validas.length === MAX_TOP) break;
    }
    resultado[clave] = validas;
  }
  return resultado;
}

/** Tarjetas con top global (lol.json → "destacados.tops_global"): mejor y peor jugador. */
export const CLAVES_TOPS_GLOBAL = CLAVES_TOPS.filter((clave) => esTopDePartida(clave));

/**
 * Tops globales validados ({ clave: [entradas] } solo con las claves de `CLAVES_TOPS_GLOBAL`)
 * o null si el archivo no trae el campo. Son las mejores/peores partidas del período, así que
 * un amigo puede repetirse. Se respeta el orden del recolector, se descartan las entradas
 * inválidas y quedan como máximo 5.
 */
export function validarTopsGlobal(tops, slugs) {
  if (!tops || typeof tops !== "object" || Array.isArray(tops)) return null;
  const resultado = {};
  for (const clave of CLAVES_TOPS_GLOBAL) {
    const lista = Object.hasOwn(tops, clave) && Array.isArray(tops[clave]) ? tops[clave] : [];
    const validas = [];
    for (const entrada of lista) {
      const ok = validarEntradaTop(clave, entrada, slugs);
      if (!ok) continue;
      validas.push(ok);
      if (validas.length === MAX_TOP) break;
    }
    resultado[clave] = validas;
  }
  return resultado;
}

/**
 * El top global de una tarjeta, o null si no hay: no es de mejor/peor jugador, la tarjeta
 * está vacía o vencida, el archivo no trae tops globales o la lista está vacía.
 */
export function topGlobalDe(destacados, clave) {
  if (!CLAVES_TOPS_GLOBAL.includes(clave) || !destacados?.[clave]) return null;
  const lista = destacados.tops_global?.[clave];
  return Array.isArray(lista) && lista.length > 0 ? lista : null;
}

/**
 * El top de una tarjeta, o null si no se puede abrir: rachas, tarjeta vacía o vencida,
 * archivo sin tops o lista vacía.
 */
export function topDe(destacados, clave) {
  if (!CLAVES_TOPS.includes(clave) || !destacados?.[clave]) return null;
  const lista = destacados.tops?.[clave];
  return Array.isArray(lista) && lista.length > 0 ? lista : null;
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
  const partidas = partidasPorAmigo(t.partidas, amigos, t.racha);
  let desde = fechaMs(t.desde);
  let hasta = fechaMs(t.hasta);
  if (desde === null) desde = hasta;
  if (hasta === null) hasta = desde;
  if (desde !== null && hasta < desde) [desde, hasta] = [hasta, desde];
  return { racha: t.racha, amigos, partidas, desde, hasta };
}

/**
 * El mes de los destacados del mes, solo con los campos conocidos, o null si falta o algo
 * no cuadra (año 2026–2100, mes 1–12 con su nombre, `desde` < `hasta`, `cerrado` booleano).
 * Sin mes válido la sección del mes no se muestra.
 */
export function validarMes(mes) {
  if (!mes || typeof mes !== "object" || Array.isArray(mes)) return null;
  const { anio, mes: numero, nombre, desde, hasta, cerrado } = mes;
  const ok =
    Number.isInteger(anio) &&
    anio >= 2026 &&
    anio <= 2100 &&
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= 12 &&
    nombre === MESES[numero - 1] &&
    fechaValida(desde) &&
    fechaValida(hasta) &&
    desde < hasta &&
    typeof cerrado === "boolean";
  return ok ? { anio, mes: numero, nombre, desde, hasta, cerrado } : null;
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
  // `dias` y `desde` (ventana de 7 días de archivos viejos) se ignoran.
  return {
    semana_desde: fechaMs(destacados.semana_desde),
    hoy_desde: fechaMs(destacados.hoy_desde),
    mes: validarMes(destacados.mes),
    ...tarjetas,
    tops: validarTops(destacados.tops, slugs),
    tops_global: validarTopsGlobal(destacados.tops_global, slugs),
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

const SEMANA_MS = 7 * DIA_MS;

/**
 * true si la semana de los datos ya terminó: pasaron 7 días o más desde `semanaDesde`
 * (lunes 01:00 de Chile; lol.json quedó viejo). Sin `semanaDesde` o sin `ahora`, false.
 */
export function semanaVencida(semanaDesde, ahora) {
  if (!esNumero(semanaDesde) || !esNumero(ahora)) return false;
  return ahora - semanaDesde >= SEMANA_MS;
}

/** Días después del fin del mes en que el recolector todavía lo muestra, ya cerrado. */
export const DIAS_MES_CERRADO = 3;

/**
 * true si el mes de los datos ya no debería verse: pasaron `DIAS_MES_CERRADO` días o más
 * desde `mes.hasta` (lol.json quedó viejo). Sin mes válido o sin `ahora`, false.
 */
export function mesVencido(mes, ahora) {
  if (!mes || !esNumero(mes.hasta) || !esNumero(ahora)) return false;
  return ahora >= mes.hasta + DIAS_MES_CERRADO * DIA_MS;
}

/**
 * Destacados con las tarjetas de hoy en null si su día ya terminó, las de la semana en
 * null si su semana ya terminó y las del mes en null si su mes quedó atrás (sus tops y
 * tops globales también).
 * No modifica el original; si nada venció, lo devuelve tal cual.
 */
export function destacadosVigentes(destacados, ahora) {
  if (!destacados) return destacados;
  const vencidas = [
    ...(hoyVencido(destacados.hoy_desde, ahora) ? CLAVES_HOY : []),
    ...(semanaVencida(destacados.semana_desde, ahora) ? CLAVES_SEMANA : []),
    ...(mesVencido(destacados.mes, ahora) ? CLAVES_MES : []),
  ];
  if (vencidas.length === 0) return destacados;
  const vigentes = { ...destacados };
  for (const clave of vencidas) vigentes[clave] = null;
  if (destacados.tops) {
    vigentes.tops = { ...destacados.tops };
    for (const clave of vencidas) if (Object.hasOwn(vigentes.tops, clave)) vigentes.tops[clave] = null;
  }
  if (destacados.tops_global) {
    vigentes.tops_global = { ...destacados.tops_global };
    for (const clave of vencidas) {
      if (Object.hasOwn(vigentes.tops_global, clave)) vigentes.tops_global[clave] = null;
    }
  }
  return vigentes;
}

/** true si ninguna de las tarjetas `claves` (por defecto, las de la semana) tiene datos. */
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

/**
 * Nota de un jugador del balance de hoy o de una racha en equipo: « (2 partidas)» si jugó
 * menos que el total, "" si jugó todas o no hay dato.
 */
export function notaJugadas(jugadas, total) {
  if (!Number.isInteger(jugadas) || !Number.isInteger(total) || jugadas >= total) return "";
  return ` (${plural(jugadas, "partida")})`;
}

/** "1 partida", "8 partidas". */
export function plural(cantidad, singular, pluralTexto = `${singular}s`) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
