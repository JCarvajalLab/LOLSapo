import { useEffect, useMemo, useState } from "react";
import {
  OPCIONES_PERIODOS,
  fechaRecord,
  obtenerBloqueRecords,
  recordsDestacadosTarjeta,
  valorRecord,
} from "../logica/records.js";
import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";
import { ImagenDD } from "./ImagenDD.jsx";

/**
 * Tarjeta de Récords y Marcas para la sección de Estadísticas Generales.
 * Muestra las mejores marcas individuales (KDA, Kills, Daño, CS, Duración)
 * con filtro temporal (30 días por defecto, 90 días, 2026) y pestañas por amigo.
 * Rota automáticamente de amigo cada 5 minutos (igual que Estadísticas Básicas).
 */
export function TarjetaRecords({ records, amigos = [], ddragon, onVerRecords }) {
  const [periodo, setPeriodo] = useState("dias_30");

  const listaAmigos = useMemo(() => {
    if (!Array.isArray(amigos)) return [];
    return amigos
      .filter((a) => a && a.slug && a.estado !== "error")
      .map((a) => ({
        slug: a.slug,
        nombre: a.nombre || a.riot_id?.split("#")[0] || a.slug,
      }));
  }, [amigos]);

  // Rota automáticamente según una ranura temporal de 5 min (o al recargar), igual que Estadísticas Básicas
  const [amigoSlug, setAmigoSlug] = useState(() => {
    if (!listaAmigos.length) return "";
    const slot = Math.floor(Date.now() / (5 * 60 * 1000));
    return listaAmigos[slot % listaAmigos.length]?.slug || listaAmigos[0]?.slug;
  });

  // Si el usuario hace clic manual, se respeta su selección; si no, rota cada 5 min
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || !listaAmigos.length) return;
    const interval = setInterval(() => {
      const slot = Math.floor(Date.now() / (5 * 60 * 1000));
      const siguienteSlug = listaAmigos[slot % listaAmigos.length]?.slug;
      if (siguienteSlug) {
        setAmigoSlug(siguienteSlug);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [manual, listaAmigos]);

  // Si amigoSlug no coincide con ninguno, seleccionar el primero
  const slugActivo =
    listaAmigos.find((a) => a.slug === amigoSlug)?.slug || listaAmigos[0]?.slug || "";

  const bloque = useMemo(() => {
    return obtenerBloqueRecords(records, slugActivo, periodo);
  }, [records, slugActivo, periodo]);

  const destacados = useMemo(() => {
    return recordsDestacadosTarjeta(bloque);
  }, [bloque]);

  const abrirModal = (tab = "records") => {
    onVerRecords?.({ amigo: slugActivo, periodo, tab });
  };

  return (
    <article
      aria-labelledby="titulo-tarjeta-records"
      data-destacado="records"
      className="relative flex h-full flex-col justify-between rounded-lg border border-borde/80 bg-fondo/40 p-3 sm:p-3.5 losa"
    >
      <div>
        {/* Cabecera con título e ícono */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sapo-fondo text-sapo border border-sapo/30">
              <svg
                className="h-3.5 w-3.5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.8-.3 3.32-1.57 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </span>
            <h3
              id="titulo-tarjeta-records"
              className="text-sm font-titulo font-bold tracking-wide uppercase text-texto truncate"
            >
              Récords y Marcas
            </h3>
          </div>

          {/* Selector de período: 30 días (1°), 90 días (2°), 2026 (3°) */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            aria-label="Filtrar récords por período"
            className="rounded border border-borde/70 bg-fondo px-2 py-0.5 text-[11px] font-medium text-texto focus:border-sapo focus:outline-none transition-colors cursor-pointer"
          >
            {OPCIONES_PERIODOS.map((op) => (
              <option key={op.clave} value={op.clave}>
                {op.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {/* Pestañas exclusivas de los amigos (sin pestaña Global) */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2.5 scrollbar-none"
          role="tablist"
          aria-label="Seleccionar amigo para récords"
        >
          {listaAmigos.map((a) => {
            const activo = a.slug === slugActivo;
            return (
              <button
                key={a.slug}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => {
                  setManual(true);
                  setAmigoSlug(a.slug);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                  activo
                    ? "bg-sapo-fondo text-sapo font-bold border border-sapo/40 shadow-sm"
                    : "text-texto-suave hover:text-texto bg-superficie/40 border border-borde/30"
                }`}
              >
                {a.nombre}
              </button>
            );
          })}
        </div>

        {/* Lista de récords destacados */}
        {destacados.length === 0 ? (
          <div className="py-10 text-center text-xs text-texto-suave">
            No hay récords registrados para este período.
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-borde/20">
            {destacados.map((rec) => {
              const nombreCamp = nombreCampeon(ddragon, rec.campeon_id, rec.campeon);
              const valorMostrado = rec.valor_formateado || valorRecord(rec);
              const fechaTexto = rec.fecha_formateada || fechaRecord(rec.fecha);

              return (
                <div
                  key={rec.metrica_clave}
                  onClick={() => abrirModal("records")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      abrirModal("records");
                    }
                  }}
                  className="flex items-center justify-between py-1.5 px-1 rounded cursor-pointer group hover:bg-superficie-alta/60 transition-colors"
                  title={`Ver detalle de ${rec.metrica_titulo}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ImagenDD
                      src={urlCampeon(ddragon, rec.campeon_id, rec.campeon)}
                      alt={nombreCamp}
                      respaldo={nombreCamp}
                      tamaño={28}
                      redonda
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-semibold text-texto group-hover:text-sapo transition-colors truncate">
                        {rec.metrica_titulo}
                      </p>
                      <p className="text-[10px] text-texto-suave truncate">
                        {nombreCamp}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="cifras font-bold text-xs sm:text-sm text-sapo">
                      {valorMostrado}
                    </span>
                    {fechaTexto && (
                      <p className="text-[9.5px] text-texto-suave/80 font-normal">
                        {fechaTexto}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botones al pie: Ver Récords y Comparador */}
      <div className="mt-2.5 pt-2 border-t border-borde/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => abrirModal("comparar")}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-texto-suave hover:text-sapo hover:bg-sapo-fondo/50 px-2 py-1 rounded transition-colors"
        >
          <span className="text-[10px] uppercase font-bold text-sapo border border-sapo/40 rounded px-1">VS</span>
          Comparador
        </button>

        <button
          type="button"
          onClick={() => abrirModal("records")}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-texto hover:text-sapo transition-colors group"
        >
          <span>Ver todos los récords</span>
          <span className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
