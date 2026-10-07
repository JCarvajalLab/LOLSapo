import { CLAVES_MES, destacadosVigentes, mesCerrado } from "../logica/destacados.js";
import { BloqueDestacados, claseItemBalance, ListaDestacados } from "./PiezasDestacados.jsx";

const NOTA = "Partidas en equipo (2 o más del grupo) de Normal y Ranked del mes";

/**
 * Destacados del mes (solo LoL, partidas en equipo de Normal y Ranked del día 1 a la 01:00 de
 * Chile hasta el mes siguiente): mejor jugador, balance del grupo y peor jugador, igual que los
 * de hoy. Los días 1 a 3 el recolector manda el mes anterior ya cerrado. Sin `destacados` o sin
 * un `mes` válido (archivos viejos) no se muestra. Si el mes de los datos quedó atrás (lol.json
 * quedó viejo), las tres quedan vacías. Desde `mes.hasta` se trata como cerrado aunque el
 * archivo diga lo contrario.
 */
export function SeccionDestacadosMes({ destacados, amigos, ddragon, ahora }) {
  const mes = destacados?.mes;
  if (!mes) return null;
  const cerrado = mesCerrado(mes, ahora);
  const nota = `${NOTA} · ${cerrado ? "Mes cerrado; el actual aparece desde el día 4" : "Se actualiza hasta fin de mes"}`;
  return (
    <BloqueDestacados
      id="destacados-mes"
      titulo={`Destacados de ${mes.nombre}${cerrado ? " (cerrado)" : ""}`}
      nota={nota}
    >
      <ListaDestacados
        claves={CLAVES_MES}
        destacados={destacadosVigentes(destacados, ahora)}
        amigos={amigos}
        ddragon={ddragon}
        ahora={ahora}
        nota={nota}
        claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        claseItem={claseItemBalance}
      />
    </BloqueDestacados>
  );
}
