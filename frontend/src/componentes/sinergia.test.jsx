import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { TablaSinergia } from "./TablaSinergia.jsx";
import { crearDatos, ddragon } from "../test/fixtures/lol.js";

// Datos INVENTADOS: un cuarto amigo y la sinergia de Rana Azul.
const renacuajo = {
  riot_id: "Renacuajo#LAS",
  nombre: "Renacuajo",
  tag: "LAS",
  slug: "renacuajo-las",
  estado: "ok",
  error: null,
  perfil: { icono: 11, nivel: 40 },
  rangos: { solo: { tier: "EMERALD", division: "II", lp: 12, victorias: 20, derrotas: 18 }, flex: null },
  jugando: null,
  estadisticas: null,
  partidas: [],
};

const SINERGIA = {
  "rana-azul-las": [
    { amigo: "sapito-las", partidas: 12, victorias: 5, derrotas: 7, winrate: 41.7 },
    { amigo: "renacuajo-las", partidas: 8, victorias: 6, derrotas: 2, winrate: 75 },
    { amigo: "charco-las", partidas: 3, victorias: 2, derrotas: 1, winrate: null },
    { amigo: "desconocido-las", partidas: 99, victorias: 50, derrotas: 49, winrate: 50.5 },
  ],
  "sapito-las": [],
};

function datosConSinergia(cambios = {}) {
  const base = crearDatos();
  return crearDatos({ amigos: [...base.amigos, renacuajo], sinergia: SINERGIA, ...cambios });
}

function respuestaOk(json) {
  return Promise.resolve({ ok: true, json: async () => json });
}

async function abrirApp(json) {
  render(<App fetchFn={() => respuestaOk(json)} />);
  await screen.findByRole("heading", { name: "Amigos" });
  return screen.getByRole("region", { name: "Ranking" });
}

const nombresFilas = (tabla) =>
  within(tabla)
    .getAllByRole("rowheader")
    .map((celda) => celda.querySelector(".truncate").textContent);

describe("TablaSinergia", () => {
  const filas = SINERGIA["rana-azul-las"]
    .slice(0, 2)
    .concat([{ amigo: "charco-las", partidas: 3, victorias: 2, derrotas: 1, winrate: 66.7 }]);
  const amigos = datosConSinergia().amigos;

  it("muestra compañero, rango, jugadas y tasa, por jugadas descendente", () => {
    render(<TablaSinergia filas={filas} amigos={amigos} ddragon={ddragon} etiqueta="Compañeros" />);
    const tabla = screen.getByRole("table", { name: "Compañeros" });
    expect(nombresFilas(tabla)).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
    expect(screen.getByRole("columnheader", { name: /Jugadas/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Tasa de victorias/ })).toHaveAttribute("aria-sort", "none");

    const sapito = screen.getByRole("row", { name: /Sapito#LAS/ });
    expect(within(sapito).getByText("Sin clasificar")).toBeInTheDocument();
    expect(within(sapito).getByText("12")).toBeInTheDocument();
    expect(within(sapito).getByText(/41,7/)).toBeInTheDocument();
    const renac = screen.getByRole("row", { name: /Renacuajo#LAS/ });
    expect(within(renac).getByText("Esmeralda II")).toBeInTheDocument();
    expect(within(renac).getByAltText("Ícono de Renacuajo#LAS")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/profileicon/11.png",
    );
  });

  it("pinta la barra de tasa en verde desde 50 % y en rojo bajo 50 %, y jugadas proporcional", () => {
    render(<TablaSinergia filas={filas} amigos={amigos} ddragon={ddragon} />);
    const barras = (nombre) => screen.getByRole("row", { name: new RegExp(nombre) }).querySelectorAll("[data-barra]");
    const [jugadasSapito, tasaSapito] = barras("Sapito");
    const [jugadasRenac, tasaRenac] = barras("Renacuajo");
    expect(tasaSapito).toHaveClass("bg-derrota");
    expect(tasaRenac).toHaveClass("bg-victoria");
    expect(tasaRenac.style.width).toBe("75%");
    expect(jugadasSapito).toHaveClass("bg-ranked");
    expect(jugadasSapito.style.width).toBe("100%");
    expect(parseFloat(jugadasRenac.style.width)).toBeCloseTo((8 / 12) * 100, 3);
  });

  it("ordena por tasa de victorias y vuelve", async () => {
    render(<TablaSinergia filas={filas} amigos={amigos} ddragon={ddragon} />);
    const tabla = screen.getByRole("table");
    const tasa = screen.getByRole("button", { name: /Tasa de victorias/ });

    await userEvent.click(tasa);
    expect(nombresFilas(tabla)).toEqual(["Renacuajo#LAS", "Charco#LAS", "Sapito#LAS"]);
    expect(screen.getByRole("columnheader", { name: /Tasa/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Jugadas/ })).toHaveAttribute("aria-sort", "none");

    await userEvent.click(tasa);
    expect(nombresFilas(tabla)).toEqual(["Sapito#LAS", "Charco#LAS", "Renacuajo#LAS"]);
    expect(screen.getByRole("columnheader", { name: /Tasa/ })).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(screen.getByRole("button", { name: /Jugadas/ }));
    expect(nombresFilas(tabla)).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
  });

  it("muestra el estado vacío", () => {
    render(<TablaSinergia filas={[]} amigos={amigos} ddragon={ddragon} />);
    expect(screen.getByText("Todavía no hay partidas en equipo registradas con el grupo.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("Modal de sinergia desde el Ranking", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("el clic en el nombre abre el modal con título, nota y filas válidas", async () => {
    const ranking = await abrirApp(datosConSinergia());
    const enlace = within(ranking).getByRole("link", { name: /Rana Azul#LAS/ });
    await userEvent.click(enlace);

    const dialogo = screen.getByRole("dialog", { name: "Con quién gana más · Rana Azul#LAS" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveFocus();
    expect(document.documentElement).toHaveClass("overflow-hidden");
    expect(within(dialogo).getByText("Partidas en el mismo equipo · Normal y Ranked · todo lo registrado")).toBeInTheDocument();
    // El desconocido se descartó y el winrate null de Charco se calculó.
    expect(nombresFilas(within(dialogo).getByRole("table"))).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
    expect(within(dialogo).getByText(/66,7/)).toBeInTheDocument();
    // No cambia el hash ni abre el acordeón.
    expect(window.location.hash).toBe("#/");
    expect(screen.getByRole("button", { name: "Rana Azul#LAS" })).toHaveAttribute("aria-expanded", "false");
  });

  it("muestra el vacío si el amigo no tiene compañeros", async () => {
    const ranking = await abrirApp(datosConSinergia());
    await userEvent.click(within(ranking).getByRole("link", { name: /Sapito#LAS/ }));
    const dialogo = screen.getByRole("dialog", { name: /Sapito#LAS/ });
    expect(within(dialogo).getByText("Todavía no hay partidas en equipo registradas con el grupo.")).toBeInTheDocument();
  });

  it.each([
    ["con ✕", () => userEvent.click(screen.getByRole("button", { name: "Cerrar" }))],
    ["con Esc", () => userEvent.keyboard("{Escape}")],
    ["con clic fuera", () => userEvent.click(document.querySelector("[data-fondo-dialogo]"))],
  ])("se cierra %s y el foco vuelve al nombre", async (_nombre, cerrar) => {
    const ranking = await abrirApp(datosConSinergia());
    const enlace = within(ranking).getByRole("link", { name: /Rana Azul#LAS/ });
    await userEvent.click(enlace);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await cerrar();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(enlace).toHaveFocus();
    expect(document.documentElement).not.toHaveClass("overflow-hidden");
  });

  it("un clic dentro del modal no lo cierra", async () => {
    const ranking = await abrirApp(datosConSinergia());
    await userEvent.click(within(ranking).getByRole("link", { name: /Rana Azul#LAS/ }));
    await userEvent.click(screen.getByText(/Partidas en el mismo equipo/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("atrapa el foco con Tab y Shift+Tab", async () => {
    const ranking = await abrirApp(datosConSinergia());
    await userEvent.click(within(ranking).getByRole("link", { name: /Rana Azul#LAS/ }));
    const cerrar = screen.getByRole("button", { name: "Cerrar" });
    const ver = screen.getByRole("button", { name: "Ver sus últimas partidas" });

    await userEvent.tab();
    expect(cerrar).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(ver).toHaveFocus();
    await userEvent.tab();
    expect(cerrar).toHaveFocus();
  });

  it("«Ver sus últimas partidas» cierra el modal y abre el acordeón del amigo", async () => {
    const ranking = await abrirApp(datosConSinergia());
    await userEvent.click(within(ranking).getByRole("link", { name: /Rana Azul#LAS/ }));
    await userEvent.click(screen.getByRole("button", { name: "Ver sus últimas partidas" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Rana Azul#LAS" });
    await waitFor(() => expect(boton).toHaveAttribute("aria-expanded", "true"));
    expect(boton).toHaveFocus();
    expect(window.location.hash).toBe("#/amigo/rana-azul-las");
  });

  it("sin sinergia en el JSON, el clic abre las partidas como antes", async () => {
    const ranking = await abrirApp(crearDatos());
    await userEvent.click(within(ranking).getByRole("link", { name: /Sapito#LAS/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sapito#LAS" })).toHaveAttribute("aria-expanded", "true"),
    );
  });
});
