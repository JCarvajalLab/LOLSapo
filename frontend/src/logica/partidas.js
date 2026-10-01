// Cálculos sobre partidas en vivo y participantes.
import { esNumero } from "./formato.js";

/**
 * Minutos que lleva una partida en curso.
 * Con `inicio` se usa la hora real; si es null, se suma la duración que vio el
 * script más el tiempo pasado desde `actualizado`.
 */
export function minutosEnPartida(partida, actualizadoMs, ahoraMs) {
  if (!partida || !esNumero(ahoraMs)) return null;
  let segundos = null;
  if (esNumero(partida.inicio) && partida.inicio > 0) {
    segundos = (ahoraMs - partida.inicio) / 1000;
  } else if (esNumero(partida.duracion)) {
    const extra = esNumero(actualizadoMs) ? Math.max(0, ahoraMs - actualizadoMs) / 1000 : 0;
    segundos = partida.duracion + extra;
  }
  if (segundos === null) return null;
  return Math.max(0, Math.floor(segundos / 60));
}

/**
 * Agrupa jugadores por su valor de `equipo` (100, 200 o los de Arena),
 * ordenando los equipos de menor a mayor.
 */
export function agruparPorEquipo(jugadores) {
  if (!Array.isArray(jugadores)) return [];
  const grupos = new Map();
  for (const j of jugadores) {
    if (!j || typeof j !== "object") continue;
    const equipo = esNumero(j.equipo) ? j.equipo : 0;
    if (!grupos.has(equipo)) grupos.set(equipo, []);
    grupos.get(equipo).push(j);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([equipo, lista]) => ({ equipo, jugadores: lista }));
}

/** Nombre corto de un equipo para lectores de pantalla y encabezados. */
export function nombreEquipo(equipo, indice) {
  if (equipo === 100) return "Equipo azul";
  if (equipo === 200) return "Equipo rojo";
  return `Equipo ${indice + 1}`;
}

/** Normaliza los equipos de una partida en vivo (acepta equipos o jugadores sueltos). */
export function equiposEnVivo(partida) {
  if (!partida) return [];
  if (Array.isArray(partida.equipos) && partida.equipos.length > 0) {
    const jugadores = partida.equipos.flatMap((e) =>
      Array.isArray(e?.jugadores)
        ? e.jugadores.map((j) => ({ ...j, equipo: esNumero(j?.equipo) ? j.equipo : e.equipo }))
        : [],
    );
    return agruparPorEquipo(jugadores);
  }
  return [];
}

export function esRanked(item) {
  return item?.categoria === "ranked";
}
