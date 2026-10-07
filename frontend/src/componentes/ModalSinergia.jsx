import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { ORDEN_INICIAL, PERIODOS_SINERGIA } from "../logica/sinergia.js";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { TablaSinergia } from "./TablaSinergia.jsx";

const ID_TITULO = "titulo-sinergia";

// Textos de cada período: botón, nota bajo el título y fila de quien no jugó con el amigo.
const TEXTOS_PERIODO = {
  ultimos_30_dias: {
    boton: "Últimos 30 días",
    nota: "últimos 30 días",
    sinPartidas: "No han jugado juntos en los últimos 30 días",
  },
  todo: {
    boton: "Todo lo registrado",
    nota: "todo lo registrado",
    sinPartidas: "Todavía no han jugado juntos",
  },
};

/**
 * Opción A: la sinergia de un amigo en una ventana sobre la página.
 * `sinergia` es la validada por `validarSinergia`: { ultimos_30_dias, todo }, cada uno
 * { <slug>: filas } o null si el recolector no lo generó.
 * La tabla es TablaSinergia, la misma que podría ir desplegada dentro del Ranking.
 * El período y el orden viven aquí para que el orden se mantenga al cambiar de período.
 */
export function ModalSinergia({ amigo, sinergia, amigos, ddragon, onCerrar, onVerPartidas }) {
  const [periodo, setPeriodo] = useState(PERIODOS_SINERGIA[0]);
  const [orden, setOrden] = useState(ORDEN_INICIAL);
  const riotId = amigo?.riot_id ?? "";
  const textos = TEXTOS_PERIODO[periodo];
  const datosPeriodo = sinergia?.[periodo] ?? null;
  const companeros = (amigos ?? []).map((a) => a?.slug).filter((s) => typeof s === "string" && s !== amigo?.slug);
  return (
    <Dialogo
      idTitulo={ID_TITULO}
      onCerrar={onCerrar}
      titulo={
        <>
          <div className="flex items-center gap-2">
            <ImagenDD
              src={urlIconoPerfil(ddragon, amigo?.perfil?.icono)}
              alt={`Ícono de ${riotId}`}
              respaldo={riotId}
              tamaño={32}
              redonda
            />
            <h2 id={ID_TITULO} className="titulo-seccion min-w-0 text-lg break-words">
              Con quién gana más <span className="text-texto-suave">·</span> {riotId}
            </h2>
          </div>
          <p className="mt-1 text-xs text-texto-suave">Partidas en el mismo equipo · Normal y Ranked · {textos.nota}</p>
        </>
      }
    >
      <div role="group" aria-label="Período" className="segmentos mb-3">
        {PERIODOS_SINERGIA.map((clave) => {
          const activo = clave === periodo;
          return (
            <button
              key={clave}
              type="button"
              aria-pressed={activo}
              onClick={() => setPeriodo(clave)}
              className="segmento min-h-9"
            >
              {TEXTOS_PERIODO[clave].boton}
            </button>
          );
        })}
      </div>
      {datosPeriodo ? (
        <TablaSinergia
          key={periodo}
          filas={datosPeriodo[amigo?.slug] ?? []}
          companeros={companeros}
          amigos={amigos}
          ddragon={ddragon}
          etiqueta={`Compañeros de ${riotId} en el grupo, ${textos.nota}`}
          textoSinPartidas={textos.sinPartidas}
          orden={orden}
          onOrdenar={setOrden}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-borde px-3 py-6 text-center text-sm text-texto-suave">
          Sin datos para este período. Se calculan en la próxima actualización.
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onVerPartidas}
          className="min-h-10 rounded-lg border border-sapo/60 bg-sapo-fondo px-4 py-2 text-sm font-semibold text-sapo hover:bg-sapo/20"
        >
          Ver sus últimas partidas
        </button>
      </div>
    </Dialogo>
  );
}
