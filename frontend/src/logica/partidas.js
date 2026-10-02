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

/**
 * Normaliza los equipos de una partida en vivo: [{equipo, jugadores, bloqueos}].
 * Los jugadores se agrupan por su `equipo` y los baneos se juntan por equipo.
 */
export function equiposEnVivo(partida) {
  if (!partida || !Array.isArray(partida.equipos)) return [];
  const bloqueos = new Map();
  const jugadores = [];
  for (const e of partida.equipos) {
    if (!e || typeof e !== "object") continue;
    const equipo = esNumero(e.equipo) ? e.equipo : 0;
    const bans = Array.isArray(e.bloqueos) ? e.bloqueos.filter((id) => Number.isInteger(id) && id > 0) : [];
    bloqueos.set(equipo, [...(bloqueos.get(equipo) ?? []), ...bans]);
    for (const j of Array.isArray(e.jugadores) ? e.jugadores : []) {
      if (j && typeof j === "object") jugadores.push({ ...j, equipo: esNumero(j.equipo) ? j.equipo : equipo });
    }
  }
  const grupos = agruparPorEquipo(jugadores);
  // Equipos que solo traen baneos (sin jugadores) no se muestran.
  return grupos.map((g) => ({ ...g, bloqueos: bloqueos.get(g.equipo) ?? [] }));
}

const listaY = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

/** "Johnadis y ISkrat" a partir de los slugs de la partida y la lista de amigos. */
export function nombresAmigos(slugs, amigos) {
  if (!Array.isArray(slugs) || slugs.length === 0) return "";
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const nombres = slugs.map((s) => {
    const a = porSlug.get(s);
    return a?.nombre || a?.riot_id || s;
  });
  return listaY.format(nombres);
}

export function esRanked(item) {
  return item?.categoria === "ranked";
}
