import {
  CLAVES_SEMANA_TFT,
  destacadosVaciosTft,
  destacadosVigentesTft,
  VACIO_SEMANA_TFT,
} from "../logica/destacadosTft.js";
import { BloqueDestacadosTft, ListaDestacadosTft } from "./PiezasDestacadosTft.jsx";

const NOTA =
  "Partidas individuales y en dúo de TFT, de lunes a domingo · Se reinicia el lunes a la 01:00";

/**
 * Destacados semanales de TFT: mejor partida, mejor % Top 4, balance grupal, más partidas
 * y puesto más bajo. Sin "Hoy" diario.
 */
export function SeccionDestacadosSemanaTft({ destacados, amigos, ddragon, ahora }) {
  if (!destacados) return null;
  const vigentes = destacadosVigentesTft(destacados, ahora);

  return (
    <BloqueDestacadosTft
      id="destacados-semana-tft"
      titulo="Destacados de la semana (TFT)"
      nota={NOTA}
    >
      {destacadosVaciosTft(vigentes, CLAVES_SEMANA_TFT) ? (
        <p className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-borde px-3 text-center text-sm text-texto-suave">
          {VACIO_SEMANA_TFT}
        </p>
      ) : (
        <ListaDestacadosTft
          claves={CLAVES_SEMANA_TFT}
          destacados={vigentes}
          amigos={amigos}
          ddragon={ddragon}
          ahora={ahora}
          nota={NOTA}
          claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        />
      )}
    </BloqueDestacadosTft>
  );
}
