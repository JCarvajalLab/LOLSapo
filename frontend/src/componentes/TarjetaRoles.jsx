import { useMemo, useState } from "react";
import { LINEAS, obtenerBloqueCampeones, resumenLineas } from "../logica/campeones.js";
import { IconoPosicion } from "./IconoPosicion.jsx";

const CONFIG_ROLES = {
  TOP: { nombre: "Superior", color: "#38bdf8" },
  MIDDLE: { nombre: "Central", color: "#fbbf24" },
  JUNGLE: { nombre: "Jungla", color: "#22c55e" },
  BOTTOM: { nombre: "Inferior", color: "#f43f5e" },
  UTILITY: { nombre: "Soporte", color: "#a855f7" },
};

/**
 * Tarjeta de Roles y Estadísticas Básicas de Invocador.
 * Muestra el KDA promedio, partidas jugadas, tasa de victorias y el gráfico donut
 * de distribución de roles con su tabla detallada (estilo OP.GG).
 * Rota automáticamente entre los integrantes del grupo y permite elegir manualmente a cualquiera.
 */
export function TarjetaRoles({ campeones, amigos }) {
  const listaAmigos = useMemo(() => {
    if (!Array.isArray(amigos)) return [];
    return amigos.filter((a) => a && a.slug && a.estado !== "error");
  }, [amigos]);

  // Rota automáticamente según una ranura temporal de 5 min (o al recargar)
  const [slugActivo, setSlugActivo] = useState(() => {
    if (!listaAmigos.length) return "";
    const slot = Math.floor(Date.now() / (5 * 60 * 1000));
    return listaAmigos[slot % listaAmigos.length]?.slug || listaAmigos[0]?.slug;
  });

  const [periodo, setPeriodo] = useState("todo");

  const amigoActual = listaAmigos.find((a) => a.slug === slugActivo) || listaAmigos[0];

  const bloque = obtenerBloqueCampeones(campeones, amigoActual?.slug, periodo);
  const lineas = resumenLineas(bloque);

  // Partidas y métricas generales
  const totalPartidas =
    bloque?.total_partidas ?? lineas.reduce((acc, l) => acc + (l.partidas || 0), 0);
  const totalVictorias = lineas.reduce((acc, l) => acc + (l.victorias || 0), 0);
  const winrateTotal =
    totalPartidas > 0 ? ((totalVictorias / totalPartidas) * 100).toFixed(1) : null;

  // KDA promedio global ponderado por campeón
  let totalK = 0;
  let totalD = 0;
  let totalA = 0;
  if (Array.isArray(bloque?.campeones) && totalPartidas > 0) {
    for (const c of bloque.campeones) {
      const n = c.partidas || 1;
      totalK += (c.promedio_kda?.asesinatos ?? 0) * n;
      totalD += (c.promedio_kda?.muertes ?? 0) * n;
      totalA += (c.promedio_kda?.asistencias ?? 0) * n;
    }
  }
  const promK = totalPartidas > 0 ? (totalK / totalPartidas).toFixed(1) : "0.0";
  const promD = totalPartidas > 0 ? (totalD / totalPartidas).toFixed(1) : "0.0";
  const promA = totalPartidas > 0 ? (totalA / totalPartidas).toFixed(1) : "0.0";

  // Ordenar roles por partidas descendente (rol más jugado arriba)
  const lineasOrdenadas = [...lineas].sort((a, b) => (b.partidas || 0) - (a.partidas || 0));
  const rolPrincipal = lineasOrdenadas[0]?.partidas > 0 ? lineasOrdenadas[0] : null;
  const nombreRolPrincipal = rolPrincipal
    ? CONFIG_ROLES[rolPrincipal.posicion]?.nombre || rolPrincipal.posicion
    : "—";

  // Geometría del gráfico Donut SVG
  const radio = 46;
  const perimetro = 2 * Math.PI * radio; // ~ 289.026
  const partidasConRol = lineasOrdenadas.reduce((acc, l) => acc + (l.partidas || 0), 0);

  let acumPct = 0;
  const segmentosDonut = lineasOrdenadas.map((l) => {
    const cfg = CONFIG_ROLES[l.posicion] || { color: "#94a3b8" };
    const fraccion = partidasConRol > 0 ? (l.partidas || 0) / partidasConRol : 0;
    const longitud = fraccion * perimetro;
    const desfase = -acumPct * perimetro;
    acumPct += fraccion;
    return {
      posicion: l.posicion,
      color: cfg.color,
      longitud,
      desfase,
      activo: (l.partidas || 0) > 0,
    };
  });

  return (
    <article
      aria-labelledby="titulo-tarjeta-roles"
      data-destacado="roles"
      className="relative flex h-full flex-col justify-between rounded-lg border border-borde/80 bg-fondo/40 p-3 sm:p-4 losa"
    >
      <div>
        {/* Cabecera con título e ícono */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sapo-fondo text-sapo border border-sapo/30">
              <svg
                className="h-3.5 w-3.5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" />
              </svg>
            </span>
            <h3
              id="titulo-tarjeta-roles"
              className="text-sm font-titulo font-bold tracking-wide uppercase text-texto truncate"
            >
              Estadísticas básicas
            </h3>
          </div>

          {/* Selector de período tipo dropdown */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            aria-label="Filtrar por período"
            className="rounded border border-borde/70 bg-fondo px-2 py-0.5 text-[11px] font-medium text-texto focus:border-sapo focus:outline-none transition-colors cursor-pointer"
          >
            <option value="todo">Total</option>
            <option value="dias_30">30 días</option>
            <option value="dias_90">90 días</option>
          </select>
        </div>

        {/* Selector de los 5 amigos (rotativo con clic manual) */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none"
          role="tablist"
          aria-label="Seleccionar amigo"
        >
          {listaAmigos.map((a) => {
            const activo = a.slug === amigoActual?.slug;
            const nombre = a.nombre || a.riot_id?.split("#")[0] || a.slug;
            return (
              <button
                key={a.slug}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setSlugActivo(a.slug)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                  activo
                    ? "bg-sapo-fondo text-sapo font-bold border border-sapo/40 shadow-sm"
                    : "text-texto-suave hover:text-texto bg-superficie/40 border border-borde/30"
                }`}
                title={a.riot_id || a.nombre}
              >
                {nombre}
              </button>
            );
          })}
        </div>

        {/* 3 Losas superiores de métricas (KDA, Jugadas, Winrate) */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-borde/50 bg-superficie/60 text-center">
            <span className="text-[10px] font-semibold tracking-wider text-texto-suave uppercase">
              KDA Promedio
            </span>
            <span className="cifras text-xs sm:text-sm font-bold mt-1">
              <span className="text-victoria">{promK}</span>{" "}
              <span className="text-texto-suave/60 font-normal">/</span>{" "}
              <span className="text-derrota">{promD}</span>{" "}
              <span className="text-texto-suave/60 font-normal">/</span>{" "}
              <span className="text-sapo">{promA}</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-borde/50 bg-superficie/60 text-center">
            <span className="text-[10px] font-semibold tracking-wider text-texto-suave uppercase">
              Jugadas
            </span>
            <span className="cifras text-xs sm:text-sm font-bold text-[#38bdf8] mt-1">
              {totalPartidas}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-borde/50 bg-superficie/60 text-center">
            <span className="text-[10px] font-semibold tracking-wider text-texto-suave uppercase truncate max-w-full">
              Tasa de victorias
            </span>
            <span
              className={`cifras text-xs sm:text-sm font-bold mt-1 ${
                winrateTotal !== null && Number(winrateTotal) >= 50
                  ? "text-victoria"
                  : "text-derrota"
              }`}
            >
              {winrateTotal !== null ? `${winrateTotal}%` : "—"}
            </span>
          </div>
        </div>

        {/* Roles más jugados: Donut + Tabla */}
        <div>
          <h4 className="text-[11px] font-semibold tracking-wider text-texto-suave uppercase mb-2">
            Roles más jugados
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Gráfico Donut SVG */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 130 130" className="size-24 sm:size-28">
                {/* Círculo base de fondo */}
                <circle
                  cx="65"
                  cy="65"
                  r={radio}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="12"
                  opacity="0.35"
                />

                {/* Segmentos coloreados por rol */}
                {segmentosDonut.map((s, idx) =>
                  s.activo ? (
                    <circle
                      key={idx}
                      cx="65"
                      cy="65"
                      r={radio}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="12"
                      strokeDasharray={`${s.longitud} ${perimetro}`}
                      strokeDashoffset={s.desfase}
                      transform="rotate(-90 65 65)"
                      className="transition-all duration-300"
                    />
                  ) : null,
                )}

                {/* Texto central de línea principal */}
                <text
                  x="65"
                  y="58"
                  textAnchor="middle"
                  className="fill-texto-suave text-[8px] sm:text-[9px] font-bold tracking-wider uppercase"
                >
                  PRINCIPAL
                </text>
                <text
                  x="65"
                  y="74"
                  textAnchor="middle"
                  className="fill-texto text-[11px] sm:text-xs font-bold"
                >
                  {nombreRolPrincipal}
                </text>
              </svg>
            </div>

            {/* Tabla con el desglose de los 5 roles */}
            <div className="flex-1 w-full min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borde/40 text-[10px] font-semibold tracking-wider text-texto-suave uppercase">
                    <th scope="col" className="pb-1 pl-0 font-medium">
                      Línea
                    </th>
                    <th scope="col" className="pb-1 px-1 text-right font-medium">
                      Partidas
                    </th>
                    <th scope="col" className="pb-1 px-1 text-right font-medium">
                      (%)
                    </th>
                    <th scope="col" className="pb-1 pr-0 text-right font-medium">
                      Winrate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde/20">
                  {lineasOrdenadas.map((l) => {
                    const cfg =
                      CONFIG_ROLES[l.posicion] || { nombre: l.posicion, color: "#94a3b8" };
                    const winrate = l.winrate;
                    const colorWinrate =
                      winrate === null
                        ? "text-texto-suave"
                        : winrate >= 50
                          ? "text-victoria"
                          : "text-derrota";

                    return (
                      <tr
                        key={l.posicion}
                        className="hover:bg-superficie-alta/30 transition-colors"
                      >
                        <td className="py-1 pl-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.color }}
                              aria-hidden="true"
                            />
                            <IconoPosicion posicion={l.posicion} className="size-3.5 shrink-0" />
                            <span className="truncate text-texto font-medium text-[11px] sm:text-xs">
                              {cfg.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 px-1 text-right cifras font-semibold text-texto text-[11px] sm:text-xs">
                          {l.partidas}
                        </td>
                        <td className="py-1 px-1 text-right cifras text-texto-suave text-[11px] sm:text-xs">
                          {l.porcentaje}%
                        </td>
                        <td
                          className={`py-1 pr-0 text-right cifras font-semibold text-[11px] sm:text-xs ${colorWinrate}`}
                        >
                          {winrate !== null ? `${winrate}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
