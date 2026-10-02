// Funciones puras de formato. No dependen de React.

const TIERS = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Maestro",
  GRANDMASTER: "Gran Maestro",
  CHALLENGER: "Retador",
};

export function esNumero(valor) {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** "Platino IV" o null si no hay rango. */
export function nombreRango(rango) {
  if (!rango || typeof rango.tier !== "string") return null;
  const tier = TIERS[rango.tier.toUpperCase()] ?? rango.tier;
  return rango.division ? `${tier} ${rango.division}` : tier;
}

/** "Diamante IV · 45 LP", "Maestro · 250 LP" o null si no hay rango. */
export function textoRangoLp(rango) {
  const nombre = nombreRango(rango);
  if (!nombre) return null;
  return `${nombre} · ${esNumero(rango.lp) ? rango.lp : 0} LP`;
}

/** Umbrales de color del winrate: verde desde 55%, rojo bajo 45%, neutro entre medio. */
export const WINRATE_BUENO = 55;
export const WINRATE_MALO = 45;

/** Clase de color para un winrate (escala única de la web). */
export function claseWinrate(winrate) {
  if (!esNumero(winrate)) return "text-texto-suave";
  if (winrate >= WINRATE_BUENO) return "text-victoria";
  if (winrate < WINRATE_MALO) return "text-derrota";
  return "text-texto";
}

/**
 * Temporada ranked de un jugador: { winrate, partidas } o null si no hay datos.
 * Usa `winrate` si viene; si no, lo calcula con victorias y derrotas.
 */
export function temporadaRanked(rango) {
  if (!rango || !esNumero(rango.victorias) || !esNumero(rango.derrotas)) return null;
  const partidas = rango.victorias + rango.derrotas;
  if (partidas === 0) return null;
  const winrate = esNumero(rango.winrate) ? rango.winrate : calcularWinrate(rango.victorias, rango.derrotas);
  return { winrate, partidas };
}

const puntosCompactos = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const puntosCompletos = new Intl.NumberFormat("es");

/**
 * Maestría con el campeón de la partida:
 * null si no hay dato; { primeraVez: true } con nivel 0; si no, textos corto y completo.
 */
export function textoMaestria(maestria) {
  if (!maestria || !esNumero(maestria.nivel)) return null;
  if (maestria.nivel === 0) {
    return { primeraVez: true, corto: "Primera vez", titulo: "Nunca había jugado este campeón" };
  }
  const puntos = esNumero(maestria.puntos) ? maestria.puntos : 0;
  // Intl usa espacios duros entre número y "mil"; se cambian por espacios normales.
  const compacto = puntosCompactos.format(puntos).replace(/[\u00a0\u202f]/g, " ");
  return {
    primeraVez: false,
    nivel: `M${maestria.nivel}`,
    puntos: `${compacto} pts`,
    corto: `M${maestria.nivel} · ${compacto} pts`,
    titulo: `Maestría ${maestria.nivel} · ${puntosCompletos.format(puntos)} puntos`,
  };
}

/** Winrate de un rango oficial (victorias y derrotas de Riot). */
export function winrateRango(rango) {
  if (!rango) return null;
  return calcularWinrate(rango.victorias, rango.derrotas);
}

export function calcularWinrate(victorias, derrotas) {
  if (!esNumero(victorias) || !esNumero(derrotas)) return null;
  const total = victorias + derrotas;
  if (total === 0) return null;
  return Math.round((victorias / total) * 1000) / 10;
}

/** "57%" o "—". Redondea a entero para leerlo rápido. */
export function formatearWinrate(winrate) {
  return esNumero(winrate) ? `${Math.round(winrate)}%` : "—";
}

/** Ratio KDA: (asesinatos + asistencias) / muertes. Sin muertes es "Perfecto". */
export function ratioKda(asesinatos, muertes, asistencias) {
  if (![asesinatos, muertes, asistencias].every(esNumero)) return null;
  if (muertes === 0) return "Perfecto";
  return ((asesinatos + asistencias) / muertes).toFixed(2);
}

/** "31 min" a partir de segundos. */
export function formatearDuracion(segundos) {
  if (!esNumero(segundos) || segundos < 0) return "—";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 1) return `${Math.round(segundos)} s`;
  return `${minutos} min`;
}

/** CS por minuto con un decimal, o null. */
export function csPorMinuto(cs, segundos) {
  if (!esNumero(cs) || !esNumero(segundos) || segundos < 60) return null;
  return (cs / (segundos / 60)).toFixed(1);
}

const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const UNIDADES = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 18 horas", "hace 5 minutos", "ahora". */
export function haceCuanto(fechaMs, ahoraMs) {
  if (!esNumero(fechaMs) || !esNumero(ahoraMs)) return "—";
  const segundos = Math.max(0, (ahoraMs - fechaMs) / 1000);
  if (segundos < 60) return "ahora";
  for (const [unidad, tamaño] of UNIDADES) {
    if (segundos >= tamaño) {
      return relativo.format(-Math.floor(segundos / tamaño), unidad);
    }
  }
  return "ahora";
}

const fechaCortaFmt = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const fechaCompletaFmt = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

/** "1 oct 2026" */
export function fechaCorta(fechaMs) {
  if (!esNumero(fechaMs)) return "—";
  return fechaCortaFmt.format(new Date(fechaMs));
}

/** "1 de octubre de 2026, 14:32" en la zona horaria del navegador. */
export function fechaCompleta(fechaMs) {
  if (!esNumero(fechaMs)) return "—";
  return fechaCompletaFmt.format(new Date(fechaMs));
}

/** Convierte el ISO de "actualizado" a milisegundos, o null. */
export function isoAMs(iso) {
  if (typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Iniciales para respaldos de imagen: "Miss Fortune" -> "MF". */
export function iniciales(texto) {
  if (typeof texto !== "string" || !texto.trim()) return "?";
  return texto
    .replace(/#.*$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
