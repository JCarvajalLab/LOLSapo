import { formatearWinrate, nombreRango } from "../logica/formato.js";
import { hashDeAmigo } from "../rutas/hash.js";

/** Ranking interno del grupo (RF-07). El orden y el criterio vienen de lol.json. */
export function Ranking({ ranking, amigos, onElegir }) {
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const filas = [...(ranking ?? [])].sort((a, b) => (a.posicion ?? 99) - (b.posicion ?? 99));

  return (
    <section aria-labelledby="titulo-ranking" className="rounded-lg border border-borde bg-superficie p-3">
      <h2 id="titulo-ranking" className="mb-2 font-titulo text-lg font-bold">
        Ranking
      </h2>
      {filas.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay ranking.</p>
      ) : (
        <ol className="space-y-1">
          {filas.map((fila) => {
            const amigo = porSlug.get(fila.slug);
            const primero = fila.posicion === 1;
            return (
              <li key={fila.slug}>
                <a
                  href={hashDeAmigo(fila.slug)}
                  onClick={(e) => {
                    if (!onElegir) return;
                    e.preventDefault();
                    onElegir(fila.slug);
                  }}
                  className={`flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-superficie-alta ${
                    primero ? "border border-sapo/50 bg-sapo-fondo" : ""
                  }`}
                >
                  <span
                    className={`cifras w-6 text-center font-titulo text-lg font-bold ${
                      primero ? "text-sapo" : "text-texto-suave"
                    }`}
                  >
                    {fila.posicion}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{fila.riot_id}</span>
                    <span className="block text-xs text-texto-suave">
                      {primero && <span className="text-sapo">Primero · </span>}
                      {detalleCriterio(fila, amigo)}
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
