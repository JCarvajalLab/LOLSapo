// Cálculos y textos de TFT. Funciones puras, sin React.
import { categoriaDe, esFiltroValido } from "./filtros.js";
import { esNumero, nombreRango } from "./formato.js";

/**
 * Colores del puesto final (1 a 8). El número siempre se muestra en texto;
 * el color solo refuerza: 1.º dorado, 2.º a 4.º verde (top 4), 5.º a 8.º rojo.
 */
const PUESTOS = {
  primero: {
    grupo: "primero",
    texto: "text-oro",
    borde: "border-l-oro",
    fondo: "bg-oro-fondo",
    celda: "border-oro bg-oro-fondo text-oro font-bold",
    descripcion: "primer lugar",
  },
  top4: {
    grupo: "top4",
    texto: "text-victoria",
    borde: "border-l-victoria",
    fondo: "bg-victoria-fondo",
    celda: "border-victoria/40 bg-victoria-fondo text-victoria font-semibold",
    descripcion: "top 4",
  },
  // En la grilla de historial, 5.º a 8.º van apagados: sin fondo de color, solo el número en rojo.
  abajo: {
    grupo: "abajo",
    texto: "text-derrota",
    borde: "border-l-derrota",
    fondo: "bg-derrota-fondo",
    celda: "border-borde bg-fondo text-derrota",
    descripcion: "fuera del top 4",
  },
  desconocido: {
    grupo: "desconocido",
    texto: "text-texto-suave",
    borde: "border-l-borde",
    fondo: "bg-superficie",
    celda: "border-borde bg-fondo text-texto-suave",
    descripcion: "sin puesto",
  },
};

export function estiloPuesto(puesto) {
  if (!Number.isInteger(puesto) || puesto < 1 || puesto > 8) return PUESTOS.desconocido;
  if (puesto === 1) return PUESTOS.primero;
  if (puesto <= 4) return PUESTOS.top4;
  return PUESTOS.abajo;
}

/** "1.º", "5.º" o "—". */
export function textoPuesto(puesto) {
  return Number.isInteger(puesto) && puesto >= 1 ? `${puesto}.º` : "—";
}

const promedioFmt = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Puesto promedio con un decimal ("4,3") o "—". */
export function formatearPromedio(promedio) {
  return esNumero(promedio) && promedio > 0 ? promedioFmt.format(promedio) : "—";
}

/** % de top 4 de un rango de liga (en TFT, los "wins" de Riot son top 4). */
export function top4DeRango(rango) {
  if (!rango || !esNumero(rango.top4) || !esNumero(rango.partidas) || rango.partidas <= 0) return null;
  return Math.round((rango.top4 / rango.partidas) * 1000) / 10;
}

/** "Platino III · 38 LP" o null si no hay rango. */
export function textoRangoTft(rango) {
  const nombre = nombreRango(rango);
  if (!nombre) return null;
  return `${nombre} · ${esNumero(rango.lp) ? rango.lp : 0} LP`;
}

/** Tiers de Hyper Roll: nombre en español y clase de color. */
const TIERS_TURBO = {
  GRAY: { nombre: "Gris", clase: "text-costo-1" },
  GREEN: { nombre: "Verde", clase: "text-costo-2" },
  BLUE: { nombre: "Azul", clase: "text-costo-3" },
  PURPLE: { nombre: "Morado", clase: "text-costo-4" },
  ORANGE: { nombre: "Naranja", clase: "text-naranja" },
};

/** { nombre, clase } del tier de Hyper Roll, o null. */
export function tierTurbo(rango) {
  if (!rango || typeof rango.tier !== "string") return null;
  return TIERS_TURBO[rango.tier.toUpperCase()] ?? { nombre: rango.tier, clase: "text-texto" };
}

/** Estilos de rasgo de Riot: 1 bronce, 2 plata, 3 oro, 4 prismático. */
const ESTILOS_RASGO = {
  1: { nombre: "bronce", fondo: "bg-rasgo-bronce" },
  2: { nombre: "plata", fondo: "bg-rasgo-plata" },
  3: { nombre: "oro", fondo: "bg-rasgo-oro" },
  4: { nombre: "prismático", fondo: "bg-rasgo-prisma" },
};

export function estiloRasgo(estilo) {
  return ESTILOS_RASGO[estilo] ?? { nombre: "activo", fondo: "bg-superficie-alta" };
}

/**
 * Rasgos activos para mostrar: los de varias unidades primero (en su orden),
 * los únicos (de una sola unidad) al final.
 */
export function rasgosParaMostrar(rasgos) {
  if (!Array.isArray(rasgos)) return [];
  const validos = rasgos.filter((r) => r && typeof r === "object" && typeof r.id === "string");
  return [...validos.filter((r) => !r.unico), ...validos.filter((r) => r.unico)];
}

// Clases escritas completas para que Tailwind las detecte.
const BORDES_COSTO = {
  1: "border-costo-1",
  2: "border-costo-2",
  3: "border-costo-3",
  4: "border-costo-4",
  5: "border-costo-5",
};

/** Clase del borde de una unidad según su costo (1 a 5). */
export function claseCosto(costo) {
  return BORDES_COSTO[costo] ?? "border-borde";
}

/** Clase de las estrellas: 2 plata, 3 o más dorado. */
export function claseEstrellas(estrellas) {
  if (estrellas >= 3) return "text-oro";
  if (estrellas === 2) return "text-rasgo-plata";
  return "text-rasgo-bronce";
}

/** Datos de la fila cerrada de un amigo: rango Ranked, top 4 %, promedio y partidas. */
export function resumenTft(amigo) {
  const total = amigo?.estadisticas?.total ?? {};
  const ranked = amigo?.rangos?.ranked ?? null;
  return {
    rango: nombreRango(ranked),
    lp: ranked && esNumero(ranked.lp) ? ranked.lp : null,
    top4: esNumero(total.top4_pct) ? total.top4_pct : null,
    promedio: esNumero(total.promedio) ? total.promedio : null,
    partidas: esNumero(total.partidas) ? total.partidas : 0,
  };
}

const partidasDe = (amigo) => {
  const n = amigo?.estadisticas?.total?.partidas;
  return esNumero(n) ? n : 0;
};
const top4PctDe = (amigo) => {
  const pct = amigo?.estadisticas?.total?.top4_pct;
  return esNumero(pct) ? pct : null;
};
const idOrden = (amigo) => (typeof amigo?.riot_id === "string" ? amigo.riot_id.toLocaleLowerCase("es") : "");

/**
 * Orden de las filas de amigos en TFT (no del ranking): más partidas registradas primero.
 * Empates: mayor % de top 4 (sin dato al final) y luego Riot ID alfabético sin mayúsculas.
 * Devuelve una copia; no modifica la lista original.
 */
export function ordenarAmigosTft(amigos) {
  if (!Array.isArray(amigos)) return [];
  return [...amigos].sort((a, b) => {
    const porPartidas = partidasDe(b) - partidasDe(a);
    if (porPartidas !== 0) return porPartidas;
    const pa = top4PctDe(a);
    const pb = top4PctDe(b);
    if (pa !== pb) {
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pb - pa;
    }
    return idOrden(a).localeCompare(idOrden(b), "es");
  });
}

const RESUMEN_VACIO = { partidas: 0, primeros: 0, top4: 0, top4_pct: null, promedio: null };

/**
 * Partidas, primeros, top 4 (y su %) y puesto promedio del filtro elegido.
 * Con "todos" usa el total; con una categoría suma los modos de esa categoría
 * (tft.json no trae totales por categoría). El promedio se pondera por partidas.
 */
export function resumenTftDe(estadisticas, filtro) {
  if (!estadisticas) return RESUMEN_VACIO;
  if (filtro === "todos" || !esFiltroValido(filtro)) return { ...RESUMEN_VACIO, ...(estadisticas.total ?? {}) };
  const modos = Array.isArray(estadisticas.por_modo) ? estadisticas.por_modo.filter(Boolean) : [];
  let partidas = 0;
  let primeros = 0;
  let top4 = 0;
  let sumaPuestos = 0;
  let conPromedio = 0;
  for (const m of modos) {
    if (categoriaDe(m) !== filtro || !esNumero(m.partidas) || m.partidas <= 0) continue;
    partidas += m.partidas;
    primeros += esNumero(m.primeros) ? m.primeros : 0;
    top4 += esNumero(m.top4) ? m.top4 : 0;
    if (esNumero(m.promedio)) {
      sumaPuestos += m.promedio * m.partidas;
      conPromedio += m.partidas;
    }
  }
  if (partidas === 0) return RESUMEN_VACIO;
  return {
    partidas,
    primeros,
    top4,
    top4_pct: Math.round((top4 * 1000) / partidas) / 10,
    promedio: conPromedio > 0 ? Math.round((sumaPuestos * 100) / conPromedio) / 100 : null,
  };
}

/** Puestos del historial (ya validado) que entran en el filtro elegido, en el mismo orden. */
export function historialDe(historial, filtro) {
  if (!Array.isArray(historial)) return [];
  if (filtro === "todos" || !esFiltroValido(filtro)) return historial;
  return historial.filter((h) => categoriaDe(h) === filtro);
}

/** "Posición en las últimas 12 partidas" o "Posición en la última partida". */
export function tituloHistorial(cantidad) {
  if (cantidad === 1) return "Posición en la última partida";
  return cantidad > 1 ? `Posición en las últimas ${cantidad} partidas` : "Posición en las últimas partidas";
}
