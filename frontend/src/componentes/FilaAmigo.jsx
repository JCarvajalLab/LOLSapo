import { useEffect, useRef } from "react";
import { nombreCampeon, urlIconoPerfil } from "../logica/ddragon.js";
import { antiguedadDatos } from "../logica/antiguedad.js";
import { lineasResumen } from "../logica/resumenAmigo.js";
import { formatearWinrate } from "../logica/formato.js";
import { BarraWinrate } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { PanelAmigo } from "./PanelAmigo.jsx";

/*
  Grilla fija, igual para todas las filas, para que las columnas queden alineadas.
  Escritorio (sm+): [ícono] [Riot ID + nivel] [etiqueta] [rango y LP] [V-D] [winrate] [barra] [chevron]
  Móvil: fila 1 = ícono, Riot ID, chevron; filas 2 a 4 = etiqueta, rango, V-D, winrate.
  Las clases están escritas completas para que Tailwind las detecte.
*/
const GRILLA =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_auto_2.75rem] gap-x-3 gap-y-1 " +
  "sm:h-[78px] sm:grid-cols-[3rem_10rem_4.5rem_10rem_4.5rem_2.75rem_4.5rem_minmax(1rem,1fr)] " +
  "sm:grid-rows-[repeat(3,1.25rem)] sm:content-center sm:gap-y-0";

const FILA = [
  "row-start-2 sm:row-start-1",
  "row-start-3 sm:row-start-2",
  "row-start-4 sm:row-start-3",
];

/** Fila resumen de un amigo con su panel desplegable (acordeón). */
export function FilaAmigo({ amigo, ddragon, ahora, actualizadoMs, abierto, onAlternar, enfocar }) {
  const ref = useRef(null);
  const idPanel = `panel-${amigo.slug}`;
  const conError = amigo.estado === "error";
  // "En partida" sigue la antigüedad de los datos: atenuado con más de 15 min, oculto con más de 60.
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const jugando = nivel === "caduco" ? null : amigo.jugando;
  const jugandoViejo = Boolean(jugando) && nivel === "viejo";

  useEffect(() => {
    if (enfocar && ref.current) ref.current.scrollIntoView?.({ block: "start" });
  }, [enfocar]);

  return (
    <li ref={ref} className="scroll-mt-4 overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className={`relative items-center px-3 py-3 text-xs hover:bg-superficie-alta sm:px-4 sm:py-0 sm:text-sm ${GRILLA}`}>
        <span className="col-start-1 row-start-1 sm:row-span-3">
          <IconoConSaco
            src={urlIconoPerfil(ddragon, amigo.perfil?.icono)}
            alt={`Ícono de ${amigo.riot_id}`}
            tamaño={48}
            enPartida={Boolean(jugando) && !jugandoViejo}
          />
        </span>

        <div className="col-span-2 col-start-2 row-start-1 min-w-0 sm:col-span-1 sm:row-span-3">
          <h3 className="min-w-0">
            <button
              type="button"
              aria-expanded={abierto}
              aria-controls={idPanel}
              onClick={() => onAlternar(amigo.slug)}
              className="block max-w-full truncate text-left font-titulo text-base font-bold after:absolute after:inset-0 after:content-[''] hover:text-sapo"
            >
              {amigo.riot_id}
            </button>
          </h3>
          <p className="cifras truncate text-xs text-texto-suave">
            {amigo.perfil?.nivel ? `Nivel ${amigo.perfil.nivel}` : "Nivel desconocido"}
          </p>
          {jugando && (
            <p
              className={`truncate text-xs font-semibold text-sapo ${jugandoViejo ? "opacity-50" : ""}`}
              title={jugandoViejo ? `Datos de hace ${antiguedad} min` : undefined}
              data-atenuado={jugandoViejo ? "true" : undefined}
            >
              En partida · {nombreCampeon(ddragon, jugando.campeon_id, "Campeón oculto")}
              {jugandoViejo && <span className="sr-only"> (datos de hace {antiguedad} min)</span>}
            </p>
          )}
        </div>

        {conError ? (
          <p
            role="alert"
            className="col-span-4 col-start-1 row-start-2 line-clamp-3 text-xs text-derrota sm:col-span-5 sm:col-start-3 sm:row-span-3 sm:row-start-1"
            title={amigo.error ?? undefined}
          >
            No se pudieron cargar sus datos. Revisa el Riot ID en la configuración y ejecuta de nuevo el script.
            {amigo.error && <span className="text-texto-suave"> Detalle: {amigo.error}</span>}
          </p>
        ) : (
          lineasResumen(amigo).map((linea, i) => <LineaResumen key={linea.etiqueta} linea={linea} fila={FILA[i]} />)
        )}

        <span
          aria-hidden="true"
          className={`col-start-4 row-start-1 justify-self-end text-texto-suave sm:col-start-8 sm:row-span-3 ${
            abierto ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </div>

      <div id={idPanel} hidden={!abierto}>
        {abierto && <PanelAmigo amigo={amigo} ddragon={ddragon} ahora={ahora} />}
      </div>
    </li>
  );
}

/** Una línea (Solo/Dúo, Flex o Total) repartida en las columnas fijas. */
function LineaResumen({ linea, fila }) {
  const conDatos = linea.victorias !== null;
  return (
    <>
      <span className={`col-start-1 truncate text-texto-suave sm:col-start-3 ${fila}`}>{linea.etiqueta}</span>
      <span className={`cifras col-start-2 truncate sm:col-start-4 ${fila} ${linea.vacio ? "text-texto-suave" : ""}`}>
        {linea.titulo ? (
          <>
            <span className="font-semibold">{linea.titulo}</span>
            {linea.detalle && <span className="text-texto-suave"> · {linea.detalle}</span>}
          </>
        ) : (
          linea.texto
        )}
      </span>
      <span className={`cifras col-start-3 text-right whitespace-nowrap sm:col-start-5 sm:text-left ${fila}`}>
        {conDatos ? (
          <>
            <span className="text-victoria">{linea.victorias}V</span> <span className="text-derrota">{linea.derrotas}D</span>
          </>
        ) : (
          <span className="text-texto-suave">—</span>
        )}
      </span>
      <span className={`cifras col-start-4 text-right font-semibold sm:col-start-6 ${fila}`}>
        {formatearWinrate(linea.winrate)}
      </span>
      <span className={`hidden sm:col-start-7 sm:block ${fila}`}>
        {typeof linea.winrate === "number" && <BarraWinrate winrate={linea.winrate} />}
      </span>
    </>
  );
}
