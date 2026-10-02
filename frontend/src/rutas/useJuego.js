import { useCallback, useEffect, useState } from "react";
import { HASH_INICIO, HASH_TFT, juegoDesdeHash } from "./hash.js";

/**
 * Juego elegido ("lol" o "tft"), sincronizado con el hash.
 * Cambiar de pestaña agrega una entrada al historial, así "atrás" vuelve a la anterior.
 */
export function useJuego() {
  const [juego, setJuego] = useState(() => juegoDesdeHash(window.location.hash));

  useEffect(() => {
    const alCambiar = () => setJuego(juegoDesdeHash(window.location.hash));
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  const cambiar = useCallback((nuevo) => {
    if (nuevo !== "lol" && nuevo !== "tft") return;
    setJuego(nuevo);
    if (juegoDesdeHash(window.location.hash) !== nuevo) {
      window.location.hash = nuevo === "tft" ? HASH_TFT : HASH_INICIO;
    }
  }, []);

  return { juego, cambiar };
}
