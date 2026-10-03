import { useState } from "react";
import { iniciales } from "../logica/formato.js";

/**
 * Imagen de Data Dragon con respaldo local.
 * Si no hay URL o la imagen falla, muestra las iniciales con el mismo texto alternativo.
 * `respaldo` es el texto del que salen las iniciales cuando no conviene usar `alt`
 * (por ejemplo, alt "Ícono de Croac#LAS" y respaldo "Croac#LAS" -> "C").
 */
export function ImagenDD({ src, alt, respaldo, tamaño = 32, redonda = false, className = "" }) {
  const [srcFallido, setSrcFallido] = useState(null);
  const forma = redonda ? "rounded-full" : "rounded-md";
  const estilo = { width: tamaño, height: tamaño };

  if (!src || srcFallido === src) {
    return (
      <span
        role="img"
        aria-label={alt}
        title={alt}
        style={{ ...estilo, fontSize: Math.max(9, Math.round(tamaño * 0.36)) }}
        className={`inline-flex shrink-0 items-center justify-center bg-superficie-alta font-semibold text-texto-suave ${forma} ${className}`}
      >
        {iniciales(respaldo ?? alt)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      width={tamaño}
      height={tamaño}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setSrcFallido(src)}
      style={estilo}
      className={`inline-block shrink-0 bg-superficie-alta object-cover ${forma} ${className}`}
    />
  );
}
