import { useState } from "react";
import { etiquetaFiltro, filtrarPartidas, modosDe, resumenDe } from "../logica/filtros.js";
import { fechaCorta } from "../logica/formato.js";
import { CalendarioActividad } from "./CalendarioActividad.jsx";
import { DesgloseModos } from "./DesgloseModos.jsx";
import { RegistroVD } from "./Etiquetas.jsx";
import { FiltroModos } from "./FiltroModos.jsx";
import { FilaPartida } from "./FilaPartida.jsx";
import { FilaPartidaCompacta } from "./FilaPartidaCompacta.jsx";
import { SelectorVistaPartidas } from "./SelectorVistaPartidas.jsx";

const CLAVE_STORAGE_VISTA = "lolsapo_vista_historial";

function obtenerVistaInicial() {
  try {
    const guardada = typeof window !== "undefined" ? window.localStorage?.getItem(CLAVE_STORAGE_VISTA) : null;
    return guardada === "compacta" ? "compacta" : "detallada";
  } catch {
    return "detallada";
  }
}

/** Contenido desplegado de un amigo. Solo se monta al abrir su fila. */
export function PanelAmigo({ amigo, ddragon, ahora }) {
  const [filtro, setFiltro] = useState("todos");
  const [vista, setVista] = useState(obtenerVistaInicial);
  const resumen = resumenDe(amigo.estadisticas, filtro);
  const modos = modosDe(amigo.estadisticas, filtro);
  const partidas = filtrarPartidas(amigo.partidas, filtro);
  const hayPartidas = Array.isArray(amigo.partidas) && amigo.partidas.length > 0;

  const handleCambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    try {
      window.localStorage?.setItem(CLAVE_STORAGE_VISTA, nuevaVista);
    } catch {
      // Ignorar si el acceso a localStorage está restringido
    }
  };

  return (
    <div className="panel-hundido space-y-5 px-3 py-4 sm:px-4 sm:py-5">
      {/* Fila superior: Aviso y Filtro de modos a la izquierda, Calendario a la derecha */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-4 min-w-0 flex-1 max-w-xl">
          <p className="max-w-prose text-xs text-texto-suave">
            Contando desde {fechaCorta(amigo.seguimiento_desde)}. Las estadísticas por modo solo incluyen partidas
            registradas por LOLSapo.
          </p>

          <FiltroModos valor={filtro} onCambiar={setFiltro} />
        </div>

        {hayPartidas && (
          <div className="shrink-0 self-center lg:self-center">
            <CalendarioActividad
              actividad={amigo.actividad}
              ahora={ahora}
              partidas={amigo.partidas}
            />
          </div>
        )}
      </div>

      {/* Estadísticas del filtro y Desglose por modo a todo lo ancho */}
      <section aria-label="Estadísticas del filtro" className="space-y-3">
        <p className="text-sm">
          <span className="font-semibold">{etiquetaFiltro(filtro)}</span>: <span className="cifras text-texto-suave">{resumen.partidas} partidas · </span>
          <RegistroVD {...resumen} />
        </p>
        <DesgloseModos modos={modos} />
      </section>

      <section aria-label="Últimas partidas" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="titulo-sub">Últimas partidas</h3>
          {hayPartidas && (
            <SelectorVistaPartidas vista={vista} onCambiarVista={handleCambiarVista} />
          )}
        </div>
        {!hayPartidas ? (
          <p className="text-sm text-texto-suave">Todavía no hay partidas registradas.</p>
        ) : partidas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            No hay partidas de {etiquetaFiltro(filtro)} entre las últimas 10. Prueba con Todos.
          </p>
        ) : (
          <ol className={vista === "compacta" ? "space-y-1.5" : "space-y-2"}>
            {partidas.map((p, i) => (
              <li key={p.id ?? i}>
                {vista === "compacta" ? (
                  <FilaPartidaCompacta partida={p} ddragon={ddragon} ahora={ahora} slugPropio={amigo.slug} />
                ) : (
                  <FilaPartida partida={p} ddragon={ddragon} ahora={ahora} slugPropio={amigo.slug} />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
