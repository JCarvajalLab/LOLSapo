import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { datosItem, datosRuna, nombreItem, urlItem } from "../logica/ddragon.js";
import { formatearDescripcionLol } from "../logica/descripcionLol.js";
import { ImagenDD } from "./ImagenDD.jsx";

/**
 * Envoltorio para cualquier elemento que deba mostrar un tooltip al pasar el cursor (hover).
 * No altera los clics pero permite que el tooltip aparezca flotando con posición calculada.
 */
export function ElementoConTooltip({ tooltip, children, className = "" }) {
  const [activo, setActivo] = useState(false);
  const [rect, setRect] = useState(null);
  const ref = useRef(null);

  const alEntrar = () => {
    if (!tooltip || !ref.current) return;
    setRect(ref.current.getBoundingClientRect());
    setActivo(true);
  };

  const alSalir = () => {
    setActivo(false);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
      onFocus={alEntrar}
      onBlur={alSalir}
      className={`relative inline-flex ${className}`}
    >
      {children}
      {activo && rect && tooltip && <PortalTooltip rect={rect}>{tooltip}</PortalTooltip>}
    </div>
  );
}

/** Portal flotante que se posiciona de forma fija respecto a la pantalla. */
function PortalTooltip({ rect, children }) {
  const refFlotante = useRef(null);
  const [estilo, setEstilo] = useState({ opacity: 0 });

  useEffect(() => {
    if (!refFlotante.current) return;
    const elem = refFlotante.current;
    const anchoTooltip = elem.offsetWidth || 280;
    const altoTooltip = elem.offsetHeight || 150;

    const espacioArriba = rect.top;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const mostrarArriba = espacioArriba > altoTooltip + 12 || espacioArriba > espacioAbajo;

    let top = mostrarArriba ? rect.top - altoTooltip - 8 : rect.bottom + 8;
    if (top < 10) top = 10;
    if (top + altoTooltip > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - altoTooltip - 10);
    }

    // Centrado horizontal con límites de pantalla
    let left = rect.left + rect.width / 2 - anchoTooltip / 2;
    if (left < 12) left = 12;
    if (left + anchoTooltip > window.innerWidth - 12) {
      left = window.innerWidth - anchoTooltip - 12;
    }

    setEstilo({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
      zIndex: 9999,
      pointerEvents: "none",
    });
  }, [rect]);

  return createPortal(
    <div
      ref={refFlotante}
      style={estilo}
      className="losa w-72 max-w-[90vw] rounded-lg border border-borde/90 bg-fondo/95 p-3 text-xs text-texto shadow-2xl backdrop-blur-md transition-opacity duration-150"
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Contenido formateado del tooltip de un ítem al estilo oficial de League / OP.GG.
 */
export function ContenidoTooltipItem({ itemId, ddragon }) {
  const datos = datosItem(ddragon, itemId);
  const nombre = datos?.nombre ?? nombreItem(ddragon, itemId);
  const oro = datos?.oro;
  const descripcion = datos?.descripcion;
  const receta = datos?.receta ?? [];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 border-b border-borde/60 pb-2">
        <ImagenDD
          src={urlItem(ddragon, itemId)}
          alt=""
          tamaño={28}
          className="rounded border border-borde/80 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-texto truncate">{nombre}</p>
          {oro && oro > 0 ? (
            <p className="text-[11px] font-medium text-dorado">
              <span aria-hidden="true">🪙 </span>
              {oro.toLocaleString("es-CL")} de oro
            </p>
          ) : null}
        </div>
      </div>

      {descripcion ? (
        <div className="text-texto-suave text-xs leading-relaxed max-h-56 overflow-y-auto pr-1">
          {formatearDescripcionLol(descripcion)}
        </div>
      ) : (
        <p className="text-[11px] text-texto-suave italic">Sin descripción disponible.</p>
      )}

      {receta.length > 0 && (
        <div className="border-t border-borde/60 pt-2">
          <p className="text-[10px] font-semibold text-texto-suave uppercase tracking-wider mb-1.5">
            Combinación:
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {receta.map((comp, idx) => (
              <span key={`${comp}-${idx}`} className="inline-flex items-center gap-1">
                {idx > 0 && <span className="text-[10px] text-texto-suave">+</span>}
                <ImagenDD
                  src={urlItem(ddragon, comp)}
                  alt={nombreItem(ddragon, comp)}
                  tamaño={20}
                  className="rounded border border-borde"
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Contenido formateado del tooltip de una runa.
 */
export function ContenidoTooltipRuna({ runaId, ddragon }) {
  const datos = datosRuna(ddragon, runaId);
  if (!datos) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-borde/60 pb-1.5">
        {datos.icono && (
          <img src={datos.icono} alt="" width={24} height={24} className="shrink-0" />
        )}
        <p className="font-semibold text-dorado">{datos.nombre}</p>
      </div>
      {datos.descripcion ? (
        <div className="text-texto-suave text-xs leading-relaxed max-h-48 overflow-y-auto pr-1">
          {formatearDescripcionLol(datos.descripcion)}
        </div>
      ) : null}
    </div>
  );
}
