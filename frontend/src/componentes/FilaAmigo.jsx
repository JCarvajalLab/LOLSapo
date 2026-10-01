import { useEffect, useRef } from "react";
import { nombreCampeon, urlIconoPerfil } from "../logica/ddragon.js";
import { formatearWinrate, nombreRango, winrateRango } from "../logica/formato.js";
import { BarraWinrate, RegistroVD } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { PanelAmigo } from "./PanelAmigo.jsx";

/** Fila resumen de un amigo con su panel desplegable (acordeón). */
export function FilaAmigo({ amigo, ddragon, ahora, abierto, onAlternar, enfocar }) {
  const ref = useRef(null);
  const idPanel = `panel-${amigo.slug}`;
  const conError = amigo.estado === "error";
  const total = amigo.estadisticas?.total;
  const jugando = amigo.jugando;

  useEffect(() => {
    if (enfocar && ref.current) ref.current.scrollIntoView?.({ block: "start" });
  }, [enfocar]);

  return (
    <li ref={ref} className="scroll-mt-4 overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:px-4">
        <IconoConSaco
          src={urlIconoPerfil(ddragon, amigo.perfil?.icono)}
          alt={`Ícono de ${amigo.riot_id}`}
          tamaño={48}
          enPartida={Boolean(jugando)}
        />
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0">
            <button
              type="button"
              aria-expanded={abierto}
              aria-controls={idPanel}
              onClick={() => onAlternar(amigo.slug)}
              className="flex max-w-full items-center gap-2 text-left font-titulo text-lg font-bold hover:text-sapo"
            >
              <span className="truncate">{amigo.riot_id}</span>
              <span aria-hidden="true" className={`text-sm text-texto-suave transition-none ${abierto ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
          </h3>
          <p className="text-sm text-texto-suave">
            {amigo.perfil?.nivel ? <span className="cifras">Nivel {amigo.perfil.nivel}</span> : "Nivel desconocido"}
            {jugando && (
              <span className="ml-2 font-semibold text-sapo">
                En partida · {nombreCampeon(ddragon, jugando.campeon_id, "Campeón oculto")}
              </span>
            )}
          </p>
        </div>

        {conError ? (
          <p role="alert" className="w-full text-sm text-derrota sm:w-auto">
            No se pudieron cargar sus datos. Revisa el Riot ID en la configuración y ejecuta de nuevo el script.
            {amigo.error && <span className="block text-texto-suave">Detalle: {amigo.error}</span>}
          </p>
        ) : (
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm sm:w-auto sm:min-w-56">
            <LineaRango etiqueta="Solo/Dúo" rango={amigo.rangos?.solo} />
            <LineaRango etiqueta="Flex" rango={amigo.rangos?.flex} />
            <span className="text-texto-suave">Total</span>
            <span>
              {total && total.partidas > 0 ? (
                <>
                  <RegistroVD {...total} />
                  <BarraWinrate winrate={total.winrate} className="mt-1 max-w-40" />
                </>
              ) : (
                <span className="text-texto-suave">Sin partidas registradas</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div id={idPanel} hidden={!abierto}>
        {abierto && <PanelAmigo amigo={amigo} ddragon={ddragon} ahora={ahora} />}
      </div>
    </li>
  );
}

function LineaRango({ etiqueta, rango }) {
  const nombre = nombreRango(rango);
  return (
    <>
      <span className="text-texto-suave">{etiqueta}</span>
      <span className="cifras">
        {nombre ? (
          <>
            <span className="font-semibold">{nombre}</span> · {rango.lp ?? 0} LP{" "}
            <span className="text-texto-suave">
              · {rango.victorias ?? 0}V {rango.derrotas ?? 0}D · {formatearWinrate(winrateRango(rango))}
            </span>
          </>
        ) : (
          <span className="text-texto-suave">Sin clasificar</span>
        )}
      </span>
    </>
  );
}
