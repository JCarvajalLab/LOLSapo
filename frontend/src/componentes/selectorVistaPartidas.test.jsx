import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectorVistaPartidas } from "./SelectorVistaPartidas.jsx";

describe("SelectorVistaPartidas", () => {
  it("renderiza ambos botones con sus accesibilidades correspondientes", () => {
    render(<SelectorVistaPartidas vista="detallada" onCambiarVista={vi.fn()} />);

    const btnDetallada = screen.getByRole("button", { name: "Vista detallada" });
    const btnCompacta = screen.getByRole("button", { name: "Vista compacta" });

    expect(btnDetallada).toHaveAttribute("aria-pressed", "true");
    expect(btnCompacta).toHaveAttribute("aria-pressed", "false");
  });

  it("cambia aria-pressed a true para vista compacta cuando se activa", () => {
    render(<SelectorVistaPartidas vista="compacta" onCambiarVista={vi.fn()} />);

    const btnDetallada = screen.getByRole("button", { name: "Vista detallada" });
    const btnCompacta = screen.getByRole("button", { name: "Vista compacta" });

    expect(btnDetallada).toHaveAttribute("aria-pressed", "false");
    expect(btnCompacta).toHaveAttribute("aria-pressed", "true");
  });

  it("dispara onCambiarVista con 'compacta' al hacer clic en el botón correspondiente", () => {
    const onCambiar = vi.fn();
    render(<SelectorVistaPartidas vista="detallada" onCambiarVista={onCambiar} />);

    fireEvent.click(screen.getByRole("button", { name: "Vista compacta" }));
    expect(onCambiar).toHaveBeenCalledWith("compacta");
  });

  it("dispara onCambiarVista con 'detallada' al hacer clic en el botón correspondiente", () => {
    const onCambiar = vi.fn();
    render(<SelectorVistaPartidas vista="compacta" onCambiarVista={onCambiar} />);

    fireEvent.click(screen.getByRole("button", { name: "Vista detallada" }));
    expect(onCambiar).toHaveBeenCalledWith("detallada");
  });
});
