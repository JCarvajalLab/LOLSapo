// Mejor o peor partida de un destacado: la de la tarjeta y la de cada fila del top 5.
import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";
import { colorResultado, formatearDanio, formatearKdaDestacado } from "../logica/destacados.js";
import { esNumero, fechaCompleta, haceCuanto } from "../logica/formato.js";
import { MarcaResultado } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

/** "85 / 48 / 60" con las muertes en color derrota, como en las partidas. */
function Kda({ a, m, asi }) {
  return (
    <>
      <span aria-hidden="true">
        <span className="text-texto">{a}</span> / <span className="text-derrota">{m}</span> / <span className="text-texto">{asi}</span>
      </span>
      <span className="sr-only">
        {a} asesinatos, {m} muertes, {asi} asistencias
      </span>
    </>
  );
}

/**
 * Mejor o peor jugador de la partida (de hoy, de la semana o del mes): misma tarjeta, cambia el color del KDA.
 * El nombre del campeón sale de Data Dragon ("Maestro Yi"), con `campeon` de respaldo.
 * El daño a campeones va en su línea bajo el KDA, en color del resultado de esa partida
 * (el texto «Victoria»/«Derrota» de abajo lo dice sin depender del color); sin dato no se muestra.
 * `compacta` achica la imagen y el texto para las filas del top 5.
 */
export function PartidaDestacada({ t, ddragon, ahora, mejor, compacta = false }) {
  const campeon = nombreCampeon(ddragon, t.campeon_id, t.campeon);
  const danio = formatearDanio(t.danio);
  return (
    <div className={`flex items-center ${compacta ? "gap-2" : "mt-auto gap-3"}`}>
      <ImagenDD src={urlCampeon(ddragon, t.campeon_id, t.campeon)} alt={campeon} tamaño={compacta ? 36 : 44} />
      <div className="min-w-0">
        <p className={`cifras font-titulo leading-tight font-bold ${compacta ? "text-base" : "text-lg"}`}>
          {campeon} <span className="text-texto-suave">·</span> <Kda a={t.asesinatos} m={t.muertes} asi={t.asistencias} />
        </p>
        <p className={`cifras text-sm font-semibold ${mejor ? "text-victoria" : "text-derrota"}`}>
          KDA {formatearKdaDestacado(t.kda)}
        </p>
        {danio && (
          <p data-danio="" className={`cifras text-sm font-semibold ${colorResultado(t.resultado)}`}>
            {danio}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-texto-suave">
          <span>{t.modo || "Modo especial"}</span>
          <time
            dateTime={esNumero(t.fecha) ? new Date(t.fecha).toISOString() : undefined}
            title={fechaCompleta(t.fecha)}
            className="whitespace-nowrap"
          >
            {haceCuanto(t.fecha, ahora)}
          </time>
          <MarcaResultado resultado={t.resultado} />
        </p>
      </div>
    </div>
  );
}
