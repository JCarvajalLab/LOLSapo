// URLs y nombres de Data Dragon. Todas las imágenes salen de este único dominio.
// Cada pieza se valida antes de armar la URL: si algo no cuadra, se devuelve null
// y la interfaz muestra un respaldo local.

export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

const VERSION_OK = /^\d+(\.\d+)*$/;
const ID_OK = /^[A-Za-z0-9_]+$/;
const RUTA_RUNA_OK = /^[A-Za-z0-9_/-]+\.png$/;

function version(dd) {
  const v = dd?.version;
  return typeof v === "string" && VERSION_OK.test(v) ? v : null;
}

function clave(id) {
  return id === null || id === undefined ? null : String(id);
}

/** Id de Data Dragon del campeón ("MissFortune"), con respaldo al de la partida. */
export function idCampeon(dd, campeonId, respaldo) {
  const id = dd?.campeones?.[clave(campeonId)]?.id ?? respaldo;
  return typeof id === "string" && ID_OK.test(id) ? id : null;
}

export function nombreCampeon(dd, campeonId, respaldo) {
  const nombre = dd?.campeones?.[clave(campeonId)]?.nombre;
  if (typeof nombre === "string" && nombre) return nombre;
  if (typeof respaldo === "string" && respaldo) return respaldo;
  return "Campeón desconocido";
}

export function urlCampeon(dd, campeonId, respaldo) {
  const v = version(dd);
  const id = idCampeon(dd, campeonId, respaldo);
  return v && id ? `${DDRAGON_BASE}/cdn/${v}/img/champion/${id}.png` : null;
}

export function urlIconoPerfil(dd, icono) {
  const v = version(dd);
  return v && Number.isInteger(icono) && icono >= 0
    ? `${DDRAGON_BASE}/cdn/${v}/img/profileicon/${icono}.png`
    : null;
}

export function urlItem(dd, itemId) {
  const v = version(dd);
  return v && Number.isInteger(itemId) && itemId > 0
    ? `${DDRAGON_BASE}/cdn/${v}/img/item/${itemId}.png`
    : null;
}

export function nombreItem(dd, itemId) {
  return dd?.items?.[clave(itemId)]?.nombre ?? `Ítem ${itemId}`;
}

export function urlHechizo(dd, hechizoId) {
  const v = version(dd);
  const id = dd?.hechizos?.[clave(hechizoId)]?.id;
  return v && typeof id === "string" && ID_OK.test(id)
    ? `${DDRAGON_BASE}/cdn/${v}/img/spell/${id}.png`
    : null;
}

export function nombreHechizo(dd, hechizoId) {
  return dd?.hechizos?.[clave(hechizoId)]?.nombre ?? "Hechizo";
}

export function urlRuna(dd, runaId) {
  const icono = dd?.runas?.[clave(runaId)]?.icono;
  if (typeof icono !== "string" || icono.includes("..") || !RUTA_RUNA_OK.test(icono)) {
    return null;
  }
  return `${DDRAGON_BASE}/cdn/img/${icono}`;
}

export function nombreRuna(dd, runaId) {
  return dd?.runas?.[clave(runaId)]?.nombre ?? "Runa";
}
