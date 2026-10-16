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

/** Presets de runas por si una partida antigua solo tiene id de keystone */
const PRESETS_RUNAS = {
  8010: { // Conquistador
    primarias: [8010, 9111, 9104, 8299], // Conquistador, Triunfo, Leyenda: Presteza, Último esfuerzo
    secundarias: [8345, 8304], // Perspicacia cósmica, Calzado mágico
    fragmentos: [5005, 5008, 5001],
  },
  8112: { // Electrocutar
    primarias: [8112, 8143, 8138, 8105],
    secundarias: [8275, 8234],
    fragmentos: [5008, 5008, 5002],
  },
  8229: { // Cometa Arcano
    primarias: [8229, 8224, 8210, 8237],
    secundarias: [8304, 8345],
    fragmentos: [5008, 5008, 5003],
  },
  8437: { // Garras del Inmortal
    primarias: [8437, 8401, 8429, 8451],
    secundarias: [9111, 8014],
    fragmentos: [5007, 5008, 5001],
  },
  8008: { // Cadencia Letal
    primarias: [8008, 9104, 9105, 8299],
    secundarias: [8304, 8345],
    fragmentos: [5005, 5008, 5001],
  },
  8214: { // Aery
    primarias: [8214, 8226, 8210, 8237],
    secundarias: [8444, 8453],
    fragmentos: [5008, 5008, 5001],
  },
};

/**
 * Contenido formateado del tooltip de un ítem al estilo oficial de League / OP.GG (Imagen 2).
 */
export function ContenidoTooltipItem({ itemId, ddragon }) {
  const datos = datosItem(ddragon, itemId);
  const nombre = datos?.nombre ?? nombreItem(ddragon, itemId);
  const oro = datos?.oro;
  const descripcion = datos?.descripcion;
  const receta = datos?.receta ?? [];

  return (
    <div className="w-[320px] max-w-[88vw] space-y-3">
      {/* Cabecera: Ícono + Nombre del objeto */}
      <div className="flex items-center gap-2.5">
        <ImagenDD
          src={urlItem(ddragon, itemId)}
          alt=""
          sinTitulo
          tamaño={32}
          className="rounded border border-borde/80 shrink-0"
        />
        <p className="font-bold text-texto text-sm truncate">{nombre}</p>
      </div>

      {/* Estadísticas y pasivas (sin scrollbar, fluido y legible) */}
      {descripcion ? (
        <div className="text-texto-suave text-xs leading-relaxed">
          {formatearDescripcionLol(descripcion)}
        </div>
      ) : (
        <p className="text-[11px] text-texto-suave italic">Sin descripción disponible.</p>
      )}

      {/* Pie: Combinación a la izquierda y Oro a la derecha (estilo Imagen 2) */}
      {(receta.length > 0 || (oro && oro > 0)) && (
        <div className="border-t border-borde/60 pt-2.5 flex items-end justify-between gap-2">
          {receta.length > 0 ? (
            <div>
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
                      sinTitulo
                      tamaño={22}
                      className="rounded border border-borde"
                    />
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div />
          )}

          {oro && oro > 0 && (
            <p className="text-xs font-semibold text-texto-suave shrink-0 pb-0.5">
              {oro.toLocaleString("es-CL")} de oro
            </p>
          )}
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
  5008: { texto: "+9 de fuerza adaptable", icono: "✦" },
  5010: { texto: "+2% de velocidad de movimiento", icono: "👟" },
  5011: { texto: "+65 de vida", icono: "💚" },
  5013: { texto: "+10% de tenacidad", icono: "🛡️" },
};

/**
 * Tooltip con el árbol completo de runas armadas en 2 columnas (Imagen 3):
 * Columna 1: 4 runas de la rama principal (Clave + 3 menores)
 * Columna 2: 2 runas de la rama secundaria + Cajita con los 3 fragmentos de estadísticas
 */
export function ContenidoTooltipArbolRunas({ runas, ddragon }) {
  if (!runas || typeof runas !== "object") return null;

  const keystone = runas.principal || (Array.isArray(runas.primarias) ? runas.primarias[0] : null);
  const preset = keystone ? PRESETS_RUNAS[keystone] : null;

  const primarias =
    Array.isArray(runas.primarias) && runas.primarias.length > 1
      ? runas.primarias
      : preset?.primarias || (runas.principal ? [runas.principal] : []);

  const secundarias =
    Array.isArray(runas.secundarias) && runas.secundarias.length > 0
      ? runas.secundarias
      : preset?.secundarias || (runas.secundaria ? [runas.secundaria] : []);

  const fragmentos =
    Array.isArray(runas.fragmentos) && runas.fragmentos.length > 0
      ? runas.fragmentos
      : preset?.fragmentos || [5005, 5008, 5001];

  if (primarias.length === 0 && secundarias.length === 0) {
    return <p className="text-xs text-texto-suave">Sin información de runas.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full md:w-[560px] text-xs">
      {/* Columna Izquierda: 4 Runas de la Rama Principal */}
      <div className="space-y-3.5">
        {primarias.map((runaId, idx) => {
          const datos = datosRuna(ddragon, runaId);
          return (
            <div key={`${runaId}-${idx}`} className="flex items-start gap-2.5">
              {datos?.icono ? (
                <img
                  src={datos.icono}
                  alt=""
                  width={30}
                  height={30}
                  className="shrink-0 mt-0.5 rounded-full"
                />
              ) : (
                <span className="size-[30px] shrink-0 rounded-full bg-superficie-alta" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-texto leading-tight text-xs">
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

      {/* Columna Derecha: 2 Runas Secundarias + Fragmentos de Estadísticas */}
      <div className="space-y-3.5 flex flex-col justify-between">
        <div className="space-y-3.5">
          {secundarias.map((runaId, idx) => {
            const datos = datosRuna(ddragon, runaId);
            return (
              <div key={`${runaId}-${idx}`} className="flex items-start gap-2.5">
                {datos?.icono ? (
                  <img
                    src={datos.icono}
                    alt=""
                    width={30}
                    height={30}
                    className="shrink-0 mt-0.5 rounded-full"
                  />
                ) : (
                  <span className="size-[30px] shrink-0 rounded-full bg-superficie-alta" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-texto leading-tight text-xs">
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

        {/* Fragmentos de estadísticas (Cajita estilo Imagen 3) */}
        {fragmentos.length > 0 && (
          <div className="rounded-lg border border-borde/80 bg-superficie-alta/60 p-3 space-y-2 mt-2">
            {fragmentos.map((shardId, idx) => {
              const info = FRAGMENTOS_ESTADISTICAS[shardId];
              return (
                <div key={idx} className="flex items-center gap-2 text-xs text-texto">
                  <span aria-hidden="true" className="text-xs shrink-0 text-dorado">
                    {info?.icono ?? "◆"}
                  </span>
                  <span className="font-medium">
                    {info?.texto ?? `+ Fragmento ${shardId}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
