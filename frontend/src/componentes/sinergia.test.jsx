import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { TablaSinergia } from "./TablaSinergia.jsx";
import { crearDatos, crearSinergia, ddragon, renacuajo } from "../test/fixtures/lol.js";

// Datos INVENTADOS: un cuarto amigo (Renacuajo) y la sinergia de Rana Azul en dos períodos.
const SINERGIA = crearSinergia();

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
  const filas = SINERGIA.todo["rana-azul-las"]
    .slice(0, 2)
    .concat([{ amigo: "charco-las", partidas: 3, victorias: 2, derrotas: 1, winrate: 66.7 }]);
  const amigos = datosConSinergia().amigos;
  const companeros = ["sapito-las", "charco-las", "renacuajo-las"];

  it("muestra compañero, rango, jugadas y tasa, por jugadas descendente", () => {
    render(
      <TablaSinergia filas={filas} companeros={companeros} amigos={amigos} ddragon={ddragon} etiqueta="Compañeros" />,
    );
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
    render(<TablaSinergia filas={filas} companeros={companeros} amigos={amigos} ddragon={ddragon} />);
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
    render(<TablaSinergia filas={filas} companeros={companeros} amigos={amigos} ddragon={ddragon} />);
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

  it("sin filas muestra a todos los compañeros con el mensaje, sin barras y con su rango", () => {
    render(
      <TablaSinergia
        filas={[]}
        companeros={companeros}
        amigos={amigos}
        ddragon={ddragon}
        textoSinPartidas="Todavía no han jugado juntos"
      />,
    );
    const tabla = screen.getByRole("table");
    expect(nombresFilas(tabla)).toEqual(["Sapito#LAS", "Charco#LAS", "Renacuajo#LAS"]);
    expect(within(tabla).getAllByText("Todavía no han jugado juntos")).toHaveLength(3);
    expect(tabla.querySelectorAll("[data-barra]")).toHaveLength(0);
    const renac = screen.getByRole("row", { name: /Renacuajo/ });
    expect(within(renac).getByText("Esmeralda II")).toBeInTheDocument();
    expect(within(renac).getByAltText("Ícono de Renacuajo#LAS")).toBeInTheDocument();
  });

  it("los compañeros sin partidas van al final con cualquier orden", async () => {
    render(
      <TablaSinergia
        filas={filas.slice(1, 2)}
        companeros={companeros}
        amigos={amigos}
        ddragon={ddragon}
        textoSinPartidas="Nada"
      />,
    );
    const tabla = screen.getByRole("table");
    expect(nombresFilas(tabla)).toEqual(["Renacuajo#LAS", "Sapito#LAS", "Charco#LAS"]);
    const tasa = screen.getByRole("button", { name: /Tasa de victorias/ });
    await userEvent.click(tasa);
    await userEvent.click(tasa);
    expect(screen.getByRole("columnheader", { name: /Tasa/ })).toHaveAttribute("aria-sort", "ascending");
    expect(nombresFilas(tabla)).toEqual(["Renacuajo#LAS", "Sapito#LAS", "Charco#LAS"]);
    expect(within(screen.getByRole("row", { name: /Renacuajo/ })).queryByText("Nada")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío si no hay otros amigos en el grupo", () => {
    render(<TablaSinergia filas={[]} companeros={[]} amigos={amigos} ddragon={ddragon} />);
    expect(screen.getByText("No hay otros amigos en el grupo.")).toBeInTheDocument();
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

  const NOTA_30 = "Partidas en el mismo equipo · Normal y Ranked · últimos 30 días";
  const NOTA_TODO = "Partidas en el mismo equipo · Normal y Ranked · todo lo registrado";

  async function abrirModal(json, nombre = /Rana Azul#LAS/) {
    const ranking = await abrirApp(json);
    await userEvent.click(within(ranking).getByRole("link", { name: nombre }));
    return screen.getByRole("dialog");
  }
  const botonPeriodo = (dialogo, nombre) => within(dialogo).getByRole("button", { name: nombre });
  const filasDe = (dialogo) => nombresFilas(within(dialogo).getByRole("table"));

  it("el clic en el nombre abre el modal en «Últimos 30 días» con todos los compañeros", async () => {
    const ranking = await abrirApp(datosConSinergia());
    const enlace = within(ranking).getByRole("link", { name: /Rana Azul#LAS/ });
    await userEvent.click(enlace);

    const dialogo = screen.getByRole("dialog", { name: "Con quién gana más · Rana Azul#LAS" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveFocus();
    expect(document.documentElement).toHaveClass("overflow-hidden");
    expect(within(dialogo).getByRole("group", { name: "Período" })).toBeInTheDocument();
    expect(botonPeriodo(dialogo, "Últimos 30 días")).toHaveAttribute("aria-pressed", "true");
    expect(botonPeriodo(dialogo, "Todo lo registrado")).toHaveAttribute("aria-pressed", "false");
    expect(within(dialogo).getByText(NOTA_30)).toBeInTheDocument();
    // Charco no jugó con Rana en 30 días: aparece al final, sin barras, con el mensaje en texto suave.
    expect(filasDe(dialogo)).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
    const charco = within(dialogo).getByRole("row", { name: /Charco#LAS/ });
    expect(within(charco).getByText("No han jugado juntos en los últimos 30 días")).toHaveClass("text-texto-suave");
    expect(charco.querySelectorAll("[data-barra]")).toHaveLength(0);
    expect(within(dialogo).getByText(/33,3/)).toBeInTheDocument();
    // No cambia el hash ni abre el acordeón.
    expect(window.location.hash).toBe("#/");
    expect(screen.getByRole("button", { name: "Rana Azul#LAS" })).toHaveAttribute("aria-expanded", "false");
  });

  it("«Todo lo registrado» cambia las filas y la nota, y descarta desconocidos", async () => {
    const dialogo = await abrirModal(datosConSinergia());
    await userEvent.click(botonPeriodo(dialogo, "Todo lo registrado"));

    expect(botonPeriodo(dialogo, "Todo lo registrado")).toHaveAttribute("aria-pressed", "true");
    expect(botonPeriodo(dialogo, "Últimos 30 días")).toHaveAttribute("aria-pressed", "false");
    expect(within(dialogo).getByText(NOTA_TODO)).toBeInTheDocument();
    expect(within(dialogo).queryByText(NOTA_30)).not.toBeInTheDocument();
    // El desconocido se descartó y el winrate null de Charco se calculó.
    expect(filasDe(dialogo)).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
    expect(within(dialogo).getByText(/66,7/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/41,7/)).toBeInTheDocument();
    expect(within(dialogo).queryByText(/33,3/)).not.toBeInTheDocument();
    expect(within(dialogo).queryByText(/No han jugado juntos/)).not.toBeInTheDocument();
  });

  it("el orden por Tasa se mantiene al cambiar de período", async () => {
    const dialogo = await abrirModal(datosConSinergia());
    await userEvent.click(within(dialogo).getByRole("button", { name: /Tasa de victorias/ }));
    expect(filasDe(dialogo)).toEqual(["Renacuajo#LAS", "Sapito#LAS", "Charco#LAS"]);

    await userEvent.click(botonPeriodo(dialogo, "Todo lo registrado"));
    expect(within(dialogo).getByRole("columnheader", { name: /Tasa/ })).toHaveAttribute("aria-sort", "descending");
    expect(filasDe(dialogo)).toEqual(["Renacuajo#LAS", "Charco#LAS", "Sapito#LAS"]);

    await userEvent.click(botonPeriodo(dialogo, "Últimos 30 días"));
    expect(within(dialogo).getByRole("columnheader", { name: /Tasa/ })).toHaveAttribute("aria-sort", "descending");
    expect(filasDe(dialogo)).toEqual(["Renacuajo#LAS", "Sapito#LAS", "Charco#LAS"]);
  });

  it("si el amigo no jugó con nadie, lista a todos con el mensaje de cada período", async () => {
    const dialogo = await abrirModal(datosConSinergia(), /Sapito#LAS/);
    expect(filasDe(dialogo)).toEqual(["Rana Azul#LAS", "Charco#LAS", "Renacuajo#LAS"]);
    expect(within(dialogo).getAllByText("No han jugado juntos en los últimos 30 días")).toHaveLength(3);

    await userEvent.click(botonPeriodo(dialogo, "Todo lo registrado"));
    expect(filasDe(dialogo)).toEqual(["Rana Azul#LAS", "Charco#LAS", "Renacuajo#LAS"]);
    expect(within(dialogo).getAllByText("Todavía no han jugado juntos")).toHaveLength(3);
  });

  it("formato viejo: lo toma como «Todo lo registrado» y avisa que 30 días no tiene datos", async () => {
    const dialogo = await abrirModal(datosConSinergia({ sinergia: SINERGIA.todo }));
    expect(botonPeriodo(dialogo, "Últimos 30 días")).toHaveAttribute("aria-pressed", "true");
    expect(within(dialogo).getByText(NOTA_30)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Sin datos para este período/)).toBeInTheDocument();
    expect(within(dialogo).queryByRole("table")).not.toBeInTheDocument();

    await userEvent.click(botonPeriodo(dialogo, "Todo lo registrado"));
    expect(filasDe(dialogo)).toEqual(["Sapito#LAS", "Renacuajo#LAS", "Charco#LAS"]);
    expect(within(dialogo).queryByText(/Sin datos para este período/)).not.toBeInTheDocument();
  });

  it("un período en null muestra el aviso solo en ese período", async () => {
    const dialogo = await abrirModal(datosConSinergia({ sinergia: crearSinergia({ todo: null }) }));
    expect(within(dialogo).getByRole("table")).toBeInTheDocument();
    await userEvent.click(botonPeriodo(dialogo, "Todo lo registrado"));
    expect(within(dialogo).getByText(/Sin datos para este período/)).toBeInTheDocument();
    expect(within(dialogo).queryByRole("table")).not.toBeInTheDocument();
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
    await abrirModal(datosConSinergia());
    await userEvent.click(screen.getByText(/Partidas en el mismo equipo/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("atrapa el foco con Tab y Shift+Tab", async () => {
    await abrirModal(datosConSinergia());
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
    await abrirModal(datosConSinergia());
    await userEvent.click(screen.getByRole("button", { name: "Ver sus últimas partidas" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Rana Azul#LAS" });
    await waitFor(() => expect(boton).toHaveAttribute("aria-expanded", "true"));
    expect(boton).toHaveFocus();
    expect(window.location.hash).toBe("#/amigo/rana-azul-las");
  });

  it.each([
    ["sin sinergia", {}],
    ["con los dos períodos en null", { sinergia: { ultimos_30_dias: null, todo: null } }],
  ])("%s en el JSON, el clic abre las partidas como antes", async (_caso, cambios) => {
    const ranking = await abrirApp(crearDatos(cambios));
    await userEvent.click(within(ranking).getByRole("link", { name: /Sapito#LAS/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sapito#LAS" })).toHaveAttribute("aria-expanded", "true"),
    );
  });
});
