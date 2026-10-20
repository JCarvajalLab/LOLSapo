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
  },
};

const amigosMock = [
  { slug: "johnadis-las", nombre: "Johnadis", riot_id: "Johnadis#LAS" },
  { slug: "iskrat-las", nombre: "ISkrat", riot_id: "ISkrat#LAS" },
];

const campeonesMock = {
  global: {
    todo: {
      total_partidas: 34,
      campeones: [],
    },
  },
  por_amigo: {
    "johnadis-las": {
      todo: {
        total_partidas: 20,
        campeones: [
          {
            campeon_id: 112,
            campeon: "Viktor",
            partidas: 20,
            victorias: 10,
            derrotas: 10,
            winrate: 50.0,
            kda: 2.53,
          },
        ],
      },
    },
    "iskrat-las": {
      todo: {
        total_partidas: 14,
        campeones: [
          {
            campeon_id: 115,
            campeon: "Ziggs",
            partidas: 14,
            victorias: 6,
            derrotas: 8,
            winrate: 42.9,
            kda: 2.38,
          },
        ],
      },
    },
  },
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

  it("renderiza el campeón principal de cada amigo con su insignia de nombre", () => {
    const onVer = vi.fn();
    render(
      <TarjetaCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onVerDetalle={onVer}
      />,
    );

    // Título y botón de top 5
    expect(screen.getByText("Campeones más utilizados")).toBeInTheDocument();
    expect(screen.getByText("Top 5 ›")).toBeInTheDocument();

    // Campeón y amigo correspondiente
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("Johnadis")).toBeInTheDocument();

    expect(screen.getByText("Ziggs")).toBeInTheDocument();
    expect(screen.getByText("ISkrat")).toBeInTheDocument();

    // Estadísticas de Viktor y Ziggs
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("42.9%")).toBeInTheDocument();
    expect(screen.getByText("2.53")).toBeInTheDocument();
    expect(screen.getByText("2.38")).toBeInTheDocument();

    // Clic en la tarjeta abre el modal
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

  it("renderiza la sección con el título 'Estadísticas generales' y las 3 tarjetas en la grilla", () => {
    render(<SeccionCampeones campeones={campeonesMock} amigos={amigosMock} ddragon={ddragonMock} />);
    expect(screen.getByText("Estadísticas generales")).toBeInTheDocument();
    expect(screen.getAllByText("Próximamente")).toHaveLength(2);
    expect(screen.getByText("Viktor")).toBeInTheDocument();
  });
});
