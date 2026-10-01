import { useEffect, useState } from "react";

/** Hora actual que se refresca cada `intervaloMs` (para "hace X" y minutos en partida). */
export function useAhora(intervaloMs = 30000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
