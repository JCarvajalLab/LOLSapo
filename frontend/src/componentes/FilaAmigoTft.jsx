import { useEffect, useRef } from "react";
import { antiguedadDatos } from "../logica/antiguedad.js";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { claseWinrate, formatearWinrate } from "../logica/formato.js";
import { formatearPromedio, resumenTft } from "../logica/tft.js";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { PanelAmigoTft } from "./PanelAmigoTft.jsx";

/*
  Grilla fija, igual para todas las filas (y para la de carga), para que nada salte.
  Escritorio (sm+): [ícono] [Riot ID + nivel + estado] [Ranked | Top 4 | Promedio | Partidas] [chevron], 78 px de alto.
  Móvil: fila 1 = ícono, Riot ID, chevron; fila 2 = las cuatro cifras.
  Las clases están escritas completas para que Tailwind las detecte.
*/
const GRILLA =
  "grid grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-x-3 gap-y-2 " +
  "sm:h-[78px] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,26rem)_1.5rem] sm:gap-y-0";

const CIFRAS = "col-span-3 row-start-2 grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-x-3 sm:col-span-1 sm:col-start-3 sm:row-start-1";

/** Fila resumen de un amigo en TFT con su panel desplegable (acordeón). */
export function FilaAmigoTft({ amigo, ddragon, ahora, actualizadoMs, abierto, onAlternar, enfocar }) {
  const ref = useRef(null);
  const idPanel = `panel-tft-${amigo.slug}`;
  const conError = amigo.estado === "error";
  // "En partida" sigue la antigüedad de los datos: atenuado con más de 15 min, oculto con más de 60.
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const jugando = nivel === "caduco" ? null : amigo.jugando;
  const jugandoViejo = Boolean(jugando) && nivel === "viejo";
  const r = resumenTft(amigo);

  useEffect(() => {
    if (enfocar && ref.current) ref.current.scrollIntoView?.({ block: "start" });
  }, [enfocar]);

  return (
    <li ref={ref} className="scroll-mt-4 overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className={`relative px-3 py-3 text-sm hover:bg-superficie-alta sm:px-4 sm:py-0 ${GRILLA}`}>
        <span className="col-start-1 row-start-1">
          <IconoConSaco
            src={urlIconoPerfil(ddragon, amigo.perfil?.icono)}
            alt={`Ícono de ${amigo.riot_id}`}
            respaldo={amigo.riot_id}
            tamaño={48}
            enPartida={Boolean(jugando) && !jugandoViejo}
          />
        </span>

        <div className="col-start-2 row-start-1 min-w-0">
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
          {conError ? (
            <p className="h-4 truncate text-xs text-derrota" title={amigo.error ?? undefined} data-aviso-error="true">
              <span aria-hidden="true">● </span>
              Sin actualizar: se muestran sus últimos datos
              {amigo.error && <span className="sr-only">. Detalle: {amigo.error}</span>}
            </p>
          ) : jugando ? (
            <p
              className={`h-4 truncate text-xs font-semibold ${jugandoViejo ? "text-texto-suave" : "text-sapo"}`}
              title={jugandoViejo ? `Datos de hace ${antiguedad} min` : undefined}
              data-atenuado={jugandoViejo ? "true" : undefined}
            >
              En partida · {jugando.modo || "Modo especial"}
              {jugandoViejo && <span className="sr-only"> (datos de hace {antiguedad} min)</span>}
            </p>
          ) : (
            <p aria-hidden="true" className="h-4" />
          )}
        </div>

        <div className={CIFRAS}>
          <Dato etiqueta="Ranked">
            {r.rango ? (
              <span title={r.lp !== null ? `${r.rango} · ${r.lp} LP` : r.rango}>
                {r.rango}
                {r.lp !== null && <span className="hidden font-normal text-texto-suave sm:inline"> · {r.lp} LP</span>}
              </span>
            ) : (
              <span className="font-normal text-texto-suave">Sin rango</span>
            )}
          </Dato>
          <Dato etiqueta="Top 4">
            <span className={claseWinrate(r.top4)}>{formatearWinrate(r.top4)}</span>
          </Dato>
          <Dato etiqueta="Promedio">{formatearPromedio(r.promedio)}</Dato>
          <Dato etiqueta="Partidas">{r.partidas}</Dato>
        </div>

        <span
          aria-hidden="true"
          className={`col-start-3 row-start-1 justify-self-end text-texto-suave sm:col-start-4 ${abierto ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </div>

      <div id={idPanel} hidden={!abierto}>
        {abierto && <PanelAmigoTft amigo={amigo} ddragon={ddragon} ahora={ahora} />}
      </div>
    </li>
  );
}

/** Una cifra con su etiqueta encima. */
function Dato({ etiqueta, children }) {
  return (
    <p className="min-w-0 leading-tight">
      <span className="block truncate text-xs text-texto-suave">{etiqueta}</span>
      <span className="cifras block truncate font-semibold">{children}</span>
    </p>
  );
}

/** Fila de carga con la misma grilla y alto que una fila real. Es decorativa. */
export function FilaAmigoTftEsqueleto() {
  return (
    <li aria-hidden="true" className="overflow-hidden rounded-lg border border-borde bg-superficie" data-esqueleto="true">
      <div className={`px-3 py-3 text-sm sm:px-4 sm:py-0 ${GRILLA}`}>
        <span className="col-start-1 row-start-1 block h-12 w-12 rounded-full bg-superficie-alta" />
        <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1.5">
          <span className="block h-4 w-32 max-w-full rounded bg-superficie-alta" />
          <span className="block h-3 w-16 rounded bg-superficie-alta" />
        </span>
        <span className={CIFRAS}>
          {["w-20", "w-10", "w-10", "w-8"].map((ancho, i) => (
            <span key={i} className="flex flex-col gap-1">
              <span className="block h-2.5 w-12 max-w-full rounded bg-superficie-alta" />
              <span className={`block h-3.5 max-w-full rounded bg-superficie-alta ${ancho}`} />
            </span>
          ))}
        </span>
      </div>
    </li>
  );
}
