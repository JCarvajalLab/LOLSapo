import { formatearWinrate, nombreRango } from "../logica/formato.js";
import { hashDeAmigo } from "../rutas/hash.js";
import { TituloSeccion } from "./TituloSeccion.jsx";

/**
 * Ranking interno del grupo (RF-07). El orden y el criterio vienen del JSON (lol.json o tft.json).
 * En escritorio cada fila mide lo mismo que una fila de amigo (80 px con borde, separación 3).
 * `onElegir(slug, enlace)` recibe además el enlace clicado (para devolverle el foco).
 * `detalle(fila, amigo)` arma la segunda línea y `hrefDe(slug)` el enlace de cada fila.
 */
export function Ranking({ ranking, amigos, onElegir, idTitulo = "titulo-ranking", detalle = detalleCriterio, hrefDe = hashDeAmigo }) {
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const filas = [...(ranking ?? [])].sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99));

  return (
    <section aria-labelledby={idTitulo} className="min-w-0">
      <TituloSeccion id={idTitulo}>Ranking</TituloSeccion>
      {filas.length === 0 ? (
        <p className="flex h-20 items-center justify-center rounded-lg border border-borde bg-superficie text-sm text-texto-suave">
          Todavía no hay ranking.
        </p>
      ) : (
        <ol className="space-y-3">
          {filas.map((fila) => {
            const amigo = porSlug.get(fila.slug);
            const primero = fila.posicion === 1;
            return (
              <li key={fila.slug}>
                <a
                  href={hrefDe(fila.slug)}
                  onClick={(e) => {
                    if (!onElegir) return;
                    e.preventDefault();
                    onElegir(fila.slug, e.currentTarget);
                  }}
                  className={`flex h-14 items-center gap-3 rounded-lg border px-3 hover:bg-superficie-alta lg:h-20 ${
                    primero ? "border-sapo/50 bg-sapo-fondo" : "border-borde bg-superficie"
                  }`}
                >
                  <span
                    className={`cifras w-7 shrink-0 text-center font-titulo text-xl font-bold ${
                      primero ? "text-sapo" : "text-texto-suave"
                    }`}
                  >
                    {fila.posicion}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{fila.riot_id}</span>
                    <span className="block truncate text-xs text-texto-suave">
                      {primero && <span className="text-sapo">Primero · </span>}
                      {detalle(fila, amigo)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function detalleCriterio(fila, amigo) {
  if (fila.criterio === "rango") {
    const solo = amigo?.rangos?.solo;
    const nombre = nombreRango(solo);
    return nombre ? `${nombre} · ${solo.lp ?? 0} LP` : "Por rango";
  }
  const wr = amigo?.estadisticas?.total?.winrate;
  return `Sin Solo/Dúo · winrate ${formatearWinrate(wr)}`;
}
