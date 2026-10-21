// Lógica para formatear, extraer y comparar récords en el frontend.
import { fechaRecordDetalle } from "./formato.js";

export const OPCIONES_PERIODOS = [
  { clave: "dias_30", etiqueta: "30 días" },
  { clave: "dias_90", etiqueta: "90 días" },
  { clave: "anio_2026", etiqueta: "2026" },
];

export function valorRecord(item) {
  if (!item) return "—";
  if (item.valor !== undefined && item.valor !== null) return String(item.valor);
  if (item.valor_formateado !== undefined && item.valor_formateado !== null) return String(item.valor_formateado);
  if (item.valor_raw !== undefined && item.valor_raw !== null) return String(item.valor_raw);
  return "—";
}

export function fechaRecord(fecha) {
  if (!fecha) return "";
  if (typeof fecha === "number") return fechaRecordDetalle(fecha);
  return String(fecha);
}

export function esVictoriaRecord(item) {
  if (!item) return false;
  if (typeof item.victoria === "boolean") return item.victoria;
  if (item.resultado === "victoria") return true;
  return false;
}

export const DEFINICION_METRICAS = [
  // Básicos
  {
    categoria: "basicos",
    clave: "kda",
    titulo: "KDA más alto",
    descripcion: "Mayor ratio KDA en una partida",
    tipo: "numero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "asesinatos",
    titulo: "Asesinatos (Kills)",
    descripcion: "Mayor número de kills",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "asistencias",
    titulo: "Asistencias",
    descripcion: "Mayor número de asistencias",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "muertes",
    titulo: "Más Muertes",
    descripcion: "Partida con más muertes",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "oro",
    titulo: "Oro ganado",
    descripcion: "Mayor cantidad de oro en una partida",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "cs",
    titulo: "Súbditos (CS)",
    descripcion: "Mayor farm en una partida",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "basicos",
    clave: "cs_minuto",
    titulo: "Súbditos / Minuto",
    descripcion: "Mayor ritmo de CS por minuto",
    tipo: "numero",
    mejor: "mayor",
  },

  // Impacto
  {
    categoria: "impacto",
    clave: "danio",
    titulo: "Daño a campeones",
    descripcion: "Mayor daño infligido a campeones",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "impacto",
    clave: "danio_recibido",
    titulo: "Daño recibido",
    descripcion: "Mayor daño mitigado/tanqueado",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "impacto",
    clave: "danio_objetivos",
    titulo: "Daño a objetivos",
    descripcion: "Mayor daño a dragones, barones y torres",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "impacto",
    clave: "participacion",
    titulo: "Participación en asesinatos",
    descripcion: "% de presencia en kills del equipo",
    tipo: "porcentaje",
    mejor: "mayor",
  },
  {
    categoria: "impacto",
    clave: "vision",
    titulo: "Puntuación de visión",
    descripcion: "Mayor puntuación de centinelas",
    tipo: "entero",
    mejor: "mayor",
  },

  // Multikills
  {
    categoria: "multikills",
    clave: "pentakills",
    titulo: "Penta kills",
    descripcion: "Asesinatos quíntuples",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "multikills",
    clave: "quadrakills",
    titulo: "Quadra kills",
    descripcion: "Asesinatos cuádruples",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "multikills",
    clave: "triplekills",
    titulo: "Triple kills",
    descripcion: "Asesinatos triples",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "multikills",
    clave: "doblekills",
    titulo: "Double kills",
    descripcion: "Asesinatos dobles",
    tipo: "entero",
    mejor: "mayor",
  },
  {
    categoria: "multikills",
    clave: "racha_asesinatos",
    titulo: "Killing Spree",
    descripcion: "Racha más larga de asesinatos sin morir",
    tipo: "entero",
    mejor: "mayor",
  },

  // Duración y Supervivencia
  {
    categoria: "duracion",
    clave: "partida_mas_larga",
    titulo: "Partida más larga",
    descripcion: "Mayor duración de partida",
    tipo: "duracion",
    mejor: "mayor",
  },
  {
    categoria: "duracion",
    clave: "victoria_mas_rapida",
    titulo: "Victoria más rápida",
    descripcion: "Victoria en el menor tiempo posible",
    tipo: "duracion",
    mejor: "menor",
  },
  {
    categoria: "duracion",
    clave: "tiempo_vivo",
    titulo: "Mayor tiempo vivo",
    descripcion: "Tiempo transcurrido antes de la primera muerte",
    tipo: "duracion",
    mejor: "mayor",
  },
];

export const CATEGORIAS_INFO = [
  {
    clave: "basicos",
    titulo: "Básicos",
    icono: "bar-chart",
    descripcion: "Marcas récord en una sola partida",
  },
  {
    clave: "impacto",
    titulo: "Impacto en partida",
    icono: "zap",
    descripcion: "Mayor contribución en una sola partida",
  },
  {
    clave: "multikills",
    titulo: "Multikills y Rachas",
    icono: "flame",
    descripcion: "Mayor cantidad lograda en una sola partida",
  },
  {
    clave: "duracion",
    titulo: "Duración y Supervivencia",
    icono: "clock",
    descripcion: "Tiempos extremos registrados en una sola partida",
  },
];

/**
 * Obtiene el bloque de récords para un amigo o global y un período específico.
 */
export function obtenerBloqueRecords(records, amigoSlug = "global", periodo = "anio_actual") {
  if (!records || typeof records !== "object") return null;

  const anio = records.anio_actual || 2026;
  let clave = periodo;
  if (periodo === "anio_actual" || periodo === String(anio)) {
    clave = `anio_${anio}`;
  }

  const fuente =
    amigoSlug === "global"
      ? records.global
      : records.por_amigo?.[amigoSlug];

  if (!fuente || typeof fuente !== "object") return null;

  return fuente[clave] ?? fuente[`anio_${anio}`] ?? fuente.todo ?? null;
}

/**
 * Retorna los 5 récords principales para la tarjeta resumen del dashboard.
 */
export function recordsDestacadosTarjeta(bloque) {
  if (!bloque) return [];

  const claves = [
    { cat: "basicos", k: "kda", label: "KDA más alto" },
    { cat: "basicos", k: "asesinatos", label: "Más Kills" },
    { cat: "impacto", k: "danio", label: "Más Daño" },
    { cat: "basicos", k: "asistencias", label: "Más Asistencias" },
    { cat: "basicos", k: "cs", label: "Más Súbditos (CS)" },
  ];

  const resultado = [];
  for (const c of claves) {
    const item = bloque[c.cat]?.[c.k];
    if (item && item.valor_raw !== undefined && item.valor_raw !== null && item.valor_raw > 0) {
      resultado.push({
        ...item,
        metrica_clave: c.k,
        metrica_titulo: c.label,
        valor_formateado: valorRecord(item),
        fecha_formateada: fechaRecord(item.fecha),
      });
    }
  }

  return resultado;
}

/**
 * Compara todas las métricas de récords entre dos bloques (Amigo A vs Amigo B).
 * Retorna el desglose de cada métrica con el ganador y el marcador total.
 */
export function compararRecords(bloqueA, bloqueB, nombreA = "Jugador A", nombreB = "Jugador B") {
  let victoriasA = 0;
  let victoriasB = 0;
  let empates = 0;

  const comparaciones = DEFINICION_METRICAS.map((m) => {
    const itemA = bloqueA?.[m.categoria]?.[m.clave] || null;
    const itemB = bloqueB?.[m.categoria]?.[m.clave] || null;

    let ganador = null;

    if (itemA && itemB) {
      const valA = Number(itemA.valor_raw ?? 0);
      const valB = Number(itemB.valor_raw ?? 0);

      if (valA === valB) {
        ganador = "empate";
        empates++;
      } else if (m.mejor === "menor") {
        if (valA < valB) {
          ganador = "A";
          victoriasA++;
        } else {
          ganador = "B";
          victoriasB++;
        }
      } else {
        if (valA > valB) {
          ganador = "A";
          victoriasA++;
        } else {
          ganador = "B";
          victoriasB++;
        }
      }
    } else if (itemA && !itemB) {
      ganador = "A";
      victoriasA++;
    } else if (!itemA && itemB) {
      ganador = "B";
      victoriasB++;
    }

    return {
      metrica: m,
      itemA,
      itemB,
      ganador, // 'A', 'B', 'empate', null
    };
  });

  return {
    nombreA,
    nombreB,
    marcador: {
      victoriasA,
      victoriasB,
      empates,
      totalComparadas: victoriasA + victoriasB + empates,
    },
    comparaciones,
  };
}
