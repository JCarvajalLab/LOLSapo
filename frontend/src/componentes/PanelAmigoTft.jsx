import { useState } from "react";
import { etiquetaFiltro, FILTROS_TFT, filtrarPartidas, modosDe } from "../logica/filtros.js";
import { fechaCorta, formatearWinrate, claseWinrate } from "../logica/formato.js";
import { esRanked } from "../logica/partidas.js";
import { formatearPromedio, resumenTftDe } from "../logica/tft.js";
import { BarraWinrate } from "./Etiquetas.jsx";
import { FilaPartidaTft } from "./FilaPartidaTft.jsx";
import { FiltroModos } from "./FiltroModos.jsx";
import { HistorialPuestos } from "./HistorialPuestos.jsx";

/** Contenido desplegado de un amigo en TFT. Solo se monta al abrir su fila. */
export function PanelAmigoTft({ amigo, ddragon, ahora }) {
  const [filtro, setFiltro] = useState("todos");
  const todas = Array.isArray(amigo.partidas) ? amigo.partidas.filter(Boolean) : [];
  const partidas = filtrarPartidas(todas, filtro);
  const resumen = resumenTftDe(amigo.estadisticas, filtro);
  const modos = modosDe(amigo.estadisticas, filtro);
  return (
    <div className="space-y-4 border-t border-borde px-3 py-4 sm:px-4">
      <p className="text-sm text-texto-suave">
        Contando desde {fechaCorta(amigo.seguimiento_desde)}. Las estadísticas por modo solo incluyen partidas
        registradas por LOLSapo.
      </p>

      {/* Escritorio: filtros a la izquierda y la grilla de puestos a la derecha. Móvil: uno debajo del otro.
          Sin historial, HistorialPuestos no renderiza nada y los filtros quedan solos. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <FiltroModos valor={filtro} onCambiar={setFiltro} opciones={FILTROS_TFT} />
        </div>
        <HistorialPuestos historial={amigo.historial} filtro={filtro} />
      </div>

      <section aria-label="Estadísticas del filtro" className="space-y-2">
        <h3 className="font-titulo font-bold">Por modo</h3>
        <ResumenFiltroTft etiqueta={etiquetaFiltro(filtro)} resumen={resumen} />
        <DesgloseModosTft modos={modos} filtrado={filtro !== "todos"} />
      </section>

      <section aria-label="Últimas partidas" className="space-y-2">
        <h3 className="font-titulo font-bold">Últimas partidas</h3>
        {todas.length === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no hay partidas de TFT registradas.</p>
        ) : partidas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            No hay partidas de {etiquetaFiltro(filtro)} entre las últimas 10. Prueba con Todos.
          </p>
        ) : (
          <ol className="space-y-2">
            {partidas.map((p, i) => (
              <li key={p.id ?? i}>
                <FilaPartidaTft partida={p} ddragon={ddragon} ahora={ahora} slugPropio={amigo.slug} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** "Rankeds: 10 partidas · top 4 60% · prom. 3,8" del filtro elegido. */
function ResumenFiltroTft({ etiqueta, resumen }) {
  return (
    <p className="cifras text-sm">
      {etiqueta}:{" "}
      <span className="text-texto-suave">
        {resumen.partidas} {resumen.partidas === 1 ? "partida" : "partidas"} · top 4{" "}
      </span>
      <span className={`font-semibold ${claseWinrate(resumen.top4_pct)}`}>{formatearWinrate(resumen.top4_pct)}</span>
      <span className="text-texto-suave"> · prom. </span>
      <span className="font-semibold">{formatearPromedio(resumen.promedio)}</span>
    </p>
  );
}

/** Partidas, top 4 % y puesto promedio por modo, con barra de top 4. */
export function DesgloseModosTft({ modos, filtrado = false }) {
  const lista = Array.isArray(modos) ? modos.filter(Boolean) : [];
  if (lista.length === 0) {
    return (
      <p className="text-sm text-texto-suave">
        {filtrado ? "Sin partidas registradas en este filtro." : "Sin partidas registradas todavía."}
      </p>
    );
  }
  return (
    <ul className="space-y-2" aria-label="Desglose por modo">
      {lista.map((m) => (
        <li key={m.queue_id ?? m.nombre} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
          <span className="truncate">
            {esRanked(m) && (
              <span aria-hidden="true" className="mr-1 text-ranked">
                ◆
              </span>
            )}
            {m.nombre || "Modo especial"}
            <span className="cifras text-texto-suave">
              {" "}
              · {m.partidas ?? 0} {m.partidas === 1 ? "partida" : "partidas"}
            </span>
          </span>
          <span className="cifras whitespace-nowrap">
            <span className="text-texto-suave">Top 4 </span>
            <span className={`font-semibold ${claseWinrate(m.top4_pct)}`}>{formatearWinrate(m.top4_pct)}</span>
            <span className="text-texto-suave"> · Prom. </span>
            <span className="font-semibold">{formatearPromedio(m.promedio)}</span>
          </span>
          <BarraWinrate winrate={m.top4_pct} className="col-span-2" />
        </li>
      ))}
    </ul>
  );
}
