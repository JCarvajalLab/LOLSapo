// Piezas pequeñas de TFT: puesto, rasgo activo y unidad con estrellas e ítems.
import { useState } from "react";
import {
  costoUnidad,
  nombreCampeonTft,
  nombreItemTft,
  nombreRasgoTft,
  urlCampeonTft,
  urlItemTft,
  urlRasgoTft,
} from "../logica/ddragonTft.js";
import { iniciales } from "../logica/formato.js";
import { claseCosto, claseEstrellas, estiloPuesto, estiloRasgo, textoPuesto } from "../logica/tft.js";
import { ImagenDD } from "./ImagenDD.jsx";

/** Puesto final grande: el número va siempre en texto; el color solo refuerza. */
export function MarcaPuesto({ puesto, className = "" }) {
  const estilo = estiloPuesto(puesto);
  return (
    <p
      className={`marcador text-4xl leading-none ${estilo.texto} ${className}`}
      data-puesto={estilo.grupo}
    >
      {textoPuesto(puesto)}
      <span className="sr-only"> puesto ({estilo.descripcion})</span>
    </p>
  );
}

/**
 * Rasgo activo: ícono negro sobre el color de su nivel (bronce, plata, oro, prismático)
 * y la cantidad de unidades al lado. Los únicos (de una unidad) son más chicos y sin número.
 */
export function RasgoTft({ rasgo, ddragon }) {
  const [fallido, setFallido] = useState(null);
  const nombre = nombreRasgoTft(ddragon, rasgo.id);
  const estilo = estiloRasgo(rasgo.estilo);
  const unidades = Number.isInteger(rasgo.unidades) ? rasgo.unidades : null;
  const etiqueta = `${nombre}${unidades ? ` (${unidades})` : ""}, nivel ${estilo.nombre}`;
  const src = urlRasgoTft(ddragon, rasgo.id);
  const caja = rasgo.unico ? "h-5 w-5" : "h-6 w-6";

  return (
    <li className="flex items-center gap-0.5" title={etiqueta} data-estilo={rasgo.estilo} data-unico={rasgo.unico ? "true" : undefined}>
      <span className={`inline-flex shrink-0 items-center justify-center rounded-md ${caja} ${estilo.fondo}`}>
        {src && fallido !== src ? (
          <img
            src={src}
            alt={etiqueta}
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFallido(src)}
            className={`brightness-0 ${rasgo.unico ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
        ) : (
          <span role="img" aria-label={etiqueta} className="text-[9px] leading-none font-bold text-fondo">
            {iniciales(nombre)}
          </span>
        )}
      </span>
      {!rasgo.unico && unidades !== null && (
        <span aria-hidden="true" className="cifras text-xs text-texto-suave">
          {unidades}
        </span>
      )}
    </li>
  );
}

/** Unidad del tablero: estrellas arriba, retrato con borde del color de su costo e ítems abajo. */
export function UnidadTft({ unidad, ddragon }) {
  const nombre = nombreCampeonTft(ddragon, unidad.id);
  const estrellas = Number.isInteger(unidad.estrellas) ? Math.min(Math.max(unidad.estrellas, 1), 4) : 1;
  const items = Array.isArray(unidad.items) ? unidad.items.filter((i) => typeof i === "string").slice(0, 3) : [];
  const costo = costoUnidad(ddragon, unidad);
  const textoEstrellas = `${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}`;

  return (
    <li className="flex w-10 flex-col items-center" data-costo={costo ?? undefined}>
      <span aria-hidden="true" className={`h-3 text-[10px] leading-3 tracking-tighter ${claseEstrellas(estrellas)}`}>
        {"★".repeat(estrellas)}
      </span>
      <span className={`inline-flex rounded-md border-2 ${claseCosto(costo)}`}>
        <ImagenDD
          src={urlCampeonTft(ddragon, unidad.id)}
          alt={`${nombre}, ${textoEstrellas}${costo ? `, costo ${costo}` : ""}`}
          tamaño={36}
        />
      </span>
      {items.length > 0 ? (
        <ul className="mt-0.5 flex h-3 gap-px" aria-label={`Ítems de ${nombre}`}>
          {items.map((id, i) => (
            <li key={`${id}-${i}`} className="inline-flex">
              <ImagenDD src={urlItemTft(ddragon, id)} alt={nombreItemTft(ddragon, id)} tamaño={12} />
            </li>
          ))}
        </ul>
      ) : (
        <span aria-hidden="true" className="mt-0.5 block h-3" />
      )}
    </li>
  );
}
