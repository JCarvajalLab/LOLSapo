/**
 * Lógica pura para el calendario de actividad (heatmap estilo GitHub / OP.GG).
 * No depende de React.
 */

export const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const DIAS_SEMANA_CORTOS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/**
 * Convierte un objeto Date (en horario local del usuario o UTC) a clave ISO 'YYYY-MM-DD'.
 */
export function fechaAClaveIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Extrae o sintetiza un mapa de actividad diaria a partir del campo actividad
 * o como fallback desde las partidas del amigo si actividad no vino en el JSON.
 */
export function extraerActividad(actividad, partidas = []) {
  if (actividad && typeof actividad === "object" && Object.keys(actividad).length > 0) {
    return actividad;
  }
  const resultado = {};
  if (Array.isArray(partidas)) {
    for (const p of partidas) {
      if (!p || typeof p.fecha !== "number") continue;
      const d = new Date(p.fecha);
      const claveIso = fechaAClaveIso(d);
      if (!resultado[claveIso]) {
        resultado[claveIso] = {
          partidas: 0,
          victorias: 0,
          derrotas: 0,
          remakes: 0,
          duracion: 0,
        };
      }
      resultado[claveIso].partidas += 1;
      if (p.resultado === "victoria") resultado[claveIso].victorias += 1;
      else if (p.resultado === "derrota") resultado[claveIso].derrotas += 1;
      else if (p.resultado === "remake") resultado[claveIso].remakes += 1;
      if (typeof p.duracion === "number" && p.duracion > 0) {
        resultado[claveIso].duracion += Math.round(p.duracion);
      }
    }
  }
  return resultado;
}

/**
 * Nivel de calor (0 a 3) según la cantidad de partidas jugadas en el día.
 */
export function nivelCalor(partidas) {
  if (!Number.isFinite(partidas) || partidas <= 0) return 0;
  if (partidas <= 2) return 1;
  if (partidas <= 5) return 2;
  return 3;
}

/**
 * Formatea duración acumulada en segundos a formato amigable: "3 h 9 min", "45 min".
 */
export function formatearTiempoJugado(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "0 min";
  const minsTotales = Math.round(segundos / 60);
  const horas = Math.floor(minsTotales / 60);
  const mins = minsTotales % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} h`;
  return `${horas} h ${mins} min`;
}

/**
 * Formatea una clave ISO 'YYYY-MM-DD' a formato día legible: '09/10/2026'.
 */
export function formatearFechaCorta(claveIso) {
  if (!claveIso || typeof claveIso !== "string") return "—";
  const partes = claveIso.split("-");
  if (partes.length !== 3) return claveIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Genera la matriz de semanas (de lunes a domingo) para el heatmap.
 * @param {Object} actividad Mapa { [fechaIso]: { partidas, victorias, derrotas, remakes, duracion } }
 * @param {number} ahoraMs Timestamp en ms que representa la fecha de referencia
 * @param {number} totalSemanas Cantidad de semanas a mostrar (por defecto 15 semanas ~3.5 meses)
 * @returns {Array<{ fechaIso: string, diaSemana: number, partidas: number, victorias: number, derrotas: number, remakes: number, duracion: number, esFuturo: boolean }[]>}
 */
export function generarMatrizActividad(actividad = {}, ahoraMs = Date.now(), totalSemanas = 15) {
  const ahora = new Date(ahoraMs);
  ahora.setHours(23, 59, 59, 999);

  // Día de la semana en JS: 0=Domingo, 1=Lunes, ..., 6=Sábado
  // Convertimos a 0=Lunes, 1=Martes, ..., 6=Domingo
  const diaSemanaHoy = (ahora.getDay() + 6) % 7;

  // Encontrar el domingo de la semana actual
  const finSemanaActual = new Date(ahora);
  finSemanaActual.setDate(ahora.getDate() + (6 - diaSemanaHoy));

  // El inicio de la matriz es totalSemanas hacia atrás desde el lunes de esa semana
  const inicioMatriz = new Date(finSemanaActual);
  inicioMatriz.setDate(finSemanaActual.getDate() - (totalSemanas * 7 - 1));
  inicioMatriz.setHours(0, 0, 0, 0);

  const semanas = [];
  const cursor = new Date(inicioMatriz);

  for (let s = 0; s < totalSemanas; s++) {
    const diasSemana = [];
    for (let d = 0; d < 7; d++) {
      const fechaIso = fechaAClaveIso(cursor);
      const esFuturo = cursor.getTime() > ahora.getTime();
      const datosDia = (!esFuturo && actividad && actividad[fechaIso]) || {};

      diasSemana.push({
        fechaIso,
        diaMes: cursor.getDate(),
        mes: cursor.getMonth(),
        diaSemana: d,
        esFuturo,
        partidas: datosDia.partidas || 0,
        victorias: datosDia.victorias || 0,
        derrotas: datosDia.derrotas || 0,
        remakes: datosDia.remakes || 0,
        duracion: datosDia.duracion || 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(diasSemana);
  }

  return semanas;
}

/**
 * Genera la lista de etiquetas de meses situadas en las columnas correspondientes.
 * Devuelve un array de objetos { columna: number, etiqueta: string }
 */
export function generarEtiquetasMeses(semanas) {
  if (!Array.isArray(semanas) || semanas.length === 0) return [];
  const etiquetas = [];
  let ultimoMes = -1;

  semanas.forEach((semana, colIndex) => {
    // Tomamos el mes del primer día o el día central de la semana
    const primerDia = semana[0];
    if (primerDia && primerDia.mes !== ultimoMes) {
      etiquetas.push({
        columna: colIndex,
        etiqueta: MESES_CORTOS[primerDia.mes],
      });
      ultimoMes = primerDia.mes;
    }
  });

  return etiquetas;
}
