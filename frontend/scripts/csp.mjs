// Content Security Policy de LOLSapo (requisito 7.1).
// GitHub Pages no permite headers propios, así que va como <meta> en el index.html del build.
// Solo se aplica en el build: el servidor de desarrollo de Vite inyecta scripts y estilos
// inline para la recarga en caliente y esta política los bloquearía.

export const DIRECTIVAS_CSP = {
  "default-src": ["'none'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  // data: cubre el favicon SVG embebido; Data Dragon, las imágenes del juego.
  "img-src": ["'self'", "data:", "https://ddragon.leagueoflegends.com"],
  "font-src": ["'self'"],
  // Solo se pide ./datos/lol.json al mismo origen.
  "connect-src": ["'self'"],
  "base-uri": ["'none'"],
  "form-action": ["'none'"],
  "object-src": ["'none'"],
};

export const CSP = Object.entries(DIRECTIVAS_CSP)
  .map(([directiva, valores]) => `${directiva} ${valores.join(" ")}`)
  .join("; ");

const ANCLA = '<meta charset="UTF-8" />';

/** Inserta la meta CSP justo después del charset, antes de cualquier script o estilo. */
export function insertarCsp(html) {
  if (!html.includes(ANCLA)) throw new Error("index.html no tiene la meta charset esperada.");
  return html.replace(ANCLA, `${ANCLA}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
}

/** Plugin de Vite que agrega la CSP solo al construir. */
export function pluginCsp() {
  return {
    name: "lolsapo-csp",
    apply: "build",
    transformIndexHtml: { order: "post", handler: insertarCsp },
  };
}
