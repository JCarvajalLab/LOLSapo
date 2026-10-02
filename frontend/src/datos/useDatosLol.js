import { useCallback, useEffect, useRef, useState } from "react";
import { cargarDatos } from "../logica/datos.js";

export const INTERVALO_ACTUALIZACION_MS = 2 * 60 * 1000;

function pestañaVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

/**
 * Carga lol.json al abrir la página y lo vuelve a pedir cada 2 minutos,
 * solo mientras la pestaña está visible. Al volver a la pestaña, si ya pasó
 * el intervalo, lo pide de inmediato.
 * Mientras pide, los datos anteriores siguen en pantalla; si falla, se conservan.
 */
export function useDatosLol(fetchFn, intervaloMs = INTERVALO_ACTUALIZACION_MS) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const enCurso = useRef(false);
  const ultimoIntento = useRef(0);

  const cargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    ultimoIntento.current = Date.now();
    setCargando(true);
    try {
      const nuevos = await cargarDatos(fetchFn);
      setDatos(nuevos);
      setError(null);
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
    cargar();

    const id = setInterval(() => {
      if (pestañaVisible()) cargar();
    }, intervaloMs);

    const alCambiarVisibilidad = () => {
      if (pestañaVisible() && Date.now() - ultimoIntento.current >= intervaloMs) cargar();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [cargar, intervaloMs]);

  return { datos, cargando, error };
}
