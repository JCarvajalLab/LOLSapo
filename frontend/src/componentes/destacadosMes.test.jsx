import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AHORA, crearDatos, crearDestacados, ddragon } from "../test/fixtures/lol.js";
import { validarDatos } from "../logica/datos.js";
import { CLAVES_MES } from "../logica/destacados.js";
import { haceCuanto } from "../logica/formato.js";
import { SeccionDestacadosMes } from "./SeccionDestacadosMes.jsx";

const DIA = 24 * 3600 * 1000;
const MES = crearDestacados().mes;

function renderMes(destacados, ahora = AHORA) {
  const datos = validarDatos(crearDatos({ destacados }));
  return render(
    <SeccionDestacadosMes destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />,
  );
}

const tarjeta = (titulo) => screen.getByRole("article", { name: titulo });
const TITULO = "Destacados de octubre";
const TITULO_CERRADO = "Destacados de octubre (cerrado)";
const NOTA = "Partidas en equipo (2 o más del grupo) de Normal y Ranked del mes · Se actualiza hasta fin de mes";
const NOTA_CERRADO =
  "Partidas en equipo (2 o más del grupo) de Normal y Ranked del mes · Mes cerrado; el actual aparece desde el día 4";
const VACIO = "No existen partidas registradas en equipo este mes";
const TITULOS = ["Mejor jugador del mes", "Balance del grupo del mes", "Peor jugador del mes"];

/** Una tarjeta del mes vacía: título y el mensaje, sin nombres ni imágenes. */
function esperarVacio(titulo) {
  const t = tarjeta(titulo);
  expect(t).toHaveTextContent(new RegExp(`^${titulo}${VACIO}$`));
  expect(within(t).queryByRole("img")).toBeNull();
}

describe("Destacados del mes", () => {
  it("título con el nombre del mes y nota de mes abierto", () => {
    renderMes(crearDestacados());
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(new RegExp(`^${TITULO}$`));
    expect(screen.getByRole("region", { name: TITULO })).toHaveAccessibleDescription(NOTA);
  });

  it("mes cerrado: título con «(cerrado)» y nota del día 4", () => {
    renderMes(crearDestacados({ mes: { ...MES, cerrado: true } }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(new RegExp(`^${TITULO_CERRADO.replace(/[()]/g, "\\$&")}$`));
    expect(screen.getByRole("region", { name: TITULO_CERRADO })).toHaveAccessibleDescription(NOTA_CERRADO);
  });

  it("lol.json viejo: desde mes.hasta se ve cerrado aunque cerrado venga en false", () => {
    const r = renderMes(crearDestacados(), MES.hasta - 1);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(new RegExp(`^${TITULO}$`));
    r.unmount();
    renderMes(crearDestacados(), MES.hasta);
    expect(screen.getByRole("heading", { level: 2, name: TITULO_CERRADO })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: TITULO_CERRADO })).toHaveAccessibleDescription(NOTA_CERRADO);
    expect(tarjeta("Mejor jugador del mes")).toHaveTextContent("Caitlyn");
  });

  it("usa el nombre del mes que manda el recolector", () => {
    renderMes(crearDestacados({ mes: { ...MES, mes: 9, nombre: "septiembre", cerrado: true } }));
    expect(screen.getByRole("heading", { name: "Destacados de septiembre (cerrado)" })).toBeInTheDocument();
  });

  it("las 3 tarjetas en una fila: mejor jugador, balance al centro y peor jugador", () => {
    renderMes(crearDestacados());
    const region = screen.getByRole("region", { name: TITULO });
    expect(within(region).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(TITULOS);
    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    expect(within(region).getByRole("list")).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3");
    expect(tarjeta("Balance del grupo del mes").closest("li")).toHaveClass(
      "sm:order-last",
      "sm:col-span-2",
      "lg:order-none",
      "lg:col-span-1",
    );
    expect(tarjeta("Mejor jugador del mes").closest("li")).not.toHaveClass("sm:order-last");
  });

  it("mejor jugador del mes: campeón, K/D/A, KDA, daño en color del resultado, modo, fecha y victoria", () => {
    renderMes(crearDestacados());
    const m = tarjeta("Mejor jugador del mes");
    expect(within(m).getByText("Rana Azul")).toBeInTheDocument();
    expect(m).toHaveTextContent("Caitlyn · 18 / 2 / 6");
    expect(within(m).getByText("KDA 12")).toHaveClass("text-victoria");
    expect(within(m).getByText("Daño: 52.300")).toHaveClass("text-victoria");
    expect(m).toHaveTextContent("Clasificatoria Flex");
    expect(within(m).getByText(haceCuanto(AHORA - 6 * 3600 * 1000, AHORA))).toBeInTheDocument();
    expect(within(m).getByText("Victoria")).toBeInTheDocument();
    expect(within(m).getByAltText("Caitlyn")).toHaveAttribute(
      "src",
      `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/Caitlyn.png`,
    );
  });

  it("peor jugador del mes: KDA en color derrota, daño en color del resultado y derrota", () => {
    renderMes(crearDestacados());
    const p = tarjeta("Peor jugador del mes");
    expect(within(p).getByText("Charco")).toBeInTheDocument();
    expect(p).toHaveTextContent("Malphite · 0 / 11 / 3");
    expect(within(p).getByText("KDA 0,27")).toHaveClass("text-derrota");
    expect(within(p).getByText("Daño: 3.900")).toHaveClass("text-derrota");
    expect(p).toHaveTextContent("Normal (Reclutamiento)");
    expect(within(p).getByText("Derrota")).toBeInTheDocument();
  });

  it("el daño sigue el resultado de la partida, no la tarjeta", () => {
    renderMes(
      crearDestacados({
        mejor_jugador_mes: { ...crearDestacados().mejor_jugador_mes, resultado: "derrota" },
      }),
    );
    const m = tarjeta("Mejor jugador del mes");
    expect(within(m).getByText("KDA 12")).toHaveClass("text-victoria");
    expect(within(m).getByText("Daño: 52.300")).toHaveClass("text-derrota");
    expect(within(m).getByText("Derrota")).toBeInTheDocument();
  });

  it("partidas de hace días muestran la fecha relativa en una sola línea", () => {
    const ahora = AHORA + 12 * DIA;
    renderMes(crearDestacados(), ahora);
    const texto = haceCuanto(AHORA - 6 * 3600 * 1000, ahora);
    expect(texto).not.toBe("—");
    const fecha = within(tarjeta("Mejor jugador del mes")).getByText(texto);
    expect(fecha.tagName).toBe("TIME");
    expect(fecha).toHaveClass("whitespace-nowrap");
    expect(fecha).toHaveAttribute("dateTime", new Date(AHORA - 6 * 3600 * 1000).toISOString());
  });

  it("balance del mes: V–D, %, partidas y nombres completos con «(N partidas)» para quien jugó menos", () => {
    renderMes(crearDestacados());
    const b = tarjeta("Balance del grupo del mes");
    expect(within(b).getByText("15 V")).toHaveClass("text-victoria");
    expect(within(b).getByText("13 D")).toHaveClass("text-derrota");
    expect(b).toHaveTextContent("15 victorias y 13 derrotas");
    expect(b).toHaveTextContent(/53,6\s%/);
    expect(b).toHaveTextContent("28 partidas en grupo");
    const nombres = b.querySelector("[data-jugadores]");
    expect(nombres).toHaveTextContent("Sapito · Rana Azul (25 partidas) · Charco (9 partidas)");
    expect(within(b).getAllByRole("img")).toHaveLength(3);
  });

  it("vacío: las 3 tarjetas dicen que no hay partidas en equipo este mes", () => {
    renderMes(crearDestacados(Object.fromEntries(CLAVES_MES.map((c) => [c, null]))));
    for (const titulo of TITULOS) esperarVacio(titulo);
    expect(screen.queryByText(/Se reinicia/)).toBeNull();
  });

  it("solo una tarjeta vacía no afecta a las otras", () => {
    renderMes(crearDestacados({ peor_jugador_mes: null }));
    esperarVacio("Peor jugador del mes");
    expect(tarjeta("Mejor jugador del mes")).toHaveTextContent("Caitlyn");
    expect(within(tarjeta("Balance del grupo del mes")).getByText("15 V")).toBeInTheDocument();
  });

  it("sin destacados, sin mes o con mes inválido no muestra la sección", () => {
    const { container, unmount } = renderMes(undefined);
    expect(container).toBeEmptyDOMElement();
    unmount();
    for (const mes of [undefined, null, { ...MES, nombre: "noviembre" }, { ...MES, mes: 13 }, { ...MES, cerrado: "no" }]) {
      const r = renderMes(crearDestacados({ mes }));
      expect(r.container).toBeEmptyDOMElement();
      r.unmount();
    }
  });

  it("vencido (3 días o más después del fin del mes): las 3 tarjetas quedan vacías", () => {
    renderMes(crearDestacados(), MES.hasta + 3 * DIA);
    expect(screen.getByRole("heading", { name: TITULO_CERRADO })).toBeInTheDocument();
    for (const titulo of TITULOS) esperarVacio(titulo);
    expect(screen.queryByText("Charco")).toBeNull();
  });

  it("justo antes del vencimiento se mantienen las tarjetas", () => {
    renderMes(crearDestacados({ mes: { ...MES, cerrado: true } }), MES.hasta + 3 * DIA - 1);
    expect(tarjeta("Mejor jugador del mes")).toHaveTextContent("Caitlyn");
    expect(screen.queryByText(VACIO)).toBeNull();
  });

  it("no depende del día ni de la semana: con ambos vencidos el mes se mantiene", () => {
    renderMes(crearDestacados({ hoy_desde: AHORA - 30 * 3600 * 1000, semana_desde: AHORA - 9 * DIA }));
    expect(tarjeta("Peor jugador del mes")).toHaveTextContent("Malphite");
    expect(within(tarjeta("Balance del grupo del mes")).getByText("13 D")).toBeInTheDocument();
  });
});
