// Cálculos y textos de TFT. Funciones puras, sin React.
import { esNumero, nombreRango } from "./formato.js";

/**
 * Colores del puesto final (1 a 8). El número siempre se muestra en texto;
 * el color solo refuerza: 1.º dorado, 2.º a 4.º verde (top 4), 5.º a 8.º rojo.
 */
const PUESTOS = {
  primero: { grupo: "primero", texto: "text-oro", borde: "border-l-oro", fondo: "bg-oro-fondo", descripcion: "primer lugar" },
  top4: { grupo: "top4", texto: "text-victoria", borde: "border-l-victoria", fondo: "bg-victoria-fondo", descripcion: "top 4" },
  abajo: { grupo: "abajo", texto: "text-derrota", borde: "border-l-derrota", fondo: "bg-derrota-fondo", descripcion: "fuera del top 4" },
  desconocido: { grupo: "desconocido", texto: "text-texto-suave", borde: "border-l-borde", fondo: "bg-superficie", descripcion: "sin puesto" },
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
