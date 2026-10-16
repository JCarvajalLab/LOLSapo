// Parsea el marcado de Riot Data Dragon (ej. <stats>, <attention>, <passive>, <br>)
// a elementos seguros de React sin usar dangerouslySetInnerHTML.
import React from "react";

function decodificarEntidades(str) {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/**
 * Convierte el texto con pseudo-etiquetas de Riot Games en un árbol seguro de React.
 */
export function formatearDescripcionLol(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;

  // Dividir por etiquetas HTML / pseudo-tags de Riot
  const tokens = texto.split(/(<[^>]+>)/g);
  const elementos = [];
  const pilaEstilos = [];

  tokens.forEach((token, index) => {
    if (!token) return;

    if (token.startsWith("<") && token.endsWith(">")) {
      const tagLower = token.toLowerCase();

      if (tagLower === "<br>" || tagLower === "<br/>" || tagLower === "<br />") {
        elementos.push(React.createElement("br", { key: `br-${index}` }));
        return;
      }

      const esCierre = token.startsWith("</");
      const tagNombre = token.replace(/[^a-zA-Z]/g, "").toLowerCase();

      if (esCierre) {
        if (pilaEstilos.length > 0) pilaEstilos.pop();
      } else {
        let clase = "";
        switch (tagNombre) {
          case "attention":
          case "scalead":
          case "scaleap":
          case "scalearmor":
          case "scalemr":
            clase = "font-medium text-dorado";
            break;
          case "passive":
            clase = "font-semibold text-victoria block mt-2 mb-0.5";
            break;
          case "active":
            clase = "font-semibold text-azul block mt-2 mb-0.5";
            break;
          case "rules":
          case "flavor":
            clase = "text-texto-suave text-[11px] italic block mt-1";
            break;
          case "stats":
            clase = "text-texto block my-1 font-medium leading-relaxed";
            break;
          case "speed":
          case "healing":
          case "shield":
            clase = "font-medium text-esmeralda";
            break;
          default:
            clase = "";
        }
        pilaEstilos.push(clase);
      }
      return;
    }

    // Texto plano
    const textoLimpio = decodificarEntidades(token);
    const claseActual = pilaEstilos.filter(Boolean).join(" ");

    if (claseActual) {
      elementos.push(
        React.createElement("span", { key: `t-${index}`, className: claseActual }, textoLimpio)
      );
    } else {
      elementos.push(textoLimpio);
    }
  });

  return elementos;
}
