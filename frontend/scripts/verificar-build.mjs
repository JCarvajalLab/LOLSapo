// Revisa que ningún archivo del build (incluido datos/lol.json si existe) contenga una key
// de Riot. Se corre en CI después de `npm run build`: npm run verificar:build
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
console.log(`Build revisado: ${lista.length} archivos, sin keys de Riot.`);
