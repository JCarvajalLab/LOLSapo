import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarioActividad } from "./CalendarioActividad.jsx";

describe("CalendarioActividad", () => {
  const ahora = new Date(2026, 9, 22).getTime(); // 22 oct 2026

  const actividadMock = {
    "2026-10-22": {
      partidas: 6,
      victorias: 4,
      derrotas: 2,
      remakes: 0,
      duracion: 11340, // 3h 9min
    },
    "2026-10-20": {
      partidas: 1,
      victorias: 1,
      derrotas: 0,
      remakes: 0,
      duracion: 1800, // 30min
    },
  };

  it("renderiza el título 'ACTIVIDAD RECIENTE' y la cuadrícula de días", () => {
    render(<CalendarioActividad actividad={actividadMock} ahora={ahora} />);

    expect(screen.getByRole("heading", { name: /ACTIVIDAD RECIENTE/i })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Matriz de actividad por día" })).toBeInTheDocument();

    // Días de la semana visibles
    expect(screen.getByText("Lu")).toBeInTheDocument();
    expect(screen.getByText("Do")).toBeInTheDocument();
  });

  it("muestra la celda con su etiqueta de accesibilidad y tooltip en hover", async () => {
    render(<CalendarioActividad actividad={actividadMock} ahora={ahora} />);

    // Celda de 22/10/2026
    const celda = screen.getByRole("gridcell", { name: "22/10/2026: 6 partidas" });
    expect(celda).toBeInTheDocument();

    // Al pasar el ratón debe desplegar el tooltip con los datos en español
    fireEvent.mouseEnter(celda.parentElement);

    expect(screen.getByText(/22\/10\/2026:/)).toBeInTheDocument();
    expect(screen.getByText(/6 partidas/)).toBeInTheDocument();
    expect(screen.getByText("Tiempo jugado:")).toBeInTheDocument();
    expect(screen.getByText("3 h 9 min")).toBeInTheDocument();
    expect(screen.getByText("Registro:")).toBeInTheDocument();
    expect(screen.getByText("4V")).toBeInTheDocument();
    expect(screen.getByText("2D")).toBeInTheDocument();
  });

  it("tolera un mapa de actividad vacío sin fallar", () => {
    const { container } = render(<CalendarioActividad actividad={{}} ahora={ahora} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ACTIVIDAD RECIENTE/i })).toBeInTheDocument();
  });
});
