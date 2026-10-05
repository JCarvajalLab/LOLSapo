import { CLAVES_SEMANA, destacadosVacios, destacadosVigentes } from "../logica/destacados.js";
import { BloqueDestacados, ListaDestacados, VACIO_SEMANA } from "./PiezasDestacados.jsx";

/**
 * Destacados de la semana (solo LoL, Normal y Ranked): todas las tarjetas cuentan solo
 * partidas en equipo (2 o más del grupo), de lunes a domingo; el recolector reinicia la
 * semana el lunes a la 01:00 de Chile. Sin `destacados` (archivos viejos) no se muestra.
 * Si la semana de los datos ya terminó (lol.json quedó viejo), se muestra vacía.
 */
export function SeccionDestacadosSemana({ destacados, amigos, ddragon, ahora }) {
  if (!destacados) return null;
  const vigentes = destacadosVigentes(destacados, ahora);
  return (
    <BloqueDestacados
      id="destacados-semana"
      titulo="Destacados de la semana"
      nota="Partidas en equipo (2 o más del grupo) de Normal y Ranked, de lunes a domingo · Se reinicia el lunes a la 01:00"
    >
      {destacadosVacios(vigentes, CLAVES_SEMANA) ? (
        <p className="flex min-h-20 items-center justify-center rounded-lg border border-borde bg-superficie px-3 text-center text-sm text-texto-suave">
          {VACIO_SEMANA}
        </p>
      ) : (
        <ListaDestacados
          claves={CLAVES_SEMANA}
          destacados={vigentes}
          amigos={amigos}
          ddragon={ddragon}
          ahora={ahora}
          claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      )}
    </BloqueDestacados>
  );
}
