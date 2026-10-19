import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeccionCampeones } from "./SeccionCampeones.jsx";
import { TarjetaCampeones } from "./TarjetaCampeones.jsx";
import { TarjetaEnConstruccion } from "./TarjetaEnConstruccion.jsx";

const ddragonMock = {
  version: "14.20.1",
  campeones: {
    112: { id: "Viktor", nombre: "Viktor" },
    115: { id: "Ziggs", nombre: "Ziggs" },
    777: { id: "Yone", nombre: "Yone" },
    22: { id: "Ashe", nombre: "Ashe" },
    86: { id: "Garen", nombre: "Garen" },
    103: { id: "Ahri", nombre: "Ahri" },
  },
};

const campeonesMock = {
  global: {
    todo: {
      total_partidas: 50,
      campeones: [
        { campeon_id: 112, campeon: "Viktor", partidas: 20, victorias: 10, derrotas: 10, winrate: 50.0, kda: 2.53 },
        { campeon_id: 115, campeon: "Ziggs", partidas: 14, victorias: 6, derrotas: 8, winrate: 42.9, kda: 2.38 },
        { campeon_id: 777, campeon: "Yone", partidas: 10, victorias: 6, derrotas: 4, winrate: 60.0, kda: 2.77 },
        { campeon_id: 22, campeon: "Ashe", partidas: 4, victorias: 2, derrotas: 2, winrate: 50.0, kda: 3.38 },
        { campeon_id: 86, campeon: "Garen", partidas: 4, victorias: 2, derrotas: 2, winrate: 50.0, kda: 3.4 },
        { campeon_id: 103, campeon: "Ahri", partidas: 2, victorias: 1, derrotas: 1, winrate: 50.0, kda: 1.5 },
      ],
      por_linea: {},
      resumen_lineas: {},
    },
  },
  por_amigo: {},
};

describe("TarjetaEnConstruccion", () => {
  it("muestra título, subtítulo e insignia de construcción", () => {
    render(<TarjetaEnConstruccion titulo="Próximamente" subtitulo="Espacio reservado" />);
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByText("Espacio reservado")).toBeInTheDocument();
    expect(screen.getByText("En construcción")).toBeInTheDocument();
  });
});

describe("TarjetaCampeones", () => {
  it("muestra estado vacío si no hay partidas", () => {
    render(<TarjetaCampeones campeones={null} ddragon={ddragonMock} />);
    expect(screen.getByText("No hay partidas registradas de campeones.")).toBeInTheDocument();
  });

  it("renderiza exactamente el Top 5 con partidas, winrate y KDA", () => {
    const onVer = vi.fn();
    render(<TarjetaCampeones campeones={campeonesMock} ddragon={ddragonMock} onVerDetalle={onVer} />);

    // Título y botón de top 5
    expect(screen.getByText("Campeones")).toBeInTheDocument();
    expect(screen.getByText("Top 5 ›")).toBeInTheDocument();

    // Top 5 están presentes
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();
    expect(screen.getByText("Yone")).toBeInTheDocument();
    expect(screen.getByText("Ashe")).toBeInTheDocument();
    expect(screen.getByText("Garen")).toBeInTheDocument();
    // El sexto (Ahri) no debe aparecer en el top 5
    expect(screen.queryByText("Ahri")).toBeNull();

    // Estadísticas
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("42.9%")).toBeInTheDocument();
    expect(screen.getByText("2.53")).toBeInTheDocument();

    // Clic abre el detalle
    const btn = screen.getByRole("button", { name: "Ver estadísticas completas de campeones" });
    fireEvent.click(btn);
    expect(onVer).toHaveBeenCalledTimes(1);
  });
});

describe("SeccionCampeones", () => {
  it("sin datos de campeones no se renderiza", () => {
    const { container } = render(<SeccionCampeones campeones={null} ddragon={ddragonMock} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza la sección con el título y las 3 tarjetas en la grilla", () => {
    render(<SeccionCampeones campeones={campeonesMock} ddragon={ddragonMock} />);
    expect(screen.getByText("Campeones más jugados")).toBeInTheDocument();
    expect(screen.getAllByText("Próximamente")).toHaveLength(2);
    expect(screen.getByText("Viktor")).toBeInTheDocument();
  });
});
