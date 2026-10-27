import { etiquetaFiltro } from "../logica/filtros.js";
import { estiloPuesto, historialDe, textoPuesto, tituloHistorial } from "../logica/tft.js";

/**
 * Grilla de puestos de las últimas partidas de TFT (hasta 30), el más reciente arriba a la izquierda.
 * El número va siempre visible; el color solo refuerza (1.º dorado, 2.º a 4.º verde, 5.º a 8.º apagado).
 * Diseñado como tarjeta estilizada con bordes definidos, relieve suave y métricas de Top 4.
 * Sin historial no se muestra nada.
 */
export function HistorialPuestos({ historial, filtro = "todos" }) {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  const puestos = historialDe(historial, filtro);
  const filtrado = filtro !== "todos";

  const primerLugarCount = puestos.filter((p) => p.puesto === 1).length;
  const top4Count = puestos.filter((p) => p.puesto <= 4).length;
  const pctTop4 = puestos.length > 0 ? Math.round((top4Count / puestos.length) * 100) : 0;

  return (
    <section
      aria-label="Historial de puestos"
      className="panel-flotante border border-borde/70 bg-superficie/70 rounded-xl p-3 sm:p-3.5 shadow-sm losa space-y-2.5 shrink-0 self-center lg:self-start w-fit max-w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="titulo-sub text-xs sm:text-sm font-bold tracking-wide truncate">
            {tituloHistorial(puestos.length)}
          </h3>
          <p className="text-[11px] text-texto-suave mt-0.5">
            {filtrado && `${etiquetaFiltro(filtro)} · `}Más reciente primero
          </p>
        </div>
        {puestos.length > 0 && (
          <span className="shrink-0 rounded border border-borde/60 bg-superficie-alta/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-texto-suave">
            {puestos.length} pts
          </span>
        )}
      </div>

      {puestos.length === 0 ? (
        <p className="text-sm text-texto-suave py-2">
          No hay partidas de {etiquetaFiltro(filtro)} en las últimas {historial.length}. Prueba con Todos.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-borde/60 bg-superficie/40 p-1.5">
            <ol className="grid grid-cols-10 gap-1 sm:gap-1.5" aria-label="Puestos, del más reciente al más antiguo">
              {puestos.map((h, i) => (
                <CeldaPuesto key={i} indice={i} puesto={h.puesto} modo={h.modo} />
              ))}
            </ol>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-borde/40 text-[11px] text-texto-suave">
            <span>
              <strong className="text-texto font-semibold">{top4Count}</strong> de {puestos.length} en Top 4 (
              <span className={pctTop4 >= 50 ? "text-victoria font-medium" : "text-derrota font-medium"}>
                {pctTop4}%
              </span>
              )
            </span>
            {primerLugarCount > 0 && (
              <span className="font-semibold text-oro flex items-center gap-1">
                <span aria-hidden="true">★</span> {primerLugarCount} {primerLugarCount === 1 ? "victoria" : "victorias"}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function CeldaPuesto({ indice, puesto, modo }) {
  const estilo = estiloPuesto(puesto);
  const descripcion = `Partida ${indice + 1}${indice === 0 ? " (más reciente)" : ""}: ${textoPuesto(puesto)} · ${
    modo || "Modo especial"
  }`;
  return (
    <li
      title={descripcion}
      data-puesto={estilo.grupo}
      className={`marcador flex h-7 w-7 sm:h-8 sm:w-8 min-w-0 items-center justify-center rounded-md border text-xs sm:text-sm font-bold transition-all hover:scale-110 hover:z-10 shadow-xs cursor-default ${estilo.celda}`}
    >
      <span aria-hidden="true">#{puesto}</span>
      <span className="sr-only">{descripcion}</span>
    </li>
  );
}
