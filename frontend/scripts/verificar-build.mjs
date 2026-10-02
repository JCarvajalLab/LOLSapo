// Revisa el build antes de publicarlo. Se corre en CI después de `npm run build`:
//   npm run verificar:build
// 1. Ningún archivo (incluido datos/lol.json si existe) contiene una key de Riot.
// 2. Los datos publicados (dist/datos/*.json) no contienen PUUID.
// 3. dist/index.html trae la Content Security Policy esperada, sin 'unsafe-inline' ni
//    'unsafe-eval', y sin scripts ni estilos inline que la CSP bloquearía.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CSP } from "./csp.mjs";

const CARPETA = new URL("../dist/", import.meta.url);
const PATRON_KEY = /RGAPI-/i;

function archivos(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

let lista;
try {
  lista = archivos(fileURLToPath(CARPETA));
} catch {
  console.error("No existe frontend/dist: corre `npm run build` primero.");
  process.exit(1);
}

const conKey = lista.filter((ruta) => PATRON_KEY.test(readFileSync(ruta, "latin1")));
if (conKey.length > 0) {
  console.error("Se encontró algo con forma de key de Riot en:", conKey);
  process.exit(1);
}

// Los PUUID solo viven en el registro local del recolector; los datos publicados no deben
// traer ni la clave "puuid" ni cadenas con forma de PUUID (78 caracteres [A-Za-z0-9_-]).
const PATRON_PUUID = /"puuid"|(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{78}(?![A-Za-z0-9_-])/;
const conPuuid = lista.filter(
  (ruta) => /[\\/]datos[\\/][^\\/]+\.json$/.test(ruta) && PATRON_PUUID.test(readFileSync(ruta, "utf8")),
);
if (conPuuid.length > 0) {
  console.error("Se encontró algo con forma de PUUID en los datos publicados:", conPuuid);
  process.exit(1);
}

const problemasCsp = revisarCsp(readFileSync(fileURLToPath(new URL("index.html", CARPETA)), "utf8"));
if (problemasCsp.length > 0) {
  console.error("Problemas de CSP en dist/index.html:");
  for (const p of problemasCsp) console.error(" -", p);
  process.exit(1);
}

console.log(`Build revisado: ${lista.length} archivos, sin keys ni PUUID y con CSP correcta.`);

/** Devuelve la lista de problemas de CSP del index.html (vacía si está bien). */
function revisarCsp(html) {
  const problemas = [];
  const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/gi)];
  if (metas.length !== 1) problemas.push(`se esperaba 1 meta CSP y hay ${metas.length}`);
  const politica = metas[0]?.[1] ?? "";
  if (metas.length === 1 && politica !== CSP) problemas.push("la CSP no coincide con scripts/csp.mjs");
  if (/unsafe-inline|unsafe-eval/i.test(html)) problemas.push("contiene 'unsafe-inline' o 'unsafe-eval'");
  if (/<style[\s>]/i.test(html)) problemas.push("tiene una etiqueta <style> inline");
  if (/\sstyle\s*=/i.test(html)) problemas.push("tiene atributos style inline");
  const scriptsInline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(([, attrs]) => !/\ssrc=/i.test(attrs));
  if (scriptsInline.length > 0) problemas.push("tiene scripts inline");
  const posCsp = html.search(/http-equiv="Content-Security-Policy"/i);
  const posScript = html.search(/<script\b|<link\b[^>]*stylesheet/i);
  if (posCsp > -1 && posScript > -1 && posCsp > posScript) problemas.push("la CSP va después de scripts o estilos");
  return problemas;
}
