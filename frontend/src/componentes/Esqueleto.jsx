import { FilaAmigoEsqueleto } from "./FilaAmigo.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/** Cantidad de filas de relleno mientras no se sabe cuántos amigos hay. */
export const FILAS_ESQUELETO = 5;

/**
 * Esqueleto de la primera carga: mismos títulos, paneles y alturas que la página real,
 * para que nada salte cuando llegan los datos. Sin animación (la única es el "saco vocal").
 */
export function EsqueletoPagina() {
  const filas = Array.from({ length: FILAS_ESQUELETO }, (_, i) => i);
  return (
    <div role="status" aria-label="Cargando datos…" className="space-y-6" data-esqueleto-pagina="true">
      <span className="sr-only">Cargando datos…</span>

      <section aria-hidden="true">
        <TituloSeccion>En partida</TituloSeccion>
        <div className="flex min-h-32 items-center justify-center rounded-lg border border-borde bg-superficie p-2 sm:p-4">
          <span className="block h-3 w-40 rounded bg-superficie-alta" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start" aria-hidden="true">
        <section className="min-w-0">
          <TituloSeccion>Ranking</TituloSeccion>
          <ol className="space-y-3">
            {filas.map((i) => (
              <li
                key={i}
                className="flex h-14 items-center gap-3 rounded-lg border border-borde bg-superficie px-3 lg:h-20"
                data-esqueleto="true"
              >
                <span className="block h-5 w-7 rounded bg-superficie-alta" />
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
              <FilaAmigoEsqueleto key={i} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
