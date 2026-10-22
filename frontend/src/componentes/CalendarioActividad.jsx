import { useMemo } from "react";
import {
  DIAS_SEMANA_CORTOS,
  extraerActividad,
  formatearFechaCorta,
  formatearTiempoJugado,
  generarEtiquetasMeses,
  generarMatrizActividad,
  nivelCalor,
} from "../logica/calendarioActividad.js";
import { ElementoConTooltip } from "./TooltipFlotante.jsx";

function IconoReloj() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 text-texto-suave fill-current shrink-0"
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-.5 2.5v3.5l2.5 1.5.7-1.2-1.9-1.1V5h-1.3z" />
    </svg>
  );
}

/** Contenido del tooltip flotante para cada celda de día */
export function ContenidoTooltipActividad({ dia }) {
  const { fechaIso, partidas, victorias, derrotas, remakes, duracion } = dia;
  return (
    <div className="space-y-1 text-xs select-none min-w-[135px] p-1">
      <div className="font-semibold text-texto leading-tight">
        <span>{formatearFechaCorta(fechaIso)}: </span>
        <span className="text-sapo font-bold">
          {partidas} {partidas === 1 ? "partida" : "partidas"}
        </span>
      </div>
      <div className="text-texto-suave text-[11px] leading-tight">
        <span>Tiempo jugado: </span>
        <span className="font-medium text-texto/90">{formatearTiempoJugado(duracion)}</span>
      </div>
      <div className="text-texto-suave text-[11px] leading-tight">
        <span>Registro: </span>
        <span className="text-victoria font-bold">{victorias}V</span>
        {" - "}
        <span className="text-derrota font-bold">{derrotas}D</span>
        {remakes > 0 && <span className="text-remake font-medium"> ({remakes}R)</span>}
      </div>
    </div>
  );
}

const CLASES_NIVEL = {
  0: "bg-[#132337]/70 border-borde/30 hover:border-borde/70",
  1: "bg-[#134e4a] border-[#14b8a6]/30 hover:brightness-125",
  2: "bg-[#0d9488] border-[#2dd4bf]/40 hover:brightness-125",
  3: "bg-[#2dd4bf] border-[#99f6e4]/60 hover:brightness-125",
};

/**
 * Calendario de actividad reciente tipo heatmap (semanas x días) estilo OP.GG.
 * Muestra el volumen histórico de partidas jugadas por día, con meses y días de semana.
 */
export function CalendarioActividad({ actividad = {}, ahora, partidas = [], totalSemanas = 15 }) {
  const actividadFinal = useMemo(
    () => extraerActividad(actividad, partidas),
    [actividad, partidas],
  );

  const semanas = useMemo(
    () => generarMatrizActividad(actividadFinal, ahora, totalSemanas),
    [actividadFinal, ahora, totalSemanas],
  );

  const etiquetasMeses = useMemo(() => generarEtiquetasMeses(semanas), [semanas]);
  const mapaMesesPorCol = useMemo(() => {
    const mapa = {};
    etiquetasMeses.forEach((em) => {
      mapa[em.columna] = em.etiqueta;
    });
    return mapa;
  }, [etiquetasMeses]);

  return (
    <section
      aria-label="Actividad reciente"
      className="panel-flotante border border-borde/60 bg-superficie/70 rounded-lg p-2.5 sm:p-3 select-none flex flex-col items-center shrink-0 w-fit"
    >
      {/* Encabezado */}
      <div className="flex items-center justify-center gap-2 mb-2 w-full">
        <IconoReloj />
        <h4 className="text-[11px] sm:text-xs font-bold tracking-wider text-texto uppercase">
          ACTIVIDAD RECIENTE
        </h4>
        <IconoReloj />
      </div>

      {/* Contenedor del Heatmap */}
      <div className="flex flex-col">
        {/* Fila de Meses (ubicada con holgura sobre los cuadraditos) */}
        <div className="flex items-end pl-5 sm:pl-6 h-4 mb-2 text-[10px] text-texto-suave font-semibold leading-none">
          <div className="grid grid-flow-col auto-cols-max gap-1">
            {semanas.map((_, colIdx) => (
              <div
                key={colIdx}
                className="w-2.5 sm:w-3 text-left overflow-visible whitespace-nowrap relative h-3.5"
              >
                {mapaMesesPorCol[colIdx] && (
                  <span className="absolute bottom-0 left-0 leading-none">
                    {mapaMesesPorCol[colIdx]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grilla principal: Días a la izquierda + Columnas de semanas */}
        <div className="flex items-start gap-1">
          {/* Etiquetas de días de la semana */}
          <div className="flex flex-col gap-1 pr-0.5 text-[9px] sm:text-[9.5px] text-texto-suave/80 font-medium leading-none">
            {DIAS_SEMANA_CORTOS.map((d, i) => (
              <span
                key={i}
                className="h-2.5 sm:h-3 flex items-center justify-end"
                aria-hidden="true"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Columnas de Semanas (Lunes a Domingo) */}
          <div
            role="grid"
            aria-label="Matriz de actividad por día"
            className="grid grid-flow-col auto-cols-max gap-1"
          >
            {semanas.map((semana, colIdx) => (
              <div key={colIdx} role="row" className="flex flex-col gap-1">
                {semana.map((dia) => {
                  if (dia.esFuturo) {
                    return (
                      <div
                        key={dia.fechaIso}
                        role="gridcell"
                        aria-hidden="true"
                        className="size-2.5 sm:size-3 invisible pointer-events-none"
                      />
                    );
                  }

                  const nivel = nivelCalor(dia.partidas);
                  const claseColor = CLASES_NIVEL[nivel] || CLASES_NIVEL[0];

                  return (
                    <ElementoConTooltip
                      key={dia.fechaIso}
                      tooltip={<ContenidoTooltipActividad dia={dia} />}
                    >
                      <button
                        type="button"
                        role="gridcell"
                        aria-label={`${formatearFechaCorta(dia.fechaIso)}: ${dia.partidas} partidas`}
                        tabIndex={0}
                        className={`size-2.5 sm:size-3 rounded-[2px] border transition-all cursor-pointer ${claseColor}`}
                      />
                    </ElementoConTooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
