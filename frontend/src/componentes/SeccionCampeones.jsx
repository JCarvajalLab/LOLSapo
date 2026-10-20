import { TarjetaCampeones } from "./TarjetaCampeones.jsx";
import { TarjetaEnConstruccion } from "./TarjetaEnConstruccion.jsx";
import { TarjetaRoles } from "./TarjetaRoles.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const NOTA =
  "Campeón más jugado de cada integrante y desglose de roles por invocador · Clic en campeones para explorar estadísticas detalladas, por jugador y por rol";

export function SeccionCampeones({ campeones, amigos, ddragon, onVerDetalle, refBoton }) {
  if (!campeones) return null;

  return (
    <section aria-labelledby="titulo-estadisticas-generales" aria-describedby="nota-estadisticas-generales">
      <TituloSeccion id="titulo-estadisticas-generales">Estadísticas generales</TituloSeccion>
      <p id="nota-estadisticas-generales" className="-mt-2 mb-3 text-xs break-words text-texto-suave">
        {NOTA}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch" aria-label="Tarjetas de estadísticas generales">
        <li className="h-full">
          <TarjetaCampeones
            campeones={campeones}
            amigos={amigos}
            ddragon={ddragon}
            onVerDetalle={onVerDetalle}
            refBoton={refBoton}
          />
        </li>
        <li className="h-full">
          <TarjetaRoles
            campeones={campeones}
            amigos={amigos}
            onVerDetalle={onVerDetalle}
          />
        </li>
        <li className="h-full">
          <TarjetaEnConstruccion titulo="Próximamente" subtitulo="Espacio reservado" />
        </li>
      </ul>
    </section>
  );
}
