import { useCallback, useEffect, useRef, useState } from "react";

export const INTERVALO_ACTUALIZACION_MS = 2 * 60 * 1000;

function pestañaVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

/**
 * Carga un JSON de datos con `cargador(fetchFn)` y lo vuelve a pedir cada 2 minutos,
 * solo mientras la pestaña del navegador está visible. Al volver a la pestaña, si ya
 * pasó el intervalo, lo pide de inmediato.
 * Con `activo` en false no pide nada (por ejemplo, mientras se mira otro juego);
 * al activarse hace la primera carga. Los datos ya cargados se conservan.
 * Mientras pide, los datos anteriores siguen en pantalla; si falla, se conservan.
 */
export function useDatosPeriodicos(cargador, fetchFn, { intervaloMs = INTERVALO_ACTUALIZACION_MS, activo = true } = {}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(activo);
  const [error, setError] = useState(null);
  const enCurso = useRef(false);
  const ultimoIntento = useRef(0);

  const cargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    ultimoIntento.current = Date.now();
    setCargando(true);
    try {
      const nuevos = await cargador(fetchFn);
      setDatos(nuevos);
      setError(null);
    } catch (e) {
      // { tipo, mensaje }: el tipo decide qué mensaje accionable se muestra.
      setError({ tipo: e?.tipo ?? "red", mensaje: e?.message || "No se pudieron leer los datos." });
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }, [cargador, fetchFn]);

  useEffect(() => {
    if (!activo) return undefined;
    // Primera carga al montar (o al activarse); después, solo si ya pasó el intervalo.
    if (ultimoIntento.current === 0 || Date.now() - ultimoIntento.current >= intervaloMs) {
      cargar();
    }

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
  }, [cargar, intervaloMs, activo]);

  return { datos, cargando, error };
}
