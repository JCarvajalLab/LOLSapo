import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeccionCampeones } from "./SeccionCampeones.jsx";
import { TarjetaCampeones } from "./TarjetaCampeones.jsx";
import { TarjetaEnConstruccion } from "./TarjetaEnConstruccion.jsx";
import { TarjetaRoles } from "./TarjetaRoles.jsx";

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
        resumen_lineas: {
          TOP: { posicion: "TOP", partidas: 2, victorias: 1, derrotas: 1, winrate: 50.0, porcentaje: 10.0 },
          JUNGLE: { posicion: "JUNGLE", partidas: 3, victorias: 2, derrotas: 1, winrate: 66.7, porcentaje: 15.0 },
          MIDDLE: { posicion: "MIDDLE", partidas: 12, victorias: 7, derrotas: 5, winrate: 58.3, porcentaje: 60.0 },
          BOTTOM: { posicion: "BOTTOM", partidas: 2, victorias: 1, derrotas: 1, winrate: 50.0, porcentaje: 10.0 },
          UTILITY: { posicion: "UTILITY", partidas: 1, victorias: 0, derrotas: 1, winrate: 0.0, porcentaje: 5.0 },
        },
        campeones: [
          {
            campeon_id: 112,
            campeon: "Viktor",
            partidas: 20,
            victorias: 10,
            derrotas: 10,
            winrate: 50.0,
            kda: 2.53,
            promedio_kda: { asesinatos: 7.0, muertes: 4.0, asistencias: 6.0 },
          },
        ],
      },
    },
    "iskrat-las": {
      todo: {
        total_partidas: 14,
        resumen_lineas: {
          TOP: { posicion: "TOP", partidas: 1, victorias: 0, derrotas: 1, winrate: 0.0, porcentaje: 7.1 },
          JUNGLE: { posicion: "JUNGLE", partidas: 1, victorias: 1, derrotas: 0, winrate: 100.0, porcentaje: 7.1 },
          MIDDLE: { posicion: "MIDDLE", partidas: 2, victorias: 1, derrotas: 1, winrate: 50.0, porcentaje: 14.3 },
          BOTTOM: { posicion: "BOTTOM", partidas: 10, victorias: 5, derrotas: 5, winrate: 50.0, porcentaje: 71.4 },
          UTILITY: { posicion: "UTILITY", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0.0 },
        },
        campeones: [
          {
            campeon_id: 115,
            campeon: "Ziggs",
            partidas: 14,
            victorias: 6,
            derrotas: 8,
            winrate: 42.9,
            kda: 2.38,
            promedio_kda: { asesinatos: 5.0, muertes: 3.0, asistencias: 8.0 },
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

describe("TarjetaRoles", () => {
  it("renderiza métricas de KDA, jugadas, winrate y tabla de roles y permite hacer clic en un rol", () => {
    const onVer = vi.fn();
    render(<TarjetaRoles campeones={campeonesMock} amigos={amigosMock} onVerDetalle={onVer} />);

    expect(screen.getByText("Estadísticas básicas")).toBeInTheDocument();
    expect(screen.getByText("KDA Promedio")).toBeInTheDocument();
    expect(screen.getByText("Jugadas")).toBeInTheDocument();
    expect(screen.getAllByText("Winrate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Roles más jugados")).toBeInTheDocument();

    // Selector de amigos
    expect(screen.getByRole("tab", { name: "Johnadis" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ISkrat" })).toBeInTheDocument();

    // Selector de período fijado por defecto en 30 días
    const selectPeriodo = screen.getByLabelText("Filtrar por período");
    expect(selectPeriodo).toHaveValue("dias_30");

    // Clic en ISkrat cambia las estadísticas al amigo seleccionado
    fireEvent.click(screen.getByRole("tab", { name: "ISkrat" }));
    expect(screen.getByText("14")).toBeInTheDocument(); // 14 partidas de ISkrat

    // Clic en la fila del rol Inferior para abrir el modal filtrado
    const filaRol = screen.getAllByText("Inferior").find((el) => el.closest("tr"))?.closest("tr");
    expect(filaRol).toBeInTheDocument();
    fireEvent.click(filaRol);
    expect(onVer).toHaveBeenCalledWith({
      amigo: "iskrat-las",
      periodo: "dias_30",
      linea: "BOTTOM",
    });
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
    expect(screen.getAllByText("Próximamente")).toHaveLength(1);
    expect(screen.getByText("Estadísticas básicas")).toBeInTheDocument();
    expect(screen.getByText("Viktor")).toBeInTheDocument();
  });
});
