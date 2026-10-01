import { useCallback, useEffect, useRef, useState } from "react";
import { cargarDatos } from "../logica/datos.js";

/**
 * Carga lol.json al abrir la página y expone `actualizar()` para el botón.
 * Si una actualización falla, se conservan los datos anteriores.
 */
export function useDatosLol(fetchFn) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const enCurso = useRef(false);

  const actualizar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    setError(null);
    try {
      const nuevos = await cargarDatos(fetchFn);
      setDatos(nuevos);
    } catch (e) {
      setError(e?.message || "No se pudieron leer los datos.");
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    // Carga inicial al montar la página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    actualizar();
  }, [actualizar]);

  return { datos, cargando, error, actualizar };
}
