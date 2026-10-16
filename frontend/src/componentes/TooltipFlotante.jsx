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
      className="losa w-max max-w-[92vw] rounded-lg border border-borde/90 bg-fondo/95 p-3 text-xs text-texto shadow-2xl backdrop-blur-md transition-opacity duration-150"
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
    <div className="w-72 max-w-[85vw] space-y-2.5">
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
 * Contenido formateado del tooltip de una runa simple.
 */
export function ContenidoTooltipRuna({ runaId, ddragon }) {
  const datos = datosRuna(ddragon, runaId);
  if (!datos) return null;

  return (
    <div className="w-72 max-w-[85vw] space-y-2">
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

export const FRAGMENTOS_ESTADISTICAS = {
  5001: { texto: "+10-180 de vida (según el nivel)", icono: "💚" },
  5002: { texto: "+6 de armadura", icono: "🛡️" },
  5003: { texto: "+8 de resistencia mágica", icono: "🔮" },
  5005: { texto: "+10% de velocidad de ataque", icono: "⚡" },
  5007: { texto: "+8 de velocidad de habilidades", icono: "⌛" },
  5008: { texto: "+9 de fuerza adaptable", icono: "◆" },
  5010: { texto: "+2% de velocidad de movimiento", icono: "👟" },
  5011: { texto: "+65 de vida", icono: "💚" },
  5013: { texto: "+10% de tenacidad", icono: "🛡️" },
};

/**
 * Tooltip con el árbol completo de runas armadas en 2 columnas:
 * Columna 1: Rama principal (4 runas)
 * Columna 2: Rama secundaria (2 runas) + 3 fragmentos de estadísticas
 */
export function ContenidoTooltipArbolRunas({ runas, ddragon }) {
  if (!runas || typeof runas !== "object") return null;

  const primarias = Array.isArray(runas.primarias) && runas.primarias.length > 0
    ? runas.primarias
    : runas.principal
      ? [runas.principal]
      : [];

  const secundarias = Array.isArray(runas.secundarias)
    ? runas.secundarias
    : runas.secundaria
      ? [runas.secundaria]
      : [];

  const fragmentos = Array.isArray(runas.fragmentos) ? runas.fragmentos : [];

  if (primarias.length === 0 && secundarias.length === 0) {
    return <p className="text-xs text-texto-suave">Sin información de runas.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-[540px] text-xs">
      {/* Columna Izquierda: Rama Principal */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-dorado uppercase tracking-wider border-b border-borde/60 pb-1">
          Rama Principal
        </p>
        <div className="space-y-3">
          {primarias.map((runaId, idx) => {
            const datos = datosRuna(ddragon, runaId);
            return (
              <div key={`${runaId}-${idx}`} className="flex items-start gap-2.5">
                {datos?.icono ? (
                  <img
                    src={datos.icono}
                    alt=""
                    width={28}
                    height={28}
                    className="shrink-0 mt-0.5 rounded-full"
                  />
                ) : (
                  <span className="size-7 shrink-0 rounded-full bg-superficie-alta" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-texto leading-tight">
                    {datos?.nombre ?? `Runa ${runaId}`}
                  </p>
                  {datos?.descripcion && (
                    <div className="text-texto-suave text-[11px] leading-snug mt-0.5">
                      {formatearDescripcionLol(datos.descripcion)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Rama Secundaria + Fragmentos */}
      <div className="space-y-3 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold text-dorado uppercase tracking-wider border-b border-borde/60 pb-1 mb-3">
            Rama Secundaria
          </p>
          <div className="space-y-3">
            {secundarias.map((runaId, idx) => {
              const datos = datosRuna(ddragon, runaId);
              return (
                <div key={`${runaId}-${idx}`} className="flex items-start gap-2.5">
                  {datos?.icono ? (
                    <img
                      src={datos.icono}
                      alt=""
                      width={28}
                      height={28}
                      className="shrink-0 mt-0.5 rounded-full"
                    />
                  ) : (
                    <span className="size-7 shrink-0 rounded-full bg-superficie-alta" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-texto leading-tight">
                      {datos?.nombre ?? `Runa ${runaId}`}
                    </p>
                    {datos?.descripcion && (
                      <div className="text-texto-suave text-[11px] leading-snug mt-0.5">
                        {formatearDescripcionLol(datos.descripcion)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fragmentos de estadísticas (Shards) */}
        {fragmentos.length > 0 && (
          <div className="rounded-lg border border-borde/70 bg-superficie/80 p-2.5 space-y-1.5 mt-2">
            <p className="text-[10px] font-semibold text-texto-suave uppercase tracking-wider mb-1">
              Fragmentos de estadísticas
            </p>
            {fragmentos.map((shardId, idx) => {
              const info = FRAGMENTOS_ESTADISTICAS[shardId];
              return (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-texto">
                  <span aria-hidden="true" className="text-xs shrink-0">
                    {info?.icono ?? "◆"}
                  </span>
                  <span>{info?.texto ?? `+ Fragmento ${shardId}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
