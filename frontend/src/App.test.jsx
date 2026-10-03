import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { crearDatos, crearDestacados } from "./test/fixtures/lol.js";

function respuestaOk(json) {
  return Promise.resolve({ ok: true, json: async () => json });
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra carga y luego los datos", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos({ actualizado: new Date().toISOString() })));
    render(<App fetchFn={fetchFn} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos…");
    expect(await screen.findByRole("heading", { name: "Amigos" })).toBeInTheDocument();
    expect(screen.getByText("Nadie en partida.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actualizar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ranking" })).toBeInTheDocument();
    expect(screen.getByText(/no está respaldado por Riot Games/)).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith("./datos/lol.json", { cache: "no-store" });
  });

  it("muestra los destacados entre En partida y Ranking, y los oculta en archivos viejos", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos({ destacados: crearDestacados() })));
    const { unmount } = render(<App fetchFn={fetchFn} />);
    const destacados = await screen.findByRole("heading", { name: "Destacados de los últimos 7 días" });
    const enPartida = screen.getByRole("heading", { name: /En partida/ });
    const ranking = screen.getByRole("heading", { name: "Ranking" });
    expect(enPartida.compareDocumentPosition(destacados) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(destacados.compareDocumentPosition(ranking) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();

    render(<App fetchFn={vi.fn(() => respuestaOk(crearDatos()))} />);
    expect(await screen.findByRole("heading", { name: "Amigos" })).toBeInTheDocument();
    expect(screen.queryByText("Destacados de los últimos 7 días")).not.toBeInTheDocument();
  });

  it("muestra un error claro si no hay datos", async () => {
    const fetchFn = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    render(<App fetchFn={fetchFn} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Todavía no hay datos.");
    expect(screen.getByRole("alert")).toHaveTextContent("Corre el recolector: python -m lolsapo");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("abre el amigo indicado en el hash y alterna el acordeón", async () => {
    window.history.replaceState(null, "", "/#/amigo/sapito-las");
    render(<App fetchFn={() => respuestaOk(crearDatos())} />);
    const boton = await screen.findByRole("button", { name: /Sapito#LAS/ });
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Rana Azul#LAS/ })).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(window.location.hash).toBe("#/");

    await userEvent.click(screen.getByRole("button", { name: /Rana Azul#LAS/ }));
    expect(window.location.hash).toBe("#/amigo/rana-azul-las");
  });

  it("el ranking abre al amigo elegido", async () => {
    render(<App fetchFn={() => respuestaOk(crearDatos())} />);
    await screen.findByRole("heading", { name: "Amigos" });
    await userEvent.click(screen.getByRole("link", { name: /Sapito#LAS/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Sapito#LAS/ })).toHaveAttribute("aria-expanded", "true"),
    );
    expect(window.location.hash).toBe("#/amigo/sapito-las");
  });

  it("muestra el estado vacío sin amigos", async () => {
    render(<App fetchFn={() => respuestaOk(crearDatos({ amigos: [], ranking: [] }))} />);
    expect(await screen.findByText(/No hay amigos configurados/)).toBeInTheDocument();
  });
});
