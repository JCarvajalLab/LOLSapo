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

/** "Platino III · 38 LP" o null si no hay rango. */
export function textoRangoTft(rango) {
  const nombre = nombreRango(rango);
  if (!nombre) return null;
  return `${nombre} · ${esNumero(rango.lp) ? rango.lp : 0} LP`;
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

/**
 * Estadísticas de las partidas recientes para la tarjeta de resumen (dona + métricas).
 * Calcula total, victorias (top 4), derrotas (5-8), primeros (1.º), porcentaje y puesto promedio.
 */
export function resumenRecienteTft(historial, filtro = "todos") {
  const puestos = historialDe(historial, filtro);
  if (!Array.isArray(puestos) || puestos.length === 0) return null;

  const total = puestos.length;
  const primeros = puestos.filter((p) => p.puesto === 1).length;
  const top4 = puestos.filter((p) => p.puesto <= 4).length;
  const derrotas = total - top4;
  const top2a4 = top4 - primeros;
  const sumaPuestos = puestos.reduce((acc, p) => acc + (p.puesto || 0), 0);
  const promedio = sumaPuestos / total;
  const pctTop4 = (top4 / total) * 100;

  return {
    total,
    primeros,
    top2a4,
    top4,
    derrotas,
    pctTop4,
    promedio,
  };
}

export const PERIODOS_STATS_TFT = ["ultimos_30_dias", "temporada_2026"];

export const TEXTOS_PERIODO_STATS_TFT = {
  ultimos_30_dias: {
    boton: "Últimos 30 días",
    subtitulo: (n) => (n === 1 ? "Última partida" : `Últimas ${n} partidas`),
  },
  temporada_2026: {
    boton: "Temporada 2026",
    subtitulo: (n) => `Temporada 2026 · ${n} ${n === 1 ? "partida" : "partidas"}`,
  },
};

/**
 * Calcula estadísticas detalladas y la distribución de puestos (1.º a 8.º)
 * para el modal de perfil de estadísticas de TFT según período y modo.
 */
export function estadisticasDetalladasTft(amigo, periodo = "ultimos_30_dias", modo = "ranked") {
  if (!amigo || typeof amigo !== "object") return null;

  let partidas = 0;
  const conteo = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  let promedio = null;
  let top4 = 0;
  let primeros = 0;

  if (periodo === "ultimos_30_dias") {
    const historial = historialDe(amigo.historial, modo);
    partidas = historial.length;
    if (partidas > 0) {
      let suma = 0;
      for (const h of historial) {
        const p = h.puesto;
        if (Number.isInteger(p) && p >= 1 && p <= 8) {
          conteo[p] = (conteo[p] || 0) + 1;
          suma += p;
        }
      }
      primeros = conteo[1];
      top4 = conteo[1] + conteo[2] + conteo[3] + conteo[4];
      promedio = Math.round((suma / partidas) * 100) / 100;
    }
  } else {
    // temporada_2026
    let stats = null;
    if (modo === "todos") {
      stats = amigo.estadisticas?.total;
    } else {
      const porModo = Array.isArray(amigo.estadisticas?.por_modo) ? amigo.estadisticas.por_modo : [];
      stats = porModo.find((m) => m && m.categoria === modo) ?? null;
      if (!stats && modo === "ranked") {
        stats =
          porModo.find(
            (m) => m && (m.queue_id === 1100 || m.nombre?.toLowerCase().includes("clasificatoria"))
          ) ?? null;
      }
    }

    if (stats) {
      partidas = Number.isInteger(stats.partidas) ? stats.partidas : 0;
      primeros = Number.isInteger(stats.primeros) ? stats.primeros : 0;
      top4 = Number.isInteger(stats.top4) ? stats.top4 : 0;
      promedio = typeof stats.promedio === "number" ? stats.promedio : null;

      if (stats.puestos && typeof stats.puestos === "object") {
        for (let p = 1; p <= 8; p++) {
          conteo[p] = stats.puestos[String(p)] || stats.puestos[p] || 0;
        }
      } else {
        const historial = historialDe(amigo.historial, modo);
        for (const h of historial) {
          if (Number.isInteger(h.puesto) && h.puesto >= 1 && h.puesto <= 8) {
            conteo[h.puesto] = (conteo[h.puesto] || 0) + 1;
          }
        }
      }
    }
  }

  const bot4 = Math.max(0, partidas - top4);
  const top4Pct = partidas > 0 ? Math.round((top4 * 1000) / partidas) / 10 : null;
  const primerosPct = partidas > 0 ? Math.round((primeros * 1000) / partidas) / 10 : null;

  const maxCantidad = Math.max(...Object.values(conteo), 1);
  const filasPuestos = [1, 2, 3, 4, 5, 6, 7, 8].map((puesto) => {
    const cantidad = conteo[puesto] || 0;
    const pct = partidas > 0 ? Math.round((cantidad / partidas) * 100) : 0;
    const anchoPct = (cantidad / maxCantidad) * 100;
    return {
      puesto,
      cantidad,
      porcentaje: pct,
      anchoPct,
    };
  });

  return {
    partidas,
    primeros,
    top4,
    bot4,
    top4Pct,
    primerosPct,
    promedio,
    puestos: filasPuestos,
  };
}
