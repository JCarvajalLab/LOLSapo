import { ImagenDD } from "./ImagenDD.jsx";

/**
 * Ícono redondo con el anillo "saco vocal" cuando la persona está en partida.
 * El anillo es decorativo: el estado "En partida" siempre se dice también con texto.
 */
export function IconoConSaco({ src, alt, tamaño = 40, enPartida = false }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full ${enPartida ? "saco-vocal" : ""}`}
      data-en-partida={enPartida ? "true" : undefined}
    >
      <ImagenDD src={src} alt={alt} tamaño={tamaño} redonda />
    </span>
  );
}
