import { CLAVES_SEMANA, destacadosVacios } from "../logica/destacados.js";
import { BloqueDestacados, ListaDestacados } from "./PiezasDestacados.jsx";

/**
 * Destacados de los últimos 7 días (solo LoL, Normal y Ranked). Mejor y peor jugador de la
 * semana y las rachas cuentan solo partidas en equipo (2 o más del grupo). No dependen del
 * reinicio de las 6:00. Sin `destacados` (archivos viejos) no se muestra.
 */
export function SeccionDestacadosSemana({ destacados, amigos, ddragon, ahora }) {
  if (!destacados) return null;
  return (
    <BloqueDestacados
      id="destacados-semana"
      titulo="Destacados de los últimos 7 días"
      nota="Solo Normal y Ranked (Solo/Dúo y Flex) · Mejor y peor jugador y rachas: partidas en equipo (2 o más del grupo)"
    >
      {destacadosVacios(destacados, CLAVES_SEMANA) ? (
        <p className="flex min-h-20 items-center justify-center rounded-lg border border-borde bg-superficie px-3 text-center text-sm text-texto-suave">
          Sin partidas de Normal o Ranked en los últimos 7 días
        </p>
      ) : (
        <ListaDestacados
          claves={CLAVES_SEMANA}
          destacados={destacados}
          amigos={amigos}
          ddragon={ddragon}
          ahora={ahora}
          claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      )}
    </BloqueDestacados>
  );
}
