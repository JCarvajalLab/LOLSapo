import { urlIconoPerfil } from "../logica/ddragon.js";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { TablaSinergia } from "./TablaSinergia.jsx";

const ID_TITULO = "titulo-sinergia";

/**
 * Opción A: la sinergia de un amigo en una ventana sobre la página.
 * La tabla es TablaSinergia, la misma que podría ir desplegada dentro del Ranking.
 */
export function ModalSinergia({ amigo, filas, amigos, ddragon, onCerrar, onVerPartidas }) {
  const riotId = amigo?.riot_id ?? "";
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
            <h2 id={ID_TITULO} className="min-w-0 font-titulo text-lg leading-tight font-bold break-words">
              Con quién gana más <span className="text-texto-suave">·</span> {riotId}
            </h2>
          </div>
          <p className="mt-1 text-xs text-texto-suave">Partidas en el mismo equipo · Normal y Ranked · todo lo registrado</p>
        </>
      }
    >
      <TablaSinergia
        filas={filas}
        amigos={amigos}
        ddragon={ddragon}
        etiqueta={`Compañeros de ${riotId} en el grupo`}
      />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onVerPartidas}
          className="rounded-md border border-sapo/60 bg-sapo-fondo px-3 py-2 text-sm font-semibold text-sapo hover:bg-sapo/20"
        >
          Ver sus últimas partidas
        </button>
      </div>
    </Dialogo>
  );
}
