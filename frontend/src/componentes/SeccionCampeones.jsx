import { TarjetaCampeones } from "./TarjetaCampeones.jsx";
import { TarjetaEnConstruccion } from "./TarjetaEnConstruccion.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const NOTA =
  "Top de campeones utilizados por el grupo · Clic en la tarjeta para explorar estadísticas detalladas, por jugador y por rol";

export function SeccionCampeones({ campeones, ddragon, onVerDetalle, refBoton }) {
  if (!campeones) return null;

  return (
    <section aria-labelledby="titulo-campeones-seccion" aria-describedby="nota-campeones-seccion">
      <TituloSeccion id="titulo-campeones-seccion">Campeones más jugados</TituloSeccion>
      <p id="nota-campeones-seccion" className="-mt-2 mb-3 text-xs break-words text-texto-suave">
        {NOTA}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch" aria-label="Tarjetas de campeones y novedades">
        <li className="h-full">
          <TarjetaCampeones
            campeones={campeones}
            ddragon={ddragon}
            onVerDetalle={onVerDetalle}
            refBoton={refBoton}
          />
        </li>
        <li className="h-full">
          <TarjetaEnConstruccion titulo="Próximamente" subtitulo="Espacio reservado" />
        </li>
        <li className="h-full">
          <TarjetaEnConstruccion titulo="Próximamente" subtitulo="Espacio reservado" />
        </li>
      </ul>
    </section>
  );
}
