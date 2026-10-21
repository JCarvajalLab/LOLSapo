import { TarjetaCampeones } from "./TarjetaCampeones.jsx";
import { TarjetaRecords } from "./TarjetaRecords.jsx";
import { TarjetaRoles } from "./TarjetaRoles.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const NOTA =
  "Campeón más jugado de cada integrante, desglose de roles y récords del grupo · Clic en cualquier tarjeta para ver detalles o comparar invocadores cara a cara";

export function SeccionCampeones({
  campeones,
  records,
  amigos,
  ddragon,
  onVerDetalle,
  onVerRecords,
  refBoton,
}) {
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
          <TarjetaRecords
            records={records}
            amigos={amigos}
            ddragon={ddragon}
            onVerRecords={onVerRecords}
          />
        </li>
      </ul>
    </section>
  );
}
