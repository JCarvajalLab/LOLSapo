import { CLAVES_HOY, destacadosVigentes } from "../logica/destacados.js";
import { BloqueDestacados, claseItemBalance, ListaDestacados } from "./PiezasDestacados.jsx";

const NOTA = "Partidas en grupo (2 o más del grupo) de Normal y Ranked desde las 12:00 · Se reinicia cada día";

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
      nota={NOTA}
    >
      <ListaDestacados
        claves={CLAVES_HOY}
        destacados={destacadosVigentes(destacados, ahora)}
        amigos={amigos}
        ddragon={ddragon}
        ahora={ahora}
        nota={NOTA}
        claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        claseItem={claseItemBalance}
      />
    </BloqueDestacados>
  );
}
