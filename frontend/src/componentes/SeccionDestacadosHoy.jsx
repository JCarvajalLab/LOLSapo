import { CLAVES_HOY, destacadosVigentes } from "../logica/destacados.js";
import { BloqueDestacados, ListaDestacados } from "./PiezasDestacados.jsx";

/**
 * En 2 columnas (tablet) el balance baja a su propia fila a todo el ancho, para que mejor y
 * peor jugador queden lado a lado; en 1 columna (móvil) y en 3 (escritorio) va al centro,
 * igual que en el orden del documento que leen los lectores de pantalla.
 */
const claseItem = (clave) => (clave === "balance_hoy" ? "sm:order-last sm:col-span-2 lg:order-none lg:col-span-1" : "");

/**
 * Destacados de hoy (solo LoL, partidas en grupo de Normal y Ranked desde las 12:00 de Chile):
 * mejor jugador, balance del grupo y peor jugador. Sin `destacados` (archivos viejos) no se
 * muestra. Si el día de los datos ya terminó (lol.json quedó viejo), las tres quedan vacías.
 */
export function SeccionDestacadosHoy({ destacados, amigos, ddragon, ahora }) {
  if (!destacados) return null;
  return (
    <BloqueDestacados
      id="destacados-hoy"
      titulo="Destacados de hoy"
      nota="Partidas en grupo (2 o más del grupo) de Normal y Ranked desde las 12:00 · Se reinicia cada día"
    >
      <ListaDestacados
        claves={CLAVES_HOY}
        destacados={destacadosVigentes(destacados, ahora)}
        amigos={amigos}
        ddragon={ddragon}
        ahora={ahora}
        claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        claseItem={claseItem}
      />
    </BloqueDestacados>
  );
}
