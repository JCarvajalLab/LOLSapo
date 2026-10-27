import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TarjetaResumenRecienteTft } from "./TarjetaResumenRecienteTft.jsx";
import { historialCroac } from "../test/fixtures/tft.js";

describe("TarjetaResumenRecienteTft", () => {
  it("renderiza el título, la tasa de Top 4 y la posición media", () => {
    // historialCroac tiene 12 partidas: 7 en top 4 y 5 derrotas (58,33%)
    render(<TarjetaResumenRecienteTft historial={historialCroac} filtro="todos" />);

    expect(screen.getByText("Últimas 12 partidas")).toBeInTheDocument();
    expect(screen.getByText("Tasa de top 4")).toBeInTheDocument();
    expect(screen.getByText("Pos. media")).toBeInTheDocument();
    expect(screen.getByText(/7 victorias \/ 5 derrotas/)).toBeInTheDocument();
    expect(screen.getByText("58,33%")).toBeInTheDocument();
    expect(screen.getByText("4,00")).toBeInTheDocument();
  });

  it("filtra por modo cuando se indica un filtro", () => {
    // Ranked tiene 8 partidas en historialCroac (4 en top 4, 4 fuera)
    render(<TarjetaResumenRecienteTft historial={historialCroac} filtro="ranked" />);

    expect(screen.getByText("Últimas 8 partidas")).toBeInTheDocument();
    expect(screen.getByText(/4 victorias \/ 4 derrotas/)).toBeInTheDocument();
  });

  it("devuelve null cuando no hay historial o el filtro no tiene partidas", () => {
    const { container: c1 } = render(<TarjetaResumenRecienteTft historial={null} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(<TarjetaResumenRecienteTft historial={[]} />);
    expect(c2).toBeEmptyDOMElement();
  });
});
