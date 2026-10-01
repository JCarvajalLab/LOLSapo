import { useState } from "react";
import { etiquetaFiltro, filtrarPartidas, modosDe, resumenDe } from "../logica/filtros.js";
import { fechaCorta } from "../logica/formato.js";
import { DesgloseModos } from "./DesgloseModos.jsx";
import { RegistroVD } from "./Etiquetas.jsx";
import { FiltroModos } from "./FiltroModos.jsx";
import { FilaPartida } from "./FilaPartida.jsx";

/** Contenido desplegado de un amigo. Solo se monta al abrir su fila. */
export function PanelAmigo({ amigo, ddragon, ahora }) {
  const [filtro, setFiltro] = useState("todos");
  const resumen = resumenDe(amigo.estadisticas, filtro);
  const modos = modosDe(amigo.estadisticas, filtro);
  const partidas = filtrarPartidas(amigo.partidas, filtro);
  const hayPartidas = Array.isArray(amigo.partidas) && amigo.partidas.length > 0;

  return (
    <div className="space-y-4 border-t border-borde px-3 py-4 sm:px-4">
      <p className="text-sm text-texto-suave">
        Contando desde {fechaCorta(amigo.seguimiento_desde)}. Las estadísticas por modo solo incluyen partidas
        registradas por LOLSapo.
      </p>

      <FiltroModos valor={filtro} onCambiar={setFiltro} />

      <section aria-label="Estadísticas del filtro" className="space-y-3">
        <p className="text-sm">
          {etiquetaFiltro(filtro)}: <span className="cifras text-texto-suave">{resumen.partidas} partidas · </span>
          <RegistroVD {...resumen} />
        </p>
        <DesgloseModos modos={modos} />
      </section>

      <section aria-label="Últimas partidas" className="space-y-2">
        <h3 className="font-titulo font-bold">Últimas partidas</h3>
        {!hayPartidas ? (
          <p className="text-sm text-texto-suave">Todavía no hay partidas registradas.</p>
        ) : partidas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            No hay partidas de {etiquetaFiltro(filtro)} entre las últimas 10. Prueba con Todos.
          </p>
        ) : (
          <ol className="space-y-2">
            {partidas.map((p, i) => (
              <li key={p.id ?? i}>
                <FilaPartida partida={p} ddragon={ddragon} ahora={ahora} slugPropio={amigo.slug} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
