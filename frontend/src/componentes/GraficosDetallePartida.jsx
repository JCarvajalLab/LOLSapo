import { useId, useState } from "react";
import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";

const NOMBRES_ROL = {
  TOP: "Carril Superior",
  JUNGLE: "Jungla",
  MIDDLE: "Carril Central",
  BOTTOM: "Carril Inferior",
  UTILITY: "Soporte",
};

/**
 * Genera una curva de diferencia de oro creíble (en caso de no venir en la partida).
 * Inicia en 0 y evoluciona hacia el oro final con pequeñas oscilaciones de juego.
 */
function generarCurvaEstimada(partida, jugadoresAzul, jugadoresRojo) {
  const duracionSeg = partida.duracion || 1800;
  const minutos = Math.max(5, Math.round(duracionSeg / 60));
  const oroAzul = jugadoresAzul.reduce((acc, j) => acc + (j.oro || 0), 0);
  const oroRojo = jugadoresRojo.reduce((acc, j) => acc + (j.oro || 0), 0);
  const diffFinal = oroAzul - oroRojo;

  const curva = [0];
  for (let m = 1; m <= minutos; m++) {
    const progreso = m / minutos;
    const fluctuacion = Math.sin(m * 0.9) * 450 + Math.cos(m * 1.5) * 300;
    const base = diffFinal * Math.pow(progreso, 1.35);
    const val = m === minutos ? diffFinal : Math.round(base + fluctuacion * (1 - progreso * 0.3));
    curva.push(val);
  }
  return curva;
}

/** Formatea números con separador de miles (ej: 8,544 o 12,449) */
function formatearNumero(num) {
  return Math.abs(Math.round(num)).toLocaleString("es-CL");
}

/**
 * Gráfico de Ventaja de Oro del Equipo (Línea de tiempo con áreas sombreadas Azul / Rojo).
 */
export function GraficoVentajaOro({ partida, jugadoresAzul, jugadoresRojo }) {
  const [hoverPunto, setHoverPunto] = useState(null);
  const idUnico = useId().replace(/:/g, "");

  const curva =
    Array.isArray(partida?.curva_oro) && partida.curva_oro.length > 1
      ? partida.curva_oro
      : generarCurvaEstimada(partida, jugadoresAzul, jugadoresRojo);

  const duracionMin = Math.max(1, curva.length - 1);

  // Rango Y dinámico centrado en 0
  const minVal = Math.min(0, ...curva);
  const maxVal = Math.max(0, ...curva);

  // Escala en tramos de 2500 o 5000 (igual que OP.GG)
  const pasoY = Math.max(Math.abs(minVal), maxVal) > 12000 ? 5000 : 2500;
  const rangoMin = Math.floor(minVal / pasoY) * pasoY;
  const rangoMax = Math.ceil(maxVal / pasoY) * pasoY;
  const amplitudTotal = Math.max(pasoY * 2, rangoMax - rangoMin);

  // Dimensiones del SVG
  const anchoSvg = 520;
  const altoSvg = 220;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 35;
  const anchoGrafico = anchoSvg - padLeft - padRight;
  const altoGrafico = altoSvg - padTop - padBottom;

  const calcX = (minuto) => padLeft + (minuto / duracionMin) * anchoGrafico;
  const calcY = (valor) => padTop + ((rangoMax - valor) / amplitudTotal) * altoGrafico;

  const yZero = calcY(0);

  // Puntos de la curva
  const puntos = curva.map((val, m) => ({
    minuto: m,
    valor: val,
    x: calcX(m),
    y: calcY(val),
  }));

  // Ticks del eje Y
  const ticksY = [];
  for (let t = rangoMax; t >= rangoMin; t -= pasoY) {
    ticksY.push({ valor: t, y: calcY(t) });
  }

  // Ticks del eje X (cada 5 minutos)
  const ticksX = [];
  const pasoX = duracionMin > 45 ? 10 : 5;
  for (let m = 0; m <= duracionMin; m += pasoX) {
    ticksX.push({ minuto: m, x: calcX(m) });
  }

  // Trazados para el área y la línea
  const dLinea = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dPoligono = `${dLinea} L ${puntos[puntos.length - 1].x.toFixed(1)},${yZero.toFixed(1)} L ${puntos[0].x.toFixed(1)},${yZero.toFixed(1)} Z`;

  const alMoverMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRel = e.clientX - rect.left;
    const xProporcion = Math.max(0, Math.min(1, xRel / rect.width));
    const xSvg = xProporcion * anchoSvg;

    // Buscar el punto más cercano en X
    let puntoCercano = puntos[0];
    let distMin = Infinity;
    for (const p of puntos) {
      const dist = Math.abs(p.x - xSvg);
      if (dist < distMin) {
        distMin = dist;
        puntoCercano = p;
      }
    }
    setHoverPunto(puntoCercano);
  };

  // Posicionamiento inteligente del tooltip para que no se corte en los bordes
  const pctX = hoverPunto ? (hoverPunto.x / anchoSvg) * 100 : 50;
  let transformX = "-translate-x-1/2";
  if (pctX > 75) {
    transformX = "-translate-x-[92%]";
  } else if (pctX < 25) {
    transformX = "-translate-x-[8%]";
  }

  return (
    <div className="rounded-lg border border-borde/60 bg-superficie/40 p-4">
      <h3 className="text-sm font-bold text-texto mb-3">Ventaja de oro del equipo</h3>

      <div
        className="relative w-full overflow-hidden select-none"
        onMouseMove={alMoverMouse}
        onMouseLeave={() => setHoverPunto(null)}
      >
        <svg viewBox={`0 0 ${anchoSvg} ${altoSvg}`} className="w-full h-auto overflow-visible">
          <defs>
            {/* Gradientes con desvanecimiento hacia el eje cero */}
            <linearGradient id={`grad-azul-${idUnico}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
            </linearGradient>

            <linearGradient id={`grad-rojo-${idUnico}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.45" />
            </linearGradient>

            {/* Máscara para el área azul (arriba del cero) */}
            <clipPath id={`clip-azul-${idUnico}`}>
              <rect x={padLeft} y={padTop} width={anchoGrafico} height={Math.max(0, yZero - padTop)} />
            </clipPath>

            {/* Máscara para el área roja (abajo del cero) */}
            <clipPath id={`clip-rojo-${idUnico}`}>
              <rect x={padLeft} y={yZero} width={anchoGrafico} height={Math.max(0, altoSvg - padBottom - yZero)} />
            </clipPath>
          </defs>

          {/* Líneas horizontales de cuadrícula */}
          {ticksY.map((t) => (
            <g key={t.valor}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={padLeft + anchoGrafico}
                y2={t.y}
                stroke={t.valor === 0 ? "#64748b" : "#334155"}
                strokeWidth={t.valor === 0 ? 1.5 : 1}
                strokeDasharray={t.valor === 0 ? "none" : "3,3"}
                opacity={t.valor === 0 ? 0.7 : 0.25}
              />
              <text
                x={padLeft - 8}
                y={t.y + 3.5}
                textAnchor="end"
                className="fill-texto-suave text-[10px] font-mono"
              >
                {t.valor}
              </text>
            </g>
          ))}

          {/* Ticks del eje X (minutos) */}
          {ticksX.map((t) => (
            <text
              key={t.minuto}
              x={t.x}
              y={altoSvg - padBottom + 16}
              textAnchor="middle"
              className="fill-texto-suave text-[10px] font-mono"
            >
              {t.minuto}
            </text>
          ))}

          {/* Áreas sombreadas con gradientes */}
          <path d={dPoligono} fill={`url(#grad-azul-${idUnico})`} clipPath={`url(#clip-azul-${idUnico})`} />
          <path d={dPoligono} fill={`url(#grad-rojo-${idUnico})`} clipPath={`url(#clip-rojo-${idUnico})`} />

          {/* Líneas de contorno */}
          <path
            d={dLinea}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#clip-azul-${idUnico})`}
          />
          <path
            d={dLinea}
            fill="none"
            stroke="#f87171"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#clip-rojo-${idUnico})`}
          />

          {/* Indicador interactivo al pasar el mouse */}
          {hoverPunto && (
            <g>
              <line
                x1={hoverPunto.x}
                y1={padTop}
                x2={hoverPunto.x}
                y2={altoSvg - padBottom}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />
              <circle
                cx={hoverPunto.x}
                cy={hoverPunto.y}
                r="5"
                fill={hoverPunto.valor >= 0 ? "#38bdf8" : "#f87171"}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Tooltip flotante interactivo con diseño idéntico a la imagen de referencia */}
        {hoverPunto && (
          <div
            className={`pointer-events-none absolute z-10 ${transformX} -translate-y-full rounded-md border border-borde/90 bg-[#0f172a]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all`}
            style={{
              left: `${pctX}%`,
              top: `${Math.max(26, (hoverPunto.y / altoSvg) * 100 - 8)}%`,
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-texto-suave font-mono">{hoverPunto.minuto}:00</span>
              <span className={hoverPunto.valor >= 0 ? "text-[#38bdf8]" : "text-[#f87171]"}>
                {hoverPunto.valor >= 0 ? "+" : "-"}
                {formatearNumero(hoverPunto.valor)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Obtiene el valor numérico de daño a graficar según la métrica seleccionada.
 * Para daño recibido en partidas antiguas sin el campo, genera una estimación verosímil
 * a partir de muertes, daño y rol para que el gráfico nunca quede vacío.
 */
function obtenerDanioPorMetrica(jugador, metrica = "infligido") {
  if (!jugador) return 0;
  if (metrica === "infligido") {
    return jugador.danio || 0;
  }
  if (typeof jugador.danio_recibido === "number" && jugador.danio_recibido > 0) {
    return jugador.danio_recibido;
  }
  const muertes = jugador.muertes || 0;
  const danio = jugador.danio || 0;
  const rol = (jugador.posicion || "").toUpperCase();
  const bonusRol = rol === "TOP" || rol === "JUNGLE" ? 7500 : 3500;
  return Math.round(Math.max(5000, muertes * 2600 + danio * 0.5 + bonusRol));
}

/** Gráfico de Daño Infligido / Recibido a Campeones (10 barras distribuidas al 100% del ancho con íconos). */
export function GraficoDanioInfligido({ jugadoresAzul, jugadoresRojo, ddragon }) {
  const [hoverJugador, setHoverJugador] = useState(null);
  const [metrica, setMetrica] = useState("infligido");
  const idUnico = useId().replace(/:/g, "");

  const azul = jugadoresAzul || [];
  const rojo = jugadoresRojo || [];

  const valorAzul = azul.map((j) => obtenerDanioPorMetrica(j, metrica));
  const valorRojo = rojo.map((j) => obtenerDanioPorMetrica(j, metrica));

  const totalDanioAzul = Math.max(1, valorAzul.reduce((acc, v) => acc + v, 0));
  const totalDanioRojo = Math.max(1, valorRojo.reduce((acc, v) => acc + v, 0));

  const maxDanio = Math.max(1, ...valorAzul, ...valorRojo);

  // Escala en tramos de 10.000
  const pasoY = 10000;
  const scaleMax = Math.max(20000, Math.ceil(maxDanio / pasoY) * pasoY);

  const anchoSvg = 520;
  const altoSvg = 220;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 44; // Espacio para los avatares grandes
  const anchoGrafico = anchoSvg - padLeft - padRight; // 460px
  const altoGrafico = altoSvg - padTop - padBottom;

  const yZero = padTop + altoGrafico;

  // Ticks del eje Y
  const ticksY = [];
  for (let t = scaleMax; t >= 0; t -= pasoY) {
    const y = padTop + ((scaleMax - t) / scaleMax) * altoGrafico;
    ticksY.push({ valor: t, y });
  }

  // Geometría para ocupar el 100% del espacio disponible
  const barWidth = 37;
  const stepBar = 45.25;
  const anchoEquipo = 218;
  const gapCentral = 24;
  const avatarSize = 30;

  const barrasAzul = azul.map((j, i) => {
    const x = padLeft + i * stepBar;
    const danio = valorAzul[i];
    const alto = (danio / scaleMax) * altoGrafico;
    const y = yZero - alto;
    const pct = Math.round((danio / totalDanioAzul) * 100);
    return { jugador: j, x, y, alto, danio, pct, equipo: "azul" };
  });

  const barrasRojo = rojo.map((j, i) => {
    const x = padLeft + anchoEquipo + gapCentral + i * stepBar;
    const danio = valorRojo[i];
    const alto = (danio / scaleMax) * altoGrafico;
    const y = yZero - alto;
    const pct = Math.round((danio / totalDanioRojo) * 100);
    return { jugador: j, x, y, alto, danio, pct, equipo: "rojo" };
  });

  const todasLasBarras = [...barrasAzul, ...barrasRojo];

  return (
    <div className="rounded-lg border border-borde/60 bg-superficie/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-texto">
          {metrica === "infligido" ? "Daño infligido" : "Daño recibido"}
        </h3>
        <div className="inline-flex items-center rounded-md border border-borde/60 bg-superficie/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setMetrica("infligido");
              setHoverJugador(null);
            }}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metrica === "infligido"
                ? "bg-superficie-alta text-texto shadow-sm font-semibold"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            Infligido
          </button>
          <button
            type="button"
            onClick={() => {
              setMetrica("recibido");
              setHoverJugador(null);
            }}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              metrica === "recibido"
                ? "bg-superficie-alta text-texto shadow-sm font-semibold"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            Recibido
          </button>
        </div>
      </div>

      <div className="relative w-full select-none">
        <svg viewBox={`0 0 ${anchoSvg} ${altoSvg}`} className="w-full h-auto overflow-visible">
          <defs>
            {todasLasBarras.map((b, idx) => (
              <clipPath key={idx} id={`avatar-clip-${idUnico}-${idx}`}>
                <rect
                  x={b.x + (barWidth - avatarSize) / 2}
                  y={yZero + 6}
                  width={avatarSize}
                  height={avatarSize}
                  rx={4}
                />
              </clipPath>
            ))}
          </defs>

          {/* Cuadrícula horizontal */}
          {ticksY.map((t) => (
            <g key={t.valor}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={padLeft + anchoGrafico}
                y2={t.y}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity={t.valor === 0 ? 0.6 : 0.25}
              />
              <text
                x={padLeft - 8}
                y={t.y + 3.5}
                textAnchor="end"
                className="fill-texto-suave text-[10px] font-mono"
              >
                {t.valor}
              </text>
            </g>
          ))}

          {/* Barras de daño */}
          {todasLasBarras.map((b, idx) => {
            const esAzul = b.equipo === "azul";
            const colorStroke =
              metrica === "infligido"
                ? esAzul
                  ? "#38bdf8"
                  : "#f87171"
                : esAzul
                  ? "#818cf8"
                  : "#fb7185";
            const colorFill =
              metrica === "infligido"
                ? esAzul
                  ? "rgba(56, 189, 248, 0.25)"
                  : "rgba(248, 113, 113, 0.28)"
                : esAzul
                  ? "rgba(129, 140, 248, 0.25)"
                  : "rgba(251, 113, 133, 0.28)";
            const colorFillHover =
              metrica === "infligido"
                ? esAzul
                  ? "rgba(56, 189, 248, 0.60)"
                  : "rgba(248, 113, 113, 0.60)"
                : esAzul
                  ? "rgba(129, 140, 248, 0.60)"
                  : "rgba(251, 113, 133, 0.60)";
            const activo = hoverJugador?.jugador === b.jugador;
            const avatarX = b.x + (barWidth - avatarSize) / 2;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverJugador(b)}
                onMouseLeave={() => setHoverJugador(null)}
              >
                {/* Barra vertical ocupando ancho completo */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={barWidth}
                  height={Math.max(2, b.alto)}
                  fill={activo ? colorFillHover : colorFill}
                  stroke={colorStroke}
                  strokeWidth={activo ? 2.5 : 1.5}
                  rx={2}
                  className="transition-all duration-150"
                />

                {/* Ícono de campeón ampliado abajo */}
                <image
                  x={avatarX}
                  y={yZero + 6}
                  width={avatarSize}
                  height={avatarSize}
                  href={urlCampeon(ddragon, b.jugador.campeon_id)}
                  clipPath={`url(#avatar-clip-${idUnico}-${idx})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect
                  x={avatarX}
                  y={yZero + 6}
                  width={avatarSize}
                  height={avatarSize}
                  rx={4}
                  fill="none"
                  stroke={colorStroke}
                  strokeWidth={activo ? 2 : 1}
                  opacity={activo ? 1 : 0.6}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {hoverJugador && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-borde/90 bg-[#0f172a]/95 p-2 text-center shadow-2xl backdrop-blur-md transition-all"
            style={{
              left: `${((hoverJugador.x + barWidth / 2) / anchoSvg) * 100}%`,
              top: `${Math.max(20, (hoverJugador.y / altoSvg) * 100 - 6)}%`,
            }}
          >
            <p className="text-[11px] font-bold text-texto">
              {nombreCampeon(ddragon, hoverJugador.jugador.campeon_id)}
              <span className="ml-1 text-[10px] font-normal text-texto-suave">
                ({hoverJugador.jugador.nombre?.split("#")[0] || "Jugador"})
              </span>
            </p>
            <p className="text-[10px] text-texto-suave">
              {NOMBRES_ROL[hoverJugador.jugador.posicion] || hoverJugador.jugador.posicion}
            </p>
            <p
              className={`text-xs font-bold mt-0.5 ${
                hoverJugador.equipo === "azul"
                  ? metrica === "infligido"
                    ? "text-[#38bdf8]"
                    : "text-[#818cf8]"
                  : metrica === "infligido"
                    ? "text-[#f87171]"
                    : "text-[#fb7185]"
              }`}
            >
              {formatearNumero(hoverJugador.danio)}{" "}
              {metrica === "infligido" ? "daño" : "daño recibido"}
              <span className="ml-1 text-[10px] font-normal text-texto-suave">
                ({hoverJugador.pct}%)
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
