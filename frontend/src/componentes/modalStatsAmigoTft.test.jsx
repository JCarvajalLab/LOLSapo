import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalStatsAmigoTft } from "./ModalStatsAmigoTft.jsx";
import { ddragonTft, historialCroac } from "../test/fixtures/tft.js";

const amigoMock = {
  slug: "croac-las",
  riot_id: "Croac#LAS",
  perfil: { icono: 548, nivel: 250 },
  rangos: {
    ranked: {
      tier: "PLATINUM",
      division: "II",
      lp: 75,
      partidas: 50,
      top4: 30,
    },
  },
  historial: historialCroac,
  estadisticas: {
    total: {
      partidas: 20,
      primeros: 3,
      top4: 12,
      top4_pct: 60.0,
      promedio: 4.1,
      puestos: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2, 6: 2, 7: 2, 8: 2 },
    },
    por_modo: [
      {
        categoria: "ranked",
        nombre: "Clasificatoria",
        partidas: 15,
        primeros: 2,
        top4: 9,
        top4_pct: 60.0,
        promedio: 4.0,
        puestos: { 1: 2, 2: 3, 3: 2, 4: 2, 5: 2, 6: 1, 7: 2, 8: 1 },
      },
    ],
  },
};

describe("ModalStatsAmigoTft", () => {
  it("renderiza el modal amplio con emblema de división, rango, partidas y gráfico de posiciones", () => {
    render(
      <ModalStatsAmigoTft
        amigo={amigoMock}
        ddragon={ddragonTft}
        onCerrar={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Croac#LAS" })).toBeInTheDocument();
    expect(screen.getByAltText("Emblema de Platino II")).toBeInTheDocument();
    expect(screen.getByText("Platino II")).toBeInTheDocument();
    expect(screen.getByText("75 LP")).toBeInTheDocument();
    expect(screen.getByText("Posiciones")).toBeInTheDocument();
    expect(screen.getByLabelText("Distribución de puestos")).toBeInTheDocument();
    expect(screen.getByText("Puesto medio")).toBeInTheDocument();
    expect(screen.getByText("Tasa de Top 4")).toBeInTheDocument();
    expect(screen.getByText("Primer puesto")).toBeInTheDocument();
  });

  it("permite cambiar entre los períodos Últimos 30 días y Temporada 2026", () => {
    render(
      <ModalStatsAmigoTft
        amigo={amigoMock}
        ddragon={ddragonTft}
        onCerrar={vi.fn()}
      />
    );

    // Por defecto inicia en últimos 30 días
    const btnTemporada = screen.getByRole("button", { name: "Temporada 2026" });
    fireEvent.click(btnTemporada);
    expect(btnTemporada).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Temporada 2026 · 15 partidas/)).toBeInTheDocument();

    const btn30Dias = screen.getByRole("button", { name: "Últimos 30 días" });
    fireEvent.click(btn30Dias);
    expect(btn30Dias).toHaveAttribute("aria-pressed", "true");
  });

  it("permite cambiar de modo entre Clasificatoria y Todos los modos", () => {
    render(
      <ModalStatsAmigoTft
        amigo={amigoMock}
        ddragon={ddragonTft}
        onCerrar={vi.fn()}
      />
    );

    const btnTodos = screen.getByRole("button", { name: "Todos los modos" });
    fireEvent.click(btnTodos);
    expect(btnTodos).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra ranking del grupo y nivel de cuenta si están disponibles", () => {
    render(
      <ModalStatsAmigoTft
        amigo={amigoMock}
        ddragon={ddragonTft}
        posicionRanking={1}
        totalAmigos={6}
        onCerrar={vi.fn()}
      />
    );

    expect(screen.getByText(/Ranking del grupo:/)).toBeInTheDocument();
    expect(screen.getByText("#1 de 6")).toBeInTheDocument();
    expect(screen.getByText(/Nivel de cuenta:/)).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("dispara onCerrar al hacer clic en el botón de cerrar", () => {
    const handleCerrar = vi.fn();
    render(
      <ModalStatsAmigoTft
        amigo={amigoMock}
        ddragon={ddragonTft}
        onCerrar={handleCerrar}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(handleCerrar).toHaveBeenCalledOnce();
  });
});
