import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilaPartidaCompacta } from "./FilaPartidaCompacta.jsx";

const ddragonMock = {
  version: "14.20.1",
  campeones: {
    112: { id: "Viktor", nombre: "Viktor" },
    51: { id: "Caitlyn", nombre: "Caitlyn" },
  },
  hechizos: {
    4: { id: "Flash", nombre: "Destello" },
    12: { id: "Teleport", nombre: "Teleportación" },
  },
  items: {
    3089: { nombre: "Sombrero Mortal de Rabadon" },
    3020: { nombre: "Botas de Hechicero" },
  },
  runas: {
    8229: { id: 8229, key: "ArcaneComet", name: "Cometa Arcano" },
  },
};

const partidaMock = {
  id: "LA2_1629000000",
  fecha: 1792683791659,
  duracion: 1186, // ~19m 46s
  resultado: "derrota",
  modo: "Normal (Reclutamiento)",
  queue_id: 400,
  campeon: "Viktor",
  campeon_id: 112,
  nivel: 13,
  asesinatos: 4,
  muertes: 3,
  asistencias: 1,
  cs: 119,
  participacion: 42,
  hechizos: [4, 12],
  runas: { principal: 8229, secundaria: 8000 },
  items: [3089, 3020, 0, 0, 0, 0, 3340],
  participantes: [],
};

describe("FilaPartidaCompacta", () => {
  it("renderiza métricas en formato compacto estilo OP.GG", () => {
    render(
      <FilaPartidaCompacta
        partida={partidaMock}
        ddragon={ddragonMock}
        ahora={1792683791659 + 1000 * 60 * 60 * 12}
        slugPropio="johnadis-las"
      />,
    );

    // Campeón y nivel
    expect(screen.getByRole("img", { name: "Viktor" })).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();

    // Resultado y modo
    expect(screen.getByText("Derrota")).toBeInTheDocument();
    expect(screen.getByText("Normal (Reclutamiento)")).toBeInTheDocument();

    // KDA
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1.67 KDA")).toBeInTheDocument();

    // CS y KP
    expect(screen.getByText("119 CS")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("P. en ases.")).toBeInTheDocument();

    // Duración
    expect(screen.getByText("19 min")).toBeInTheDocument();

    // Ítems presentes
    expect(screen.getByRole("img", { name: "Sombrero Mortal de Rabadon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Botas de Hechicero" })).toBeInTheDocument();
  });

  it("al hacer clic en la fila se abre el modal de detalle de partida", () => {
    render(
      <FilaPartidaCompacta
        partida={partidaMock}
        ddragon={ddragonMock}
        ahora={partidaMock.fecha}
        slugPropio="johnadis-las"
      />,
    );

    const fila = screen.getByRole("article");
    fireEvent.click(fila);

    // Debe abrir el diálogo de detalle
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("al hacer clic en el botón de análisis se abre el modal de detalle de partida", () => {
    render(
      <FilaPartidaCompacta
        partida={partidaMock}
        ddragon={ddragonMock}
        ahora={partidaMock.fecha}
        slugPropio="johnadis-las"
      />,
    );

    const boton = screen.getByRole("button", { name: "Ver detalles de la partida con Viktor" });
    fireEvent.click(boton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("tolera una partida vacía o sin estadísticas sin fallar", () => {
    const { container } = render(
      <FilaPartidaCompacta
        partida={null}
        ddragon={ddragonMock}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});
