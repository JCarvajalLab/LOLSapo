// Parsea el marcado de Riot Data Dragon (ej. <stats>, <attention>, <passive>, <br>)
// a elementos seguros de React sin usar dangerouslySetInnerHTML ni violar CSP.
import React from "react";

const ENTIDADES_HTML = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&amp;": "&",
};

function decodificarEntidades(str) {
  return str.replace(
    /&(?:nbsp|amp|lt|gt|quot|#39|apos);/g,
    (match) => ENTIDADES_HTML[match] ?? match,
  );
}

/**
 * Convierte el texto con pseudo-etiquetas de Riot Games en un árbol seguro de React.
 */
export function formatearDescripcionLol(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;

  // Normalizar marcas envolventes y dobles saltos de línea a separadores de párrafo limpios
  const limpio = texto
    .replace(/<\/?mainText>/gi, "")
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "<paragraph_break/>");

  const tokens = limpio.split(/(<[^>]+>)/g);
  const elementos = [];
  let enStats = false;
  let ultimoTag = "";

  tokens.forEach((token, index) => {
    if (!token) return;

    if (token.startsWith("<") && token.endsWith(">")) {
      const tagLower = token.toLowerCase();

      if (tagLower === "<paragraph_break/>") {
        elementos.push(
          React.createElement("div", { key: `pb-${index}`, className: "h-2" })
        );
        return;
      }

      if (tagLower === "<br>" || tagLower === "<br/>" || tagLower === "<br />") {
        if (ultimoTag !== "passive" && ultimoTag !== "active") {
          elementos.push(React.createElement("br", { key: `br-${index}` }));
        }
        return;
      }

      const esCierre = token.startsWith("</");
      const tagNombre = token.replace(/[^a-zA-Z]/g, "").toLowerCase();

      if (tagNombre === "stats") {
        enStats = !esCierre;
        if (esCierre) {
          elementos.push(
            React.createElement("div", { key: `stats-end-${index}`, className: "mb-2" })
          );
        }
        return;
      }

      ultimoTag = esCierre ? "" : tagNombre;
      return;
    }

    // Texto plano
    const textoLimpio = decodificarEntidades(token);
    if (!textoLimpio) return;

    if (enStats) {
      // Valor del stat (attention o escalas) en dorado e inline
      if (
        ultimoTag === "attention" ||
        ultimoTag === "scalead" ||
        ultimoTag === "scaleap" ||
        ultimoTag === "scalearmor" ||
        ultimoTag === "scalemr"
      ) {
        elementos.push(
          React.createElement(
            "span",
            { key: `stat-val-${index}`, className: "font-bold text-dorado text-xs" },
            textoLimpio
          )
        );
        return;
      }

      // Nombre de la estadística en línea con el número
      elementos.push(
        React.createElement(
          "span",
          { key: `stat-lbl-${index}`, className: "font-semibold text-texto text-xs" },
          textoLimpio.toLowerCase()
        )
      );
      return;
    }

    if (ultimoTag === "passive") {
      elementos.push(
        React.createElement(
          "span",
          {
            key: `pass-title-${index}`,
            className: "block font-bold text-victoria text-xs mt-2.5 mb-0.5",
          },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "active") {
      elementos.push(
        React.createElement(
          "span",
          {
            key: `act-title-${index}`,
            className: "block font-bold text-dorado text-xs mt-2.5 mb-0.5",
          },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "magicdamage") {
      elementos.push(
        React.createElement(
          "span",
          { key: `md-${index}`, className: "text-ranked font-medium" },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "physicaldamage") {
      elementos.push(
        React.createElement(
          "span",
          { key: `pd-${index}`, className: "text-derrota font-medium" },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "truedamage") {
      elementos.push(
        React.createElement(
          "span",
          { key: `td-${index}`, className: "text-texto font-medium" },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "rules" || ultimoTag === "flavor") {
      elementos.push(
        React.createElement(
          "span",
          { key: `rf-${index}`, className: "text-texto-suave text-[11px] italic block mt-1" },
          textoLimpio
        )
      );
      return;
    }

    if (ultimoTag === "attention") {
      elementos.push(
        React.createElement(
          "span",
          { key: `att-${index}`, className: "font-semibold text-dorado" },
          textoLimpio
        )
      );
      return;
    }

    // Texto general de descripción o cuerpo
    elementos.push(
      React.createElement(
        "span",
        { key: `txt-${index}`, className: "text-texto-suave text-xs leading-relaxed" },
        textoLimpio
      )
    );
  });

  return elementos;
}
