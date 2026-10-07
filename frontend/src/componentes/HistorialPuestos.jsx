import { etiquetaFiltro } from "../logica/filtros.js";
import { estiloPuesto, historialDe, textoPuesto, tituloHistorial } from "../logica/tft.js";

/**
 * Grilla de puestos de las últimas partidas de TFT (hasta 30), el más reciente arriba a la izquierda.
 * El número va siempre visible; el color solo refuerza (1.º dorado, 2.º a 4.º verde, 5.º a 8.º apagado).
 * Sin historial no se muestra nada.
 */
export function HistorialPuestos({ historial, filtro = "todos" }) {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  const puestos = historialDe(historial, filtro);
  const filtrado = filtro !== "todos";

  return (
    <section aria-label="Historial de puestos" className="w-full max-w-sm space-y-2 lg:w-80">
      <div>
        <h3 className="titulo-sub">{tituloHistorial(puestos.length)}</h3>
        <p className="text-xs text-texto-suave">
          {filtrado && `${etiquetaFiltro(filtro)} · `}Más reciente primero
        </p>
      </div>
      {puestos.length === 0 ? (
        <p className="text-sm text-texto-suave">
          No hay partidas de {etiquetaFiltro(filtro)} en las últimas {historial.length}. Prueba con Todos.
        </p>
      ) : (
        <ol className="grid grid-cols-10 gap-1" aria-label="Puestos, del más reciente al más antiguo">
          {puestos.map((h, i) => (
            <CeldaPuesto key={i} indice={i} puesto={h.puesto} modo={h.modo} />
          ))}
        </ol>
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
      className={`marcador flex aspect-square min-w-0 items-center justify-center rounded-md border text-sm ${estilo.celda}`}
    >
      <span aria-hidden="true">#{puesto}</span>
      <span className="sr-only">{descripcion}</span>
    </li>
  );
}
