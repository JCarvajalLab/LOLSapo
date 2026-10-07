import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { SelectorJuego } from "./SelectorJuego.jsx";
import { juegoDesdeHash } from "../rutas/hash.js";
import { crearDatos } from "../test/fixtures/lol.js";
import { crearDatosTft, fetchPorRuta } from "../test/fixtures/tft.js";

function respuestaOk(ruta) {
  const ahora = new Date().toISOString();
  return fetchPorRuta({ lol: crearDatos({ actualizado: ahora }), tft: crearDatosTft({ actualizado: ahora }) })(ruta);
}

describe("ruta del juego", () => {
  it("#/tft es TFT; el resto es League", () => {
    expect(juegoDesdeHash("#/tft")).toBe("tft");
    expect(juegoDesdeHash("#/tft/")).toBe("tft");
    expect(juegoDesdeHash("#/")).toBe("lol");
    expect(juegoDesdeHash("")).toBe("lol");
    expect(juegoDesdeHash("#/amigo/rana-azul-las")).toBe("lol");
    expect(juegoDesdeHash("#/tftx")).toBe("lol");
  });
});

describe("SelectorJuego", () => {
  it("sigue el patrón de pestañas accesibles", () => {
    render(<SelectorJuego juego="lol" onCambiar={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Juego" })).toBeInTheDocument();
    const [lol, tft] = screen.getAllByRole("tab");
    expect(lol).toHaveTextContent("League of Legends");
    expect(lol).toHaveAttribute("aria-selected", "true");
    expect(lol).toHaveAttribute("aria-controls", "vista-lol");
    expect(lol).toHaveAttribute("tabindex", "0");
    expect(tft).toHaveAttribute("aria-selected", "false");
    expect(tft).toHaveAttribute("tabindex", "-1");
    expect(lol).toHaveClass("min-h-11");
  });

  it("flechas, Inicio y Fin cambian de pestaña", async () => {
    const onCambiar = vi.fn();
    render(<SelectorJuego juego="lol" onCambiar={onCambiar} />);
    screen.getByRole("tab", { name: "League of Legends" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onCambiar).toHaveBeenLastCalledWith("tft");
    await userEvent.keyboard("{ArrowLeft}");
    expect(onCambiar).toHaveBeenLastCalledWith("tft"); // desde "lol", a la izquierda da la vuelta
    await userEvent.keyboard("{End}");
    expect(onCambiar).toHaveBeenLastCalledWith("tft");
    await userEvent.keyboard("{Home}");
    expect(onCambiar).toHaveBeenLastCalledWith("lol");
  });
});

describe("App con pestañas de juego", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("con clic cambia a TFT, actualiza el hash y vuelve a League", async () => {
    render(<App fetchFn={respuestaOk} />);
    await screen.findByRole("heading", { name: "Amigos" });

    await userEvent.click(screen.getByRole("tab", { name: "TFT" }));
    expect(window.location.hash).toBe("#/tft");
    expect(screen.getByRole("tab", { name: "TFT" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "vista-tft");
    expect(await screen.findByRole("button", { name: "Croac#LAS" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rana Azul#LAS/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "League of Legends" }));
    expect(window.location.hash).toBe("#/");
    expect(screen.getByRole("heading", { name: "Amigos" })).toBeInTheDocument();
  });

  it("con flechas cambia de pestaña y mueve el foco", async () => {
    render(<App fetchFn={respuestaOk} />);
    await screen.findByRole("heading", { name: "Amigos" });
    screen.getByRole("tab", { name: "League of Legends" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "TFT" })).toHaveFocus();
    expect(window.location.hash).toBe("#/tft");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "vista-tft");
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "League of Legends" })).toHaveFocus();
    expect(window.location.hash).toBe("#/");
  });

  it("#/tft abre TFT directamente", () => {
    window.history.replaceState(null, "", "/#/tft");
    render(<App fetchFn={() => new Promise(() => {})} />);
    expect(screen.getByRole("tab", { name: "TFT" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "vista-tft");
    // Muestra el esqueleto de TFT, no el de League, mientras los datos no llegan.
    expect(screen.getByRole("status", { name: "Cargando datos de TFT…" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando datos…" })).not.toBeInTheDocument();
  });

  it("#/amigo/<slug> sigue abriendo League con el amigo desplegado", async () => {
    window.history.replaceState(null, "", "/#/amigo/sapito-las");
    render(<App fetchFn={respuestaOk} />);
    const boton = await screen.findByRole("button", { name: /Sapito#LAS/ });
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tab", { name: "League of Legends" })).toHaveAttribute("aria-selected", "true");
  });

  it("el acordeón sigue funcionando después de pasar por TFT", async () => {
    render(<App fetchFn={respuestaOk} />);
    await screen.findByRole("heading", { name: "Amigos" });
    await userEvent.click(screen.getByRole("button", { name: /Rana Azul#LAS/ }));
    expect(window.location.hash).toBe("#/amigo/rana-azul-las");

    await userEvent.click(screen.getByRole("tab", { name: "TFT" }));
    await userEvent.click(screen.getByRole("tab", { name: "League of Legends" }));
    const boton = await screen.findByRole("button", { name: /Rana Azul#LAS/ });
    expect(boton).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(boton);
    await waitFor(() => expect(boton).toHaveAttribute("aria-expanded", "false"));
  });

  it("volver con el historial a #/amigo/<slug> regresa a League", async () => {
    window.history.replaceState(null, "", "/#/tft");
    render(<App fetchFn={respuestaOk} />);
    window.location.hash = "#/amigo/rana-azul-las";
    const boton = await screen.findByRole("button", { name: /Rana Azul#LAS/ });
    await waitFor(() => expect(boton).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByRole("tab", { name: "League of Legends" })).toHaveAttribute("aria-selected", "true");
  });
});
