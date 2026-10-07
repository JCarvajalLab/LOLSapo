import { esRanked } from "../logica/partidas.js";
import { BarraWinrate, RegistroVD } from "./Etiquetas.jsx";

/** Victorias y derrotas por modo, con barra de winrate. */
export function DesgloseModos({ modos }) {
  if (!modos || modos.length === 0) {
    return <p className="text-sm text-texto-suave">Sin partidas registradas en este filtro.</p>;
  }
  return (
    <ul className="divide-y divide-borde/70" aria-label="Desglose por modo">
      {modos.map((m) => (
        <li key={m.queue_id ?? m.nombre} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2 text-sm first:pt-0">
          <span className="truncate">
            {esRanked(m) && (
              <span aria-hidden="true" className="mr-1 text-ranked">
                ◆
              </span>
            )}
            {m.nombre || "Modo especial"}
            <span className="cifras text-texto-suave"> · {m.partidas ?? 0} partidas</span>
          </span>
          <RegistroVD victorias={m.victorias} derrotas={m.derrotas} remakes={m.remakes} winrate={m.winrate} />
          <BarraWinrate winrate={m.winrate} className="col-span-2" />
        </li>
      ))}
    </ul>
  );
}
