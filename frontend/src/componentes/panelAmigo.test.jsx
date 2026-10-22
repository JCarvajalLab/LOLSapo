import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AHORA, crearDatos, ddragon } from "../test/fixtures/lol.js";
import { PanelAmigo } from "./PanelAmigo.jsx";

describe("PanelAmigo (selector de vista de partidas)", () => {
  const datos = crearDatos();
  const [rana, sapito] = datos.amigos;

  beforeEach(() => {
    window.localStorage?.clear();
  });

  it("renderiza por defecto la vista detallada con el selector visible", () => {
    render(<PanelAmigo amigo={rana} ddragon={ddragon} ahora={AHORA} />);

    // Selector visible
    const grupo = screen.getByRole("group", { name: "Tipo de vista de partidas" });
    expect(grupo).toBeInTheDocument();

    const botonDetallada = screen.getByRole("button", { name: "Vista detallada" });
    const botonCompacta = screen.getByRole("button", { name: "Vista compacta" });
    expect(botonDetallada).toHaveAttribute("aria-pressed", "true");
    expect(botonCompacta).toHaveAttribute("aria-pressed", "false");

    // En vista detallada existen las listas de participantes
    expect(screen.getAllByRole("list", { name: "Equipo azul" }).length).toBeGreaterThan(0);
  });

  it("permite cambiar a vista compacta y persistir en localStorage", () => {
    render(<PanelAmigo amigo={rana} ddragon={ddragon} ahora={AHORA} />);

    const botonCompacta = screen.getByRole("button", { name: "Vista compacta" });
    fireEvent.click(botonCompacta);

    expect(botonCompacta).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista detallada" })).toHaveAttribute("aria-pressed", "false");

    // En vista compacta no hay listas de equipos de 10 participantes en el DOM principal
    expect(screen.queryByRole("list", { name: "Equipo azul" })).not.toBeInTheDocument();

    // Las filas compactas siguen presentes
    expect(screen.getAllByRole("article")).toHaveLength(3);

    // Persistencia
    expect(window.localStorage.getItem("lolsapo_vista_historial")).toBe("compacta");
  });

  it("no muestra el selector si el amigo no tiene partidas", () => {
    render(<PanelAmigo amigo={sapito} ddragon={ddragon} ahora={AHORA} />);

    expect(screen.queryByRole("group", { name: "Tipo de vista de partidas" })).not.toBeInTheDocument();
    expect(screen.getByText("Todavía no hay partidas registradas.")).toBeInTheDocument();
  });
});
