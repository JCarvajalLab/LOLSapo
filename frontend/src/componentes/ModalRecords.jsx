import { useMemo, useState } from "react";
import {
  CATEGORIAS_INFO,
  DEFINICION_METRICAS,
  OPCIONES_PERIODOS,
  compararRecords,
  esVictoriaRecord,
  fechaRecord,
  obtenerBloqueRecords,
  valorRecord,
} from "../logica/records.js";
import {
  nombreCampeon,
  urlCampeon,
  urlLoadingCampeon,
  urlSplashCampeon,
} from "../logica/ddragon.js";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

const ID_TITULO = "titulo-modal-records";

/**
 * Modal completo de Récords y Comparador Cara a Cara.
 * Contiene dos pestañas principales:
 * 1. "Récords": Explorador por categorías (Básicos, Impacto, Multikills, Duración) para cada amigo.
 * 2. "Comparar (Versus)": Comparativa directa entre dos invocadores con marcador y ganador por métrica.
 */
export function ModalRecords({
  records,
  amigos = [],
  ddragon,
  onCerrar,
  amigoInicial = "",
  periodoInicial = "dias_30",
  tabInicial = "records",
}) {
  const [tabPrincipal, setTabPrincipal] = useState(tabInicial);
  const [periodo, setPeriodo] = useState(periodoInicial);

  const listaAmigos = useMemo(() => {
    if (!Array.isArray(amigos)) return [];
    return amigos
      .filter((a) => a && a.slug && a.estado !== "error")
      .map((a) => ({
        slug: a.slug,
        nombre: a.nombre || a.riot_id?.split("#")[0] || a.slug,
      }));
  }, [amigos]);

  const [amigoSlug, setAmigoSlug] = useState(() => {
    if (amigoInicial && amigoInicial !== "global" && listaAmigos.some((a) => a.slug === amigoInicial)) {
      return amigoInicial;
    }
    return listaAmigos[0]?.slug || "";
  });

  const slugActivo =
    listaAmigos.find((a) => a.slug === amigoSlug)?.slug || listaAmigos[0]?.slug || "";

  // Jugadores del comparador
  const [slugA, setSlugA] = useState(() => listaAmigos[0]?.slug || "");
  const [slugB, setSlugB] = useState(() => listaAmigos[1]?.slug || listaAmigos[0]?.slug || "");

  const amigoA = listaAmigos.find((a) => a.slug === slugA) || listaAmigos[0];
  const amigoB = listaAmigos.find((a) => a.slug === slugB) || listaAmigos[1] || amigoA;

  // Bloque para la pestaña de Récords
  const bloqueRecords = useMemo(() => {
    return obtenerBloqueRecords(records, slugActivo, periodo);
  }, [records, slugActivo, periodo]);

  // Bloques para el Comparador
  const bloqueA = useMemo(() => {
    return obtenerBloqueRecords(records, slugA, periodo);
  }, [records, slugA, periodo]);

  const bloqueB = useMemo(() => {
    return obtenerBloqueRecords(records, slugB, periodo);
  }, [records, slugB, periodo]);

  const comparacion = useMemo(() => {
    return compararRecords(bloqueA, bloqueB, amigoA?.nombre || "Jugador A", amigoB?.nombre || "Jugador B");
  }, [bloqueA, bloqueB, amigoA, amigoB]);

  const totalDuelos = comparacion.marcador.victoriasA + comparacion.marcador.victoriasB;
  const pctMarcadorA =
    totalDuelos > 0
      ? Math.round((comparacion.marcador.victoriasA / totalDuelos) * 100)
      : 50;
  const pctMarcadorB = totalDuelos > 0 ? 100 - pctMarcadorA : 50;

  const campBannerA = bloqueA?.basicos?.asesinatos || bloqueA?.basicos?.kda || null;
  const campBannerB = bloqueB?.basicos?.asesinatos || bloqueB?.basicos?.kda || null;
  const fondoBannerA = campBannerA
    ? urlSplashCampeon(ddragon, campBannerA.campeon_id, campBannerA.campeon)
    : null;
  const fondoBannerB = campBannerB
    ? urlSplashCampeon(ddragon, campBannerB.campeon_id, campBannerB.campeon)
    : null;

  return (
    <Dialogo
      idTitulo={ID_TITULO}
      onCerrar={onCerrar}
      anchoMax="max-w-5xl"
      titulo={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sapo-fondo text-sapo border border-sapo/40 font-bold text-sm">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.8-.3 3.32-1.57 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 id={ID_TITULO} className="titulo-seccion text-lg font-bold leading-tight truncate">
                Récords y Marcas <span className="text-texto-suave font-normal">·</span> LOLSapo
              </h2>
              <p className="text-xs text-texto-suave">
                Todas las partidas registradas (Normal y Ranked)
              </p>
            </div>
          </div>

          {/* Selector de período: 30 días, 90 días, 2026 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-texto-suave">Período:</span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              aria-label="Seleccionar período"
              className="rounded border border-borde/80 bg-fondo px-2.5 py-1 text-xs font-medium text-texto focus:border-sapo focus:outline-none transition-colors cursor-pointer"
            >
              {OPCIONES_PERIODOS.map((op) => (
                <option key={op.clave} value={op.clave}>
                  {op.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navegación entre Pestañas: Récords vs Comparador */}
        <div className="flex border-b border-borde/60 gap-4">
          <button
            type="button"
            onClick={() => setTabPrincipal("records")}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition-colors relative ${
              tabPrincipal === "records"
                ? "text-sapo border-b-2 border-sapo"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            🏆 Récords y Marcas
          </button>
          <button
            type="button"
            onClick={() => setTabPrincipal("comparar")}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
              tabPrincipal === "comparar"
                ? "text-sapo border-b-2 border-sapo"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-sapo border border-sapo/40 rounded px-1">VS</span>
            Comparador Cara a Cara
          </button>
        </div>

        {tabPrincipal === "records" ? (
          <div className="space-y-5">
            {/* Pestañas de Amigos (exclusivamente los integrantes) */}
            <div
              role="tablist"
              aria-label="Seleccionar invocador"
              className="flex flex-wrap gap-1.5 rounded-lg border border-borde/60 bg-fondo/60 p-1"
            >
              {listaAmigos.map((jugador) => {
                const activo = jugador.slug === slugActivo;
                return (
                  <button
                    key={jugador.slug}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setAmigoSlug(jugador.slug)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      activo
                        ? "bg-sapo-fondo text-sapo font-bold border border-sapo/40 shadow-sm"
                        : "text-texto-suave hover:text-texto bg-superficie/30 hover:bg-superficie/60"
                    }`}
                  >
                    {jugador.nombre}
                  </button>
                );
              })}
            </div>

            {/* Categorías de récords */}
            {CATEGORIAS_INFO.map((cat) => {
              const metricasDeCategoria = DEFINICION_METRICAS.filter(
                (m) => m.categoria === cat.clave,
              );

              return (
                <div key={cat.clave} className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <h3 className="text-xs font-titulo font-bold tracking-wider uppercase text-texto flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sapo" />
                      {cat.titulo}
                    </h3>
                    {cat.descripcion && (
                      <span className="text-[11px] text-texto-suave font-normal">
                        ({cat.descripcion})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
                    {metricasDeCategoria.map((metrica) => (
                      <TarjetaRecordModal
                        key={metrica.clave}
                        metrica={metrica}
                        item={bloqueRecords?.[cat.clave]?.[metrica.clave]}
                        ddragon={ddragon}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Pestaña: Comparador Cara a Cara */
          <div className="space-y-6">
            {/* Cabecera Versus Cinemática (Arena Face-Off) */}
            <div className="relative overflow-hidden rounded-2xl border border-borde/70 bg-gradient-to-b from-[#0e1628] to-[#070b14] p-4 sm:p-5 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center relative z-10">
                {/* Tarjeta Jugador A */}
                <div className="relative overflow-hidden rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/70 via-sky-900/30 to-[#0a1120] p-3.5 sm:p-4 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                  {fondoBannerA && (
                    <img
                      src={fondoBannerA}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top opacity-15 pointer-events-none select-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="select-jugador-a"
                        className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block mb-1"
                      >
                        Jugador A
                      </label>
                      <select
                        id="select-jugador-a"
                        value={slugA}
                        onChange={(e) => setSlugA(e.target.value)}
                        className="w-full rounded-lg border border-sky-500/50 bg-[#091322] px-2.5 py-1 text-xs font-bold text-white focus:border-sky-400 focus:outline-none cursor-pointer truncate shadow-inner"
                      >
                        {listaAmigos.map((a) => (
                          <option key={a.slug} value={a.slug} disabled={a.slug === slugB}>
                            {a.nombre}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10.5px] text-texto-suave mt-1 block truncate">
                        {comparacion.marcador.victoriasA > comparacion.marcador.victoriasB
                          ? "👑 Ventaja general"
                          : "Aspirante"}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-sky-300 block tracking-wider">
                        Victorias
                      </span>
                      <span className="cifras text-3xl sm:text-4xl font-black text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">
                        {comparacion.marcador.victoriasA}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emblema Central "VS" + Marcador y Barra Tug-of-War */}
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-texto-suave mb-1">
                    Marcador Global
                  </span>

                  {/* Emblema VS con resplandor */}
                  <div className="relative my-1">
                    <div className="size-10 sm:size-11 rounded-full bg-gradient-to-br from-amber-400/20 via-sky-500/20 to-fuchsia-500/20 border-2 border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                      <span className="text-xs sm:text-sm font-black italic tracking-tighter bg-gradient-to-r from-sky-300 via-amber-200 to-fuchsia-300 bg-clip-text text-transparent">
                        VS
                      </span>
                    </div>
                  </div>

                  {/* Barra Tug of War de Dominio */}
                  {totalDuelos > 0 && (
                    <div className="w-full max-w-[200px] mt-2">
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden flex border border-white/15 p-0.5 gap-0.5">
                        <div
                          style={{ width: `${pctMarcadorA}%` }}
                          className="h-full rounded-l-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                        />
                        <div
                          style={{ width: `${pctMarcadorB}%` }}
                          className="h-full rounded-r-full bg-gradient-to-r from-fuchsia-400 to-fuchsia-500 transition-all duration-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]"
                        />
                      </div>
                      <div className="flex justify-between text-[9.5px] font-mono text-texto-suave mt-1 px-0.5">
                        <span className="text-sky-300 font-bold">{pctMarcadorA}%</span>
                        <span className="text-fuchsia-300 font-bold">{pctMarcadorB}%</span>
                      </div>
                    </div>
                  )}

                  <span className="text-[11px] font-semibold text-white mt-1">
                    {comparacion.marcador.empates > 0 && (
                      <span className="text-amber-300 font-bold">
                        {comparacion.marcador.empates} empates ·{" "}
                      </span>
                    )}
                    {comparacion.marcador.victoriasA > comparacion.marcador.victoriasB
                      ? `Lidera ${amigoA?.nombre}`
                      : comparacion.marcador.victoriasB > comparacion.marcador.victoriasA
                        ? `Lidera ${amigoB?.nombre}`
                        : "Empate técnico"}
                  </span>
                </div>

                {/* Tarjeta Jugador B */}
                <div className="relative overflow-hidden rounded-xl border border-fuchsia-500/40 bg-gradient-to-l from-fuchsia-950/70 via-fuchsia-900/30 to-[#120a1c] p-3.5 sm:p-4 shadow-[0_0_20px_rgba(217,70,239,0.12)]">
                  {fondoBannerB && (
                    <img
                      src={fondoBannerB}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover object-top opacity-15 pointer-events-none select-none"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="text-left shrink-0">
                      <span className="text-[10px] uppercase font-bold text-fuchsia-300 block tracking-wider">
                        Victorias
                      </span>
                      <span className="cifras text-3xl sm:text-4xl font-black text-fuchsia-300 drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]">
                        {comparacion.marcador.victoriasB}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <label
                        htmlFor="select-jugador-b"
                        className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest block mb-1"
                      >
                        Jugador B
                      </label>
                      <select
                        id="select-jugador-b"
                        value={slugB}
                        onChange={(e) => setSlugB(e.target.value)}
                        className="w-full rounded-lg border border-fuchsia-500/50 bg-[#160b24] px-2.5 py-1 text-xs font-bold text-white focus:border-fuchsia-400 focus:outline-none cursor-pointer truncate text-right shadow-inner"
                      >
                        {listaAmigos.map((a) => (
                          <option key={a.slug} value={a.slug} disabled={a.slug === slugA}>
                            {a.nombre}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10.5px] text-texto-suave mt-1 block truncate">
                        {comparacion.marcador.victoriasB > comparacion.marcador.victoriasA
                          ? "👑 Ventaja general"
                          : "Aspirante"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Duelos Agrupados por Categoría */}
            <div className="space-y-6">
              {CATEGORIAS_INFO.map((cat) => {
                const duelosDeCat = comparacion.comparaciones.filter(
                  (c) => c.metrica.categoria === cat.clave
                );
                if (duelosDeCat.length === 0) return null;

                const victoriasCatA = duelosDeCat.filter((c) => c.ganador === "A").length;
                const victoriasCatB = duelosDeCat.filter((c) => c.ganador === "B").length;

                return (
                  <div key={cat.clave} className="space-y-3">
                    {/* Cabecera de Categoría con Marcador Parcial */}
                    <div className="flex items-center justify-between border-b border-borde/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sapo shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
                        <h3 className="text-xs font-titulo font-bold tracking-wider uppercase text-texto">
                          {cat.titulo}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold font-mono">
                        <span className="text-sky-300">{amigoA?.nombre}: {victoriasCatA}</span>
                        <span className="text-texto-suave/60">—</span>
                        <span className="text-fuchsia-300">{amigoB?.nombre}: {victoriasCatB}</span>
                      </div>
                    </div>

                    {/* Lista de Filas de Duelo */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {duelosDeCat.map((comp) => (
                        <FilaComparacionDuelo
                          key={comp.metrica.clave}
                          comp={comp}
                          ddragon={ddragon}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Dialogo>
  );
}

/**
 * Tarjeta individual de récord inspirada en League of Graphs / Blitz.
 * Incluye fondo cinemático de splash/loading art con transición de zoom y brillo en hover,
 * avatar circular con borde neón, valor destacado y detalles de la partida.
 */
function TarjetaRecordModal({ metrica, item, ddragon }) {
  const tieneDato =
    item &&
    item.valor_raw !== undefined &&
    item.valor_raw !== null &&
    item.valor_raw > 0;

  const valorStr = valorRecord(item);
  const fechaStr = fechaRecord(item?.fecha);
  const esVictoria = esVictoriaRecord(item);
  const nombreCamp = nombreCampeon(ddragon, item?.campeon_id, item?.campeon);
  const urlLoading = urlLoadingCampeon(ddragon, item?.campeon_id, item?.campeon);
  const urlSplash = urlSplashCampeon(ddragon, item?.campeon_id, item?.campeon);
  const fondoArte = urlLoading || urlSplash;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-300 min-h-[195px] p-3 sm:p-3.5 ${
        tieneDato
          ? "border-sky-950/70 bg-[#0b1220]/90 hover:border-sky-500/80 hover:shadow-[0_0_24px_rgba(56,189,248,0.28)] hover:-translate-y-0.5"
          : "border-borde/40 bg-superficie/20"
      }`}
    >
      {/* Fondo de splash art con transición de opacidad y zoom al pasar el cursor */}
      {tieneDato && fondoArte && (
        <img
          src={fondoArte}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-20 pointer-events-none select-none transition-all duration-500 ease-out group-hover:scale-110 group-hover:opacity-45"
        />
      )}

      {/* Gradiente oscuro para contraste y legibilidad perfecta */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080d19] via-[#080d19]/65 to-[#080d19]/40 pointer-events-none" />

      {/* Contenido en primer plano */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Cabecera: Badge con título de métrica */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="inline-block px-2 py-0.5 rounded border border-sky-500/40 bg-sky-950/70 text-sky-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {metrica.titulo}
          </span>
        </div>

        {tieneDato ? (
          <>
            {/* Avatar circular del campeón con borde neón */}
            <div className="flex justify-center my-1">
              <div className="relative size-12 sm:size-14 rounded-full border-2 border-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.4)] overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-sky-300 group-hover:shadow-[0_0_18px_rgba(56,189,248,0.65)]">
                <ImagenDD
                  src={urlCampeon(ddragon, item.campeon_id, item.campeon)}
                  alt={nombreCamp}
                  respaldo={nombreCamp}
                  tamaño={56}
                  redonda
                />
              </div>
            </div>

            {/* Gran valor numérico brillante */}
            <div className="text-center my-auto py-1">
              <span className="cifras text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] block tracking-tight">
                {valorStr}
              </span>
            </div>

            {/* Footer de la tarjeta: Victoria/Derrota + Fecha relativa + Campeón + Partida ID */}
            <div className="mt-auto pt-2 border-t border-white/10 text-center">
              <p className="text-[11px] leading-tight font-medium">
                <span className={esVictoria ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {esVictoria ? "Victoria" : "Derrota"}
                </span>{" "}
                <span className="text-white/80 font-normal">
                  · {fechaStr}
                </span>
              </p>
              <p className="text-[10.5px] text-texto-suave mt-0.5 truncate">
                Con <strong className="text-white font-bold">{nombreCamp}</strong>
              </p>

              <div className="mt-1 flex items-center justify-between text-[9px] text-texto-suave/60 font-mono uppercase tracking-wider w-full">
                <span className="truncate">{item.modo || "Partida"}</span>
                <span className="transition-colors group-hover:text-sky-400 group-hover:font-semibold">
                  {item.partida_id || ""}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-texto-suave/60">
            <span className="text-xl mb-1 opacity-40">—</span>
            <span className="text-[11px] italic">Sin registros aún</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calcula la proporción porcentual entre dos valores para la barra de duelo.
 */
function calcularProporcionDuelo(itemA, itemB, mejor = "mayor") {
  const valA = itemA && typeof itemA.valor_raw === "number" ? itemA.valor_raw : 0;
  const valB = itemB && typeof itemB.valor_raw === "number" ? itemB.valor_raw : 0;
  if (valA <= 0 && valB <= 0) return { pctA: 50, pctB: 50 };
  if (valA > 0 && valB <= 0) return { pctA: 100, pctB: 0 };
  if (valA <= 0 && valB > 0) return { pctA: 0, pctB: 100 };

  if (mejor === "menor") {
    const invA = 1 / Math.max(1, valA);
    const invB = 1 / Math.max(1, valB);
    const total = invA + invB;
    return {
      pctA: Math.round((invA / total) * 100),
      pctB: Math.round((invB / total) * 100),
    };
  }

  const total = valA + valB;
  return {
    pctA: Math.round((valA / total) * 100),
    pctB: Math.round((valB / total) * 100),
  };
}

/**
 * Fila de duelo para el Comparador Cara a Cara (estilo Battle Arena).
 * Muestra el enfrentamiento directo por cada métrica con barras comparativas,
 * avatares de campeón con efecto de neón y ganador destacado.
 */
function FilaComparacionDuelo({ comp, ddragon }) {
  const { metrica, itemA, itemB, ganador } = comp;
  const esGanadorA = ganador === "A";
  const esGanadorB = ganador === "B";
  const esEmpate = ganador === "empate";

  const valStrA = itemA ? valorRecord(itemA) : "—";
  const valStrB = itemB ? valorRecord(itemB) : "—";

  const campA = itemA ? nombreCampeon(ddragon, itemA.campeon_id, itemA.campeon) : "";
  const campB = itemB ? nombreCampeon(ddragon, itemB.campeon_id, itemB.campeon) : "";

  const { pctA, pctB } = calcularProporcionDuelo(itemA, itemB, metrica.mejor);

  return (
    <div
      className={`group relative flex items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-xl border transition-all duration-200 ${
        esGanadorA
          ? "border-sky-500/35 bg-gradient-to-r from-sky-950/40 via-[#0a0f1d] to-[#0a0f1d] hover:border-sky-500/70"
          : esGanadorB
            ? "border-fuchsia-500/35 bg-gradient-to-l from-fuchsia-950/40 via-[#0a0f1d] to-[#0a0f1d] hover:border-fuchsia-500/70"
            : esEmpate
              ? "border-amber-500/40 bg-gradient-to-r from-amber-950/25 via-[#0d121f] to-amber-950/25 hover:border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.08)]"
              : "border-borde/40 bg-[#0a0f1d]/70 hover:border-borde"
      }`}
    >
      {/* Lado Jugador A */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div
          className={`relative size-9 sm:size-10 rounded-full border shrink-0 overflow-hidden transition-transform group-hover:scale-105 ${
            esGanadorA
              ? "border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
              : esEmpate
                ? "border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                : "border-borde/60 opacity-75"
          }`}
        >
          {itemA ? (
            <ImagenDD
              src={urlCampeon(ddragon, itemA.campeon_id, itemA.campeon)}
              alt={campA}
              respaldo={campA}
              tamaño={40}
              redonda
            />
          ) : (
            <div className="size-full bg-superficie/40 flex items-center justify-center text-xs text-texto-suave">
              —
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`cifras text-sm sm:text-base font-black tracking-tight ${
                esGanadorA
                  ? "text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  : esEmpate
                    ? "text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                    : "text-texto"
              }`}
            >
              {valStrA}
            </span>
            {esGanadorA && (
              <span className="text-[11px] text-sky-400 font-bold" title="Récord superior">
                ★
              </span>
            )}
            {esEmpate && itemA && (
              <span className="text-[10px] text-amber-400 font-bold" title="Empate">
                =
              </span>
            )}
          </div>
          {itemA ? (
            <span className="text-[10.5px] text-texto-suave block truncate">
              {campA} {itemA.resultado ? `· ${itemA.resultado === "victoria" ? "V" : "D"}` : ""}
            </span>
          ) : (
            <span className="text-[10px] text-texto-suave/40 italic block">Sin récord</span>
          )}
        </div>
      </div>

      {/* Centro: Título de Métrica + Mini Barra Dual */}
      <div className="flex flex-col items-center justify-center shrink-0 w-32 sm:w-44 text-center px-1">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-texto-suave truncate max-w-full">
          {metrica.titulo}
        </span>

        {/* Mini barra Tug-of-War */}
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex mt-1 p-0.5 gap-0.5">
          <div
            style={{ width: `${pctA}%` }}
            className={`h-full rounded-l-full transition-all duration-300 ${
              esGanadorA
                ? "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                : esEmpate
                  ? "bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  : "bg-sky-400/40"
            }`}
          />
          <div
            style={{ width: `${pctB}%` }}
            className={`h-full rounded-r-full transition-all duration-300 ${
              esGanadorB
                ? "bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.7)]"
                : esEmpate
                  ? "bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  : "bg-fuchsia-400/40"
            }`}
          />
        </div>

        {esEmpate ? (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-amber-400/70 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)] mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Empate
          </span>
        ) : (
          !itemA && !itemB && (
            <span className="text-[8.5px] uppercase tracking-wider text-texto-suave/50 italic mt-0.5">
              Sin datos
            </span>
          )
        )}
      </div>

      {/* Lado Jugador B */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0 text-right">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-end gap-1.5">
            {esGanadorB && (
              <span className="text-[11px] text-fuchsia-400 font-bold" title="Récord superior">
                ★
              </span>
            )}
            {esEmpate && itemB && (
              <span className="text-[10px] text-amber-400 font-bold" title="Empate">
                =
              </span>
            )}
            <span
              className={`cifras text-sm sm:text-base font-black tracking-tight ${
                esGanadorB
                  ? "text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]"
                  : esEmpate
                    ? "text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                    : "text-texto"
              }`}
            >
              {valStrB}
            </span>
          </div>
          {itemB ? (
            <span className="text-[10.5px] text-texto-suave block truncate">
              {itemB.resultado ? `${itemB.resultado === "victoria" ? "V" : "D"} · ` : ""}{campB}
            </span>
          ) : (
            <span className="text-[10px] text-texto-suave/40 italic block">Sin récord</span>
          )}
        </div>

        <div
          className={`relative size-9 sm:size-10 rounded-full border shrink-0 overflow-hidden transition-transform group-hover:scale-105 ${
            esGanadorB
              ? "border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]"
              : esEmpate
                ? "border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                : "border-borde/60 opacity-75"
          }`}
        >
          {itemB ? (
            <ImagenDD
              src={urlCampeon(ddragon, itemB.campeon_id, itemB.campeon)}
              alt={campB}
              respaldo={campB}
              tamaño={40}
              redonda
            />
          ) : (
            <div className="size-full bg-superficie/40 flex items-center justify-center text-xs text-texto-suave">
              —
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
