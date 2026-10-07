import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AHORA, AMIGOS_TOPS, crearDatos, crearDestacados, crearTops, crearTopsGlobal } from "../test/fixtures/lol.js";
import { validarDatos } from "../logica/datos.js";
import { haceCuanto } from "../logica/formato.js";
import { SeccionDestacadosHoy } from "./SeccionDestacadosHoy.jsx";
import { SeccionDestacadosMes } from "./SeccionDestacadosMes.jsx";
import { SeccionDestacadosSemana } from "./SeccionDestacadosSemana.jsx";

const HORA = 3600 * 1000;
const AYUDA_JUGADOR_MEJOR = "Por jugador: la mejor partida de cada uno";
const AYUDA_GLOBAL_MEJOR = "Global: las mejores partidas, aunque se repita un jugador";

function renderSeccion(Seccion, destacados, ahora = AHORA) {
  const datos = validarDatos(crearDatos({ amigos: AMIGOS_TOPS, destacados }));
  return render(<Seccion destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />);
}

const conGlobal = (topsGlobal = crearTopsGlobal()) => crearDestacados({ tops: crearTops(), tops_global: topsGlobal });
const filas = (dialogo) => within(within(dialogo).getByRole("list")).getAllByRole("listitem");
const boton = (dialogo, nombre) => within(dialogo).getByRole("button", { name: nombre });
const grupoVista = (dialogo) => within(dialogo).queryByRole("group", { name: "Vista del top" });

async function abrir(titulo) {
  await userEvent.click(screen.getByRole("button", { name: `Ver top 5: ${titulo}` }));
  return screen.getByRole("dialog", { name: `Top 5 · ${titulo}` });
}

describe("Top 5 global de mejor y peor jugador", () => {
  it("las pestañas van «Global» primero y «Por jugador» después", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal());
    const dialogo = await abrir("Mejor jugador de la semana");
    const botones = within(grupoVista(dialogo)).getAllByRole("button");
    expect(botones.map((b) => b.textContent)).toEqual(["Global", "Por jugador"]);
  });

  it("«Global» va por defecto: muestra las partidas de tops_global con el amigo repetido, su modo y fecha", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal());
    const dialogo = await abrir("Mejor jugador de la semana");
    expect(grupoVista(dialogo)).toBeInTheDocument();
    expect(boton(dialogo, "Global")).toHaveAttribute("aria-pressed", "true");
    expect(boton(dialogo, "Por jugador")).toHaveAttribute("aria-pressed", "false");
    expect(dialogo).toHaveTextContent(AYUDA_GLOBAL_MEJOR);
    expect(dialogo).not.toHaveTextContent(AYUDA_JUGADOR_MEJOR);
    const lista = filas(dialogo);
    expect(lista).toHaveLength(5);
    expect(lista.map((f) => f.textContent.slice(0, 2))).toEqual(["#1", "#2", "#3", "#4", "#5"]);
    expect(within(lista[0]).getByText("Charco")).toBeInTheDocument();
    expect(within(lista[1]).getByText("Charco")).toBeInTheDocument();
    expect(within(lista[1]).getAllByRole("img")[0]).toHaveAccessibleName("Ícono de Charco#LAS");
    expect(lista[0]).toHaveTextContent("Ahri · 15 / 1 / 9");
    expect(lista[0]).toHaveTextContent("Clasificatoria Solo/Dúo");
    expect(within(lista[0]).getByText(haceCuanto(AHORA - 3 * HORA, AHORA))).toBeInTheDocument();
    expect(lista[1]).toHaveTextContent("Akali · 14 / 1 / 8");
    expect(lista[1]).toHaveTextContent("ARAM");
    expect(within(lista[1]).getByText(haceCuanto(AHORA - 5 * HORA, AHORA))).toBeInTheDocument();
    // La #1 va resaltada, el resto no.
    expect(lista[0]).toHaveAttribute("data-primero");
    for (const f of lista.slice(1)) expect(f).not.toHaveAttribute("data-primero");

  });

  it("«Por jugador» muestra los tops, con su ayuda y una fila por amigo", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal());
    const dialogo = await abrir("Mejor jugador de la semana");
    await userEvent.click(boton(dialogo, "Por jugador"));
    expect(boton(dialogo, "Por jugador")).toHaveAttribute("aria-pressed", "true");
    expect(boton(dialogo, "Global")).toHaveAttribute("aria-pressed", "false");
    expect(dialogo).toHaveTextContent(AYUDA_JUGADOR_MEJOR);
    expect(dialogo).not.toHaveTextContent(AYUDA_GLOBAL_MEJOR);
    const lista = filas(dialogo);
    expect(lista).toHaveLength(5);
    ["Charco#LAS", "Sapito#LAS", "Rana Azul#LAS", "Renacuajo#LAS", "Pozo#LAS"].forEach((riotId, i) => {
      expect(within(lista[i]).getAllByRole("img")[0]).toHaveAccessibleName(`Ícono de ${riotId}`);
    });
    expect(lista[0]).toHaveAttribute("data-primero");

    await userEvent.click(boton(dialogo, "Global"));
    expect(dialogo).toHaveTextContent(AYUDA_GLOBAL_MEJOR);
    expect(within(filas(dialogo)[1]).getByText("Charco")).toBeInTheDocument();
  });

  it("en peor jugador la ayuda dice «peor»", async () => {
    renderSeccion(SeccionDestacadosMes, conGlobal());
    const dialogo = await abrir("Peor jugador del mes");
    expect(dialogo).toHaveTextContent("Global: las peores partidas, aunque se repita un jugador");
    expect(within(filas(dialogo)[0]).getByText("Renacuajo")).toBeInTheDocument();
    await userEvent.click(boton(dialogo, "Por jugador"));
    expect(dialogo).toHaveTextContent("Por jugador: la peor partida de cada uno");
  });

  it("al cerrar con Escape el foco vuelve a la tarjeta y al reabrir vuelve a «Global»", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal());
    let dialogo = await abrir("Mejor jugador de la semana");
    await userEvent.click(boton(dialogo, "Por jugador"));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver top 5: Mejor jugador de la semana" })).toHaveFocus();
    dialogo = await abrir("Mejor jugador de la semana");
    expect(boton(dialogo, "Global")).toHaveAttribute("aria-pressed", "true");
  });

  it("las tarjetas de récord no tienen pestañas", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal());
    for (const titulo of ["Más partidas", "Mejor winrate"]) {
      const dialogo = await abrir(titulo);
      expect(grupoVista(dialogo)).toBeNull();
      expect(dialogo).not.toHaveTextContent("Por jugador");
      await userEvent.keyboard("{Escape}");
    }
  });

  it("el balance de hoy no tiene pestañas y el mejor jugador de hoy sí", async () => {
    renderSeccion(SeccionDestacadosHoy, conGlobal());
    let dialogo = await abrir("Balance del grupo hoy");
    expect(grupoVista(dialogo)).toBeNull();
    await userEvent.keyboard("{Escape}");
    dialogo = await abrir("Mejor jugador de la partida - Hoy");
    expect(grupoVista(dialogo)).toBeInTheDocument();
  });

  it("sin tops_global (archivos viejos) no hay pestañas", async () => {
    renderSeccion(SeccionDestacadosSemana, crearDestacados({ tops: crearTops() }));
    const dialogo = await abrir("Mejor jugador de la semana");
    expect(grupoVista(dialogo)).toBeNull();
    expect(dialogo).not.toHaveTextContent("Por jugador");
    expect(filas(dialogo)).toHaveLength(5);
  });

  it("con la lista global vacía para esa clave no hay pestañas", async () => {
    renderSeccion(SeccionDestacadosSemana, conGlobal(crearTopsGlobal({ peor_jugador_semana: [] })));
    const dialogo = await abrir("Peor jugador de la semana");
    expect(grupoVista(dialogo)).toBeNull();
  });
});
