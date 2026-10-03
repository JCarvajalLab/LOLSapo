import { useCallback, useEffect, useState } from "react";
import { hashDeAmigo, reemplazarHash, slugDesdeHash } from "./hash.js";

/**
 * Qué amigos tienen el panel desplegado.
 * `#/amigo/<slug>` abre ese amigo; abrir o cerrar un panel actualiza el hash.
 */
export function useAmigosAbiertos() {
  const [abiertos, setAbiertos] = useState(() => {
    const slug = slugDesdeHash(window.location.hash);
    return slug ? new Set([slug]) : new Set();
  });
  // Pedido de desplazamiento: el contador permite repetirlo para el mismo amigo.
  const [enfocar, setEnfocar] = useState(() => {
    const slug = slugDesdeHash(window.location.hash);
    return slug ? { slug, n: 0 } : null;
  });

  const abrir = useCallback((slug) => {
    setAbiertos((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
    setEnfocar((prev) => ({ slug, n: (prev?.n ?? 0) + 1 }));
    reemplazarHash(hashDeAmigo(slug));
  }, []);

  useEffect(() => {
    const alCambiar = () => {
      const slug = slugDesdeHash(window.location.hash);
      if (!slug) return;
      setAbiertos((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
      setEnfocar((prev) => ({ slug, n: (prev?.n ?? 0) + 1 }));
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  const alternar = useCallback(
    (slug) => {
      if (abiertos.has(slug)) {
        const siguiente = new Set(abiertos);
        siguiente.delete(slug);
        setAbiertos(siguiente);
        if (slugDesdeHash(window.location.hash) === slug) reemplazarHash("#/");
      } else {
        setAbiertos(new Set(abiertos).add(slug));
        reemplazarHash(hashDeAmigo(slug));
      }
    },
    [abiertos],
  );

  return { abiertos, alternar, abrir, enfocar };
}

/**
 * Igual que useAmigosAbiertos pero sin tocar el hash (lo usa la pestaña TFT,
 * cuya ruta es siempre "#/tft"). Misma forma: { abiertos, alternar, abrir, enfocar }.
 */
export function useAmigosAbiertosLocal() {
  const [abiertos, setAbiertos] = useState(() => new Set());
  const [enfocar, setEnfocar] = useState(null);

  const abrir = useCallback((slug) => {
    setAbiertos((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
    setEnfocar((prev) => ({ slug, n: (prev?.n ?? 0) + 1 }));
  }, []);

  const alternar = useCallback((slug) => {
    setAbiertos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(slug)) siguiente.delete(slug);
      else siguiente.add(slug);
      return siguiente;
    });
  }, []);

  return { abiertos, alternar, abrir, enfocar };
}
