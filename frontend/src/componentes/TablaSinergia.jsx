import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { nombreRango } from "../logica/formato.js";
import {
  anchoPartidas,
  esWinratePositivo,
  formatearTasa,
  ordenarSinergia,
  siguienteOrden,
} from "../logica/sinergia.js";
import { ImagenDD } from "./ImagenDD.jsx";

const ORDEN_INICIAL = { columna: "partidas", direccion: "desc" };

/**
 * Tabla "Con quién gana más" de un amigo, al estilo "Jugado con" de op.gg.
 * No sabe dónde se muestra (modal o desplegado): recibe las filas ya validadas
 * (`logica/sinergia.js`) y los amigos para el ícono, el nombre y el rango.
 * Se ordena por "Jugadas" o "Tasa de victorias" haciendo clic en el encabezado.
 */
export function TablaSinergia({ filas, amigos, ddragon, etiqueta }) {
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  if (!filas || filas.length === 0) {
    return (
      <p className="rounded-lg border border-borde bg-fondo px-3 py-6 text-center text-sm text-texto-suave">
        Todavía no hay partidas en equipo registradas con el grupo.
      </p>
    );
  }

  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const maximo = Math.max(...filas.map((f) => f.partidas));
  const ordenadas = ordenarSinergia(filas, orden.columna, orden.direccion);
  const alOrdenar = (columna) => setOrden((actual) => siguienteOrden(actual, columna));

  return (
    <table className="w-full table-fixed border-collapse text-sm">
      {etiqueta && <caption className="sr-only">{etiqueta}</caption>}
      <thead>
        <tr className="border-b border-borde text-left text-xs text-texto-suave">
          <th scope="col" className="py-2 pr-2 font-semibold">
            Con
          </th>
          <EncabezadoOrdenable
            columna="partidas"
            orden={orden}
            onOrdenar={alOrdenar}
            className="w-[5.5rem] sm:w-32"
          >
            Jugadas
          </EncabezadoOrdenable>
          <EncabezadoOrdenable
            columna="winrate"
            orden={orden}
            onOrdenar={alOrdenar}
            className="w-[6.5rem] sm:w-36"
          >
            Tasa de victorias
          </EncabezadoOrdenable>
        </tr>
      </thead>
      <tbody>
        {ordenadas.map((fila) => (
          <FilaSinergia
            key={fila.amigo}
            fila={fila}
            companero={porSlug.get(fila.amigo)}
            ddragon={ddragon}
            maximo={maximo}
          />
        ))}
      </tbody>
    </table>
  );
}

function EncabezadoOrdenable({ columna, orden, onOrdenar, className, children }) {
  const activo = orden.columna === columna;
  const descendente = orden.direccion === "desc";
  let ariaSort = "none";
  if (activo) ariaSort = descendente ? "descending" : "ascending";
  return (
    <th scope="col" aria-sort={ariaSort} className={`py-2 pl-2 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className={`inline-flex items-center gap-1 text-left leading-tight hover:text-texto ${
          activo ? "text-texto" : ""
        }`}
      >
        {children}
        <span aria-hidden="true" className={activo ? "text-sapo" : "opacity-40"}>
          {activo && !descendente ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}

function FilaSinergia({ fila, companero, ddragon, maximo }) {
  const riotId = companero?.riot_id ?? fila.amigo;
  const rango = nombreRango(companero?.rangos?.solo) ?? "Sin clasificar";
  const positivo = esWinratePositivo(fila.winrate);
  return (
    <tr className="border-b border-borde last:border-b-0">
      <th scope="row" className="py-2 pr-2 text-left font-normal">
        <span className="flex min-w-0 items-center gap-2">
          <ImagenDD
            src={urlIconoPerfil(ddragon, companero?.perfil?.icono)}
            alt={`Ícono de ${riotId}`}
            respaldo={riotId}
            tamaño={28}
            redonda
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{riotId}</span>
            <span className="block truncate text-xs text-texto-suave">{rango}</span>
          </span>
        </span>
      </th>
      <td className="py-2 pl-2 align-middle">
        <Barra ancho={anchoPartidas(fila.partidas, maximo)} clase="bg-ranked" />
        <span className="cifras mt-1 block text-xs">{fila.partidas}</span>
      </td>
      <td className="py-2 pl-2 align-middle">
        <Barra ancho={fila.winrate ?? 0} clase={positivo ? "bg-victoria" : "bg-derrota"} />
        <span className={`cifras mt-1 block text-xs font-semibold ${positivo ? "text-victoria" : "text-derrota"}`}>
          {formatearTasa(fila.winrate)}
        </span>
      </td>
    </tr>
  );
}

/** Barra decorativa: el número va siempre al lado en texto. Ancho vía CSSOM, como BarraWinrate. */
function Barra({ ancho, clase }) {
  const valor = Math.min(100, Math.max(0, ancho));
  return (
    <span className="relative block h-1.5 overflow-hidden rounded-full bg-superficie-alta" aria-hidden="true">
      <span data-barra className={`absolute inset-y-0 left-0 rounded-full ${clase}`} style={{ width: `${valor}%` }} />
    </span>
  );
}
