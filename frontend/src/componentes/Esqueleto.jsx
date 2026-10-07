import { FilaAmigoEsqueleto } from "./FilaAmigo.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/** Cantidad de filas de relleno mientras no se sabe cuántos amigos hay. */
export const FILAS_ESQUELETO = 5;

/**
 * Esqueleto de la primera carga: mismos títulos, paneles y alturas que la página real,
 * para que nada salte cuando llegan los datos. TFT pasa su propia fila de relleno. Sin animación (la única es el "saco vocal").
 */
export function EsqueletoPagina({ FilaEsqueleto = FilaAmigoEsqueleto, etiqueta = "Cargando datos…" }) {
  const filas = Array.from({ length: FILAS_ESQUELETO }, (_, i) => i);
  return (
    <div role="status" aria-label={etiqueta} className="space-y-8 sm:space-y-10" data-esqueleto-pagina="true">
      <span className="sr-only">{etiqueta}</span>

      <section aria-hidden="true">
        <TituloSeccion>En partida</TituloSeccion>
        <div className="losa flex min-h-32 items-center justify-center rounded-lg border p-2 sm:p-4">
          <span className="block h-3 w-40 rounded bg-superficie-alta" />
        </div>
      </section>

      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start" aria-hidden="true">
        <section className="min-w-0">
          <TituloSeccion>Ranking</TituloSeccion>
          <ol className="space-y-3">
            {filas.map((i) => (
              <li
                key={i}
                className={`flex h-14 items-center gap-3 rounded-lg border pr-3 pl-2 lg:h-20 ${
                  i < 3 ? "losa" : "border-borde bg-transparent"
                }`}
                data-esqueleto="true"
              >
                <span className={`mx-1 block w-7 rounded bg-superficie-alta ${i < 3 ? "h-7" : "h-5"}`} />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="block h-3.5 w-28 rounded bg-superficie-alta" />
                  <span className="block h-2.5 w-20 rounded bg-superficie-alta" />
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="min-w-0">
          <TituloSeccion>Amigos</TituloSeccion>
          <ul className="space-y-3">
            {filas.map((i) => (
              <FilaEsqueleto key={i} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
