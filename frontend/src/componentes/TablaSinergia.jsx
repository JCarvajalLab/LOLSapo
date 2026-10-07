import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { nombreRango } from "../logica/formato.js";
import {
  anchoPartidas,
  esWinratePositivo,
  filasConTodos,
  formatearTasa,
  ORDEN_INICIAL,
  siguienteOrden,
} from "../logica/sinergia.js";
import { Barra } from "./Barra.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

/**
 * Tabla "Con quién gana más" de un amigo, al estilo "Jugado con" de op.gg.
 * No sabe dónde se muestra (modal o desplegado): recibe las filas ya validadas
 * (`logica/sinergia.js`), los slugs de todos los compañeros del grupo (`companeros`)
 * y los amigos para el ícono, el nombre y el rango. Los compañeros sin partidas juntos
 * aparecen al final con `textoSinPartidas`.
 * Se ordena por "Jugadas" o "Tasa de victorias" haciendo clic en el encabezado. El orden
 * puede venir de afuera (`orden` + `onOrdenar`) para que sobreviva al cambio de período.
 */
export function TablaSinergia({
  filas,
  companeros,
  amigos,
  ddragon,
  etiqueta,
  textoSinPartidas = "Todavía no han jugado juntos",
  orden: ordenExterno,
  onOrdenar,
}) {
  const [ordenInterno, setOrdenInterno] = useState(ORDEN_INICIAL);
  const orden = ordenExterno ?? ordenInterno;

  if (!companeros || companeros.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-borde px-3 py-6 text-center text-sm text-texto-suave">
        No hay otros amigos en el grupo.
      </p>
    );
  }

  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const lista = filasConTodos(filas, companeros, orden.columna, orden.direccion);
  const maximo = Math.max(0, ...lista.map((f) => f.partidas));
  const alOrdenar = (columna) => {
    const siguiente = siguienteOrden(orden, columna);
    if (onOrdenar) onOrdenar(siguiente);
    else setOrdenInterno(siguiente);
  };

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
      <tbody className="cascada">
        {lista.map((fila) => (
          <FilaSinergia
            key={fila.amigo}
            fila={fila}
            companero={porSlug.get(fila.amigo)}
            ddragon={ddragon}
            maximo={maximo}
            textoSinPartidas={textoSinPartidas}
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

function FilaSinergia({ fila, companero, ddragon, maximo, textoSinPartidas }) {
  const riotId = companero?.riot_id ?? fila.amigo;
  const rango = nombreRango(companero?.rangos?.solo) ?? "Sin clasificar";
  const positivo = esWinratePositivo(fila.winrate);
  return (
    <tr className="border-b border-borde last:border-b-0" data-sin-partidas={fila.sinPartidas ? "" : undefined}>
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
            <span className="block truncate font-titulo font-bold">{riotId}</span>
            <span className="block truncate text-xs text-texto-suave">{rango}</span>
          </span>
        </span>
      </th>
      {fila.sinPartidas ? (
        <td colSpan={2} className="py-2 pl-2 align-middle text-xs text-texto-suave">
          {textoSinPartidas}
        </td>
      ) : (
        <CeldasCifras fila={fila} maximo={maximo} positivo={positivo} />
      )}
    </tr>
  );
}

function CeldasCifras({ fila, maximo, positivo }) {
  return (
    <>
      <td className="py-2 pl-2 align-middle">
        <Barra ancho={anchoPartidas(fila.partidas, maximo)} clase="bg-ranked" />
        <span className="marcador mt-1 block text-base leading-none">{fila.partidas}</span>
      </td>
      <td className="py-2 pl-2 align-middle">
        <Barra ancho={fila.winrate ?? 0} clase={positivo ? "bg-victoria" : "bg-derrota"} />
        <span className={`marcador mt-1 block text-base leading-none ${positivo ? "text-victoria" : "text-derrota"}`}>
          {formatearTasa(fila.winrate)}
        </span>
      </td>
    </>
  );
}
