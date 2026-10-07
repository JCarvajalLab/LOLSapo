import { formatearWinrate, nombreRango } from "../logica/formato.js";
import { hashDeAmigo } from "../rutas/hash.js";
import { TituloSeccion } from "./TituloSeccion.jsx";

/** Cómo ordena el recolector el ranking de League (ver recolector/lolsapo/ranking.py). */
export const CRITERIO_LOL = "Orden: rango Solo/Dúo; sin rango, winrate de LOLSapo.";

/*
  Podio sin medallas: la posición es una cifra de marcador que se achica y se apaga al bajar.
  1.º: cifra grande ámbar y canto ámbar. 2.º y 3.º: cifra grande clara sobre superficie.
  4.º en adelante: cifra chica apagada y fila sin relleno, solo el borde.
*/
function estiloPosicion(posicion) {
  if (posicion === 1) return { fila: "losa podio-1 border-sapo/40", cifra: "text-[2rem] text-sapo" };
  if (posicion <= 3) return { fila: "losa", cifra: "text-[2rem] text-texto" };
  return { fila: "border-borde bg-transparent", cifra: "text-xl text-texto-suave" };
}

/**
 * Ranking interno del grupo (RF-07). El orden y el criterio vienen del JSON (lol.json o tft.json).
 * En escritorio cada fila mide lo mismo que una fila de amigo (80 px con borde, separación 3).
 * `onElegir(slug, enlace)` recibe además el enlace clicado (para devolverle el foco).
 * `detalle(fila, amigo)` arma la segunda línea y `hrefDe(slug)` el enlace de cada fila.
 * `criterio` es la nota al pie que explica el orden.
 */
export function Ranking({
  ranking,
  amigos,
  onElegir,
  idTitulo = "titulo-ranking",
  detalle = detalleCriterio,
  hrefDe = hashDeAmigo,
  criterio = CRITERIO_LOL,
}) {
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const filas = [...(ranking ?? [])].sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99));

  return (
    <section aria-labelledby={idTitulo} className="min-w-0">
      <TituloSeccion id={idTitulo}>Ranking</TituloSeccion>
      {filas.length === 0 ? (
        <p className="flex h-20 items-center justify-center rounded-lg border border-dashed border-borde text-sm text-texto-suave">
          Todavía no hay ranking.
        </p>
      ) : (
        <>
          <ol className="space-y-3">
            {filas.map((fila) => {
              const amigo = porSlug.get(fila.slug);
              const primero = fila.posicion === 1;
              const estilo = estiloPosicion(fila.posicion);
              return (
                <li key={fila.slug} data-posicion={fila.posicion}>
                  <a
                    href={hrefDe(fila.slug)}
                    onClick={(e) => {
                      if (!onElegir) return;
                      e.preventDefault();
                      onElegir(fila.slug, e.currentTarget);
                    }}
                    className={`group flex h-14 items-center gap-3 rounded-lg border pr-3 pl-2 hover:bg-superficie-alta focus-visible:rounded-lg lg:h-20 ${estilo.fila}`}
                  >
                    <span className={`marcador w-9 shrink-0 text-center leading-none ${estilo.cifra}`}>
                      {fila.posicion}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-titulo font-bold decoration-sapo decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
                        {fila.riot_id}
                      </span>
                      <span className="cifras block truncate text-xs text-texto-suave">
                        {primero && <span className="font-semibold text-sapo">Primero · </span>}
                        {detalle(fila, amigo)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-texto-suave group-hover:text-sapo">
                      ›
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
          {criterio && <p className="mt-3 text-xs text-texto-suave">{criterio}</p>}
        </>
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
