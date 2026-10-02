const SLUG_OK = /^[a-z0-9-]+$/;

/** "#/amigo/<slug>" -> slug; cualquier otra cosa -> null (inicio). */
export function slugDesdeHash(hash) {
  if (typeof hash !== "string") return null;
  const m = /^#\/amigo\/([^/?#]+)\/?$/.exec(hash);
  if (!m) return null;
  let slug;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return SLUG_OK.test(slug) ? slug : null;
}

export function hashDeAmigo(slug) {
  return `#/amigo/${encodeURIComponent(slug)}`;
}

/** Cambia el hash sin agregar una entrada nueva al historial. */
export function reemplazarHash(hash) {
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState(null, "", url);
}
