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
    // Curva en forma de S con fluctuación determinista basada en el minuto
    const fluctuacion = Math.sin(m * 0.9) * 450 + Math.cos(m * 1.5) * 300;
    const base = diffFinal * Math.pow(progreso, 1.35);
    const val = m === minutos ? diffFinal : Math.round(base + fluctuacion * (1 - progreso * 0.3));
    curva.push(val);
  }
  return curva;
}

/** Formatea números con separador de miles en español (ej: 12.449) */
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

  const duracionMin = curva.length - 1;

  // Rango Y dinámico centrado en 0
  const minVal = Math.min(0, ...curva);
  const maxVal = Math.max(0, ...curva);

  // Escala en tramos de 5000 o 2500
  const pasoY = Math.max(minVal * -1, maxVal) > 8000 ? 5000 : 2500;
  const rangoMin = Math.floor(minVal / pasoY) * pasoY;
  const rangoMax = Math.ceil(maxVal / pasoY) * pasoY;
  const amplitudTotal = Math.max(pasoY * 2, rangoMax - rangoMin);

  // Dimensiones del SVG
  const anchoSvg = 520;
  const altoSvg = 220;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 20;
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
    const xProporcion = xRel / rect.width;
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

  return (
    <div className="rounded-lg border border-borde/60 bg-superficie/40 p-4">
      <h3 className="text-sm font-bold text-texto mb-3">Ventaja de oro del equipo</h3>

      <div className="relative w-full overflow-hidden select-none" onMouseMove={alMoverMouse} onMouseLeave={() => setHoverPunto(null)}>
        <svg viewBox={`0 0 ${anchoSvg} ${altoSvg}`} className="w-full h-auto overflow-visible">
          <defs>
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

          {/* Áreas sombreadas */}
          <path d={dPoligono} fill="#539dfc" fillOpacity="0.25" clipPath={`url(#clip-azul-${idUnico})`} />
          <path d={dPoligono} fill="#e05660" fillOpacity="0.30" clipPath={`url(#clip-rojo-${idUnico})`} />

          {/* Líneas de contorno */}
          <path d={dLinea} fill="none" stroke="#539dfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#clip-azul-${idUnico})`} />
          <path d={dLinea} fill="none" stroke="#e05660" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#clip-rojo-${idUnico})`} />

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
                fill={hoverPunto.valor >= 0 ? "#539dfc" : "#e05660"}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Tooltip flotante interactivo */}
        {hoverPunto && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-borde/90 bg-fondo/95 px-2.5 py-1 text-center shadow-lg backdrop-blur-sm transition-all"
            style={{
              left: `${(hoverPunto.x / anchoSvg) * 100}%`,
              top: `${Math.max(28, (hoverPunto.y / altoSvg) * 100 - 8)}%`,
            }}
          >
            <p className="text-[10px] text-texto-suave font-medium">Minuto {hoverPunto.minuto}:00</p>
            <p
              className={`text-xs font-bold ${
                hoverPunto.valor >= 0 ? "text-azul" : "text-derrota"
              }`}
            >
              {hoverPunto.valor >= 0 ? "+" : "-"}
              {formatearNumero(hoverPunto.valor)} oro ({hoverPunto.valor >= 0 ? "Azul" : "Rojo"})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Gráfico de Daño Infligido a Campeones (10 barras comparativas con íconos de campeones).
 */
export function GraficoDanioInfligido({ jugadoresAzul, jugadoresRojo, ddragon }) {
  const [hoverJugador, setHoverJugador] = useState(null);
  const idUnico = useId().replace(/:/g, "");

  const azul = jugadoresAzul || [];
  const rojo = jugadoresRojo || [];

  const totalDanioAzul = Math.max(1, azul.reduce((acc, j) => acc + (j.danio || 0), 0));
  const totalDanioRojo = Math.max(1, rojo.reduce((acc, j) => acc + (j.danio || 0), 0));

  const maxDanio = Math.max(1, ...azul.map((j) => j.danio || 0), ...rojo.map((j) => j.danio || 0));

  // Escala en tramos de 10.000
  const pasoY = 10000;
  const scaleMax = Math.max(20000, Math.ceil(maxDanio / pasoY) * pasoY);

  const anchoSvg = 520;
  const altoSvg = 220;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 42; // Espacio para los avatares de los campeones
  const anchoGrafico = anchoSvg - padLeft - padRight;
  const altoGrafico = altoSvg - padTop - padBottom;

  const yZero = padTop + altoGrafico;

  // Ticks del eje Y
  const ticksY = [];
  for (let t = scaleMax; t >= 0; t -= pasoY) {
    const y = padTop + ((scaleMax - t) / scaleMax) * altoGrafico;
    ticksY.push({ valor: t, y });
  }

  // Geometría de las 10 barras (5 azul, separación central, 5 rojo)
  const barWidth = 28;
  const stepBar = 37;
  const gapCentral = 24;

  const barrasAzul = azul.map((j, i) => {
    const x = padLeft + 12 + i * stepBar;
    const danio = j.danio || 0;
    const alto = (danio / scaleMax) * altoGrafico;
    const y = yZero - alto;
    const pct = Math.round((danio / totalDanioAzul) * 100);
    return { jugador: j, x, y, alto, danio, pct, equipo: "azul" };
  });

  const barrasRojo = rojo.map((j, i) => {
    const x = padLeft + 12 + 5 * stepBar + gapCentral + i * stepBar;
    const danio = j.danio || 0;
    const alto = (danio / scaleMax) * altoGrafico;
    const y = yZero - alto;
    const pct = Math.round((danio / totalDanioRojo) * 100);
    return { jugador: j, x, y, alto, danio, pct, equipo: "rojo" };
  });

  const todasLasBarras = [...barrasAzul, ...barrasRojo];

  return (
    <div className="rounded-lg border border-borde/60 bg-superficie/40 p-4">
      <h3 className="text-sm font-bold text-texto mb-3">Daño infligido</h3>

      <div className="relative w-full select-none">
        <svg viewBox={`0 0 ${anchoSvg} ${altoSvg}`} className="w-full h-auto overflow-visible">
          <defs>
            {todasLasBarras.map((b, idx) => (
              <clipPath key={idx} id={`avatar-clip-${idUnico}-${idx}`}>
                <rect x={b.x + (barWidth - 24) / 2} y={yZero + 6} width={24} height={24} rx={4} />
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
            const colorStroke = esAzul ? "#539dfc" : "#e05660";
            const colorFill = esAzul ? "rgba(83, 157, 252, 0.25)" : "rgba(224, 86, 96, 0.28)";
            const colorFillHover = esAzul ? "rgba(83, 157, 252, 0.60)" : "rgba(224, 86, 96, 0.60)";
            const activo = hoverJugador?.jugador === b.jugador;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverJugador(b)}
                onMouseLeave={() => setHoverJugador(null)}
              >
                {/* Barra vertical */}
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

                {/* Ícono de campeón abajo */}
                <image
                  x={b.x + (barWidth - 24) / 2}
                  y={yZero + 6}
                  width={24}
                  height={24}
                  href={urlCampeon(ddragon, b.jugador.campeon_id)}
                  clipPath={`url(#avatar-clip-${idUnico}-${idx})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect
                  x={b.x + (barWidth - 24) / 2}
                  y={yZero + 6}
                  width={24}
                  height={24}
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
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-borde/90 bg-fondo/95 p-2 text-center shadow-xl backdrop-blur-md transition-all"
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
                hoverJugador.equipo === "azul" ? "text-azul" : "text-derrota"
              }`}
            >
              {formatearNumero(hoverJugador.danio)} daño
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
