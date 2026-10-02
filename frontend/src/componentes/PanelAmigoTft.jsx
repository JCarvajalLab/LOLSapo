import { esNumero, fechaCorta, formatearWinrate, claseWinrate } from "../logica/formato.js";
import { esRanked } from "../logica/partidas.js";
import { formatearPromedio, textoRangoTft, tierTurbo, top4DeRango } from "../logica/tft.js";
import { BarraWinrate } from "./Etiquetas.jsx";
import { FilaPartidaTft } from "./FilaPartidaTft.jsx";

const numeros = new Intl.NumberFormat("es");

/** Contenido desplegado de un amigo en TFT. Solo se monta al abrir su fila. */
export function PanelAmigoTft({ amigo, ddragon, ahora }) {
  const partidas = Array.isArray(amigo.partidas) ? amigo.partidas.filter(Boolean) : [];
  return (
    <div className="space-y-4 border-t border-borde px-3 py-4 sm:px-4">
      <p className="text-sm text-texto-suave">
        Contando desde {fechaCorta(amigo.seguimiento_desde)}. Las estadísticas por modo solo incluyen partidas
        registradas por LOLSapo.
      </p>

      <RangosTft rangos={amigo.rangos} />

      <section aria-label="Desglose por modo" className="space-y-2">
        <h3 className="font-titulo font-bold">Por modo</h3>
        <DesgloseModosTft modos={amigo.estadisticas?.por_modo} />
      </section>

      <section aria-label="Últimas partidas" className="space-y-2">
        <h3 className="font-titulo font-bold">Últimas partidas</h3>
        {partidas.length === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no hay partidas de TFT registradas.</p>
        ) : (
          <ol className="space-y-2">
            {partidas.map((p, i) => (
              <li key={p.id ?? i}>
                <FilaPartidaTft partida={p} ddragon={ddragon} ahora={ahora} slugPropio={amigo.slug} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** Rangos de las colas con liga: Ranked, Dúo dinámico (Double Up) y Hyper Roll. Solo las que existen. */
function RangosTft({ rangos }) {
  const r = rangos && typeof rangos === "object" ? rangos : {};
  const colas = [
    r.ranked && { clave: "ranked", nombre: "Ranked", rango: r.ranked },
    r.doble && { clave: "doble", nombre: "Dúo dinámico", rango: r.doble },
    r.turbo && { clave: "turbo", nombre: "Hyper Roll", rango: r.turbo, turbo: true },
  ].filter(Boolean);

  if (colas.length === 0) {
    return <p className="text-sm text-texto-suave">Sin rango en ninguna cola de TFT esta temporada.</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-3" aria-label="Rangos">
      {colas.map((c) => (
        <li key={c.clave} className="rounded-md border border-borde bg-fondo/40 px-3 py-2 text-sm" data-cola={c.clave}>
          <p className="text-xs text-texto-suave">{c.nombre}</p>
          {c.turbo ? <ValorTurbo rango={c.rango} /> : <ValorLiga rango={c.rango} />}
        </li>
      ))}
    </ul>
  );
}

function ValorLiga({ rango }) {
  const texto = textoRangoTft(rango) ?? "Sin rango";
  const pct = top4DeRango(rango);
  return (
    <>
      <p className="cifras font-semibold">
        {texto}
        {rango.racha === true && (
          <span role="img" aria-label="En racha" title="En racha" className="ml-1">
            🔥
          </span>
        )}
      </p>
      <p className="cifras text-xs text-texto-suave">
        {esNumero(rango.top4) && esNumero(rango.partidas) ? (
          <>
            {rango.top4} top 4 en {rango.partidas} partidas ·{" "}
            <span className={`font-semibold ${claseWinrate(pct)}`}>{formatearWinrate(pct)}</span>
          </>
        ) : (
          "Sin partidas"
        )}
      </p>
    </>
  );
}

function ValorTurbo({ rango }) {
  const tier = tierTurbo(rango);
  const pct = top4DeRango(rango);
  return (
    <>
      <p className="cifras font-semibold">
        {tier ? <span className={tier.clase}>{tier.nombre}</span> : "Sin tier"}
        {esNumero(rango.puntos) && <span className="text-texto"> · {numeros.format(rango.puntos)} puntos</span>}
      </p>
      <p className="cifras text-xs text-texto-suave">
        {esNumero(rango.top4) && esNumero(rango.partidas) ? (
          <>
            {rango.top4} top 4 en {rango.partidas} partidas ·{" "}
            <span className={`font-semibold ${claseWinrate(pct)}`}>{formatearWinrate(pct)}</span>
          </>
        ) : (
          "Sin partidas"
        )}
      </p>
    </>
  );
}

/** Partidas, top 4 % y puesto promedio por modo, con barra de top 4. */
export function DesgloseModosTft({ modos }) {
  const lista = Array.isArray(modos) ? modos.filter(Boolean) : [];
  if (lista.length === 0) {
    return <p className="text-sm text-texto-suave">Sin partidas registradas todavía.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="Desglose por modo">
      {lista.map((m) => (
        <li key={m.queue_id ?? m.nombre} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
          <span className="truncate">
            {esRanked(m) && (
              <span aria-hidden="true" className="mr-1 text-ranked">
                ◆
              </span>
            )}
            {m.nombre || "Modo especial"}
            <span className="cifras text-texto-suave">
              {" "}
              · {m.partidas ?? 0} {m.partidas === 1 ? "partida" : "partidas"}
            </span>
          </span>
          <span className="cifras whitespace-nowrap">
            <span className="text-texto-suave">Top 4 </span>
            <span className={`font-semibold ${claseWinrate(m.top4_pct)}`}>{formatearWinrate(m.top4_pct)}</span>
            <span className="text-texto-suave"> · Prom. </span>
            <span className="font-semibold">{formatearPromedio(m.promedio)}</span>
          </span>
          <BarraWinrate winrate={m.top4_pct} className="col-span-2" />
        </li>
      ))}
    </ul>
  );
}
