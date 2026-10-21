import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalCampeones } from "./ModalCampeones.jsx";

const ddragonMock = {
  version: "14.20.1",
  campeones: {
    112: { id: "Viktor", nombre: "Viktor" },
    115: { id: "Ziggs", nombre: "Ziggs" },
    222: { id: "Jinx", nombre: "Jinx" },
  },
};

const amigosMock = [
  { slug: "johnadis-las", nombre: "Johnadis", riot_id: "Johnadis#LAS", perfil: { icono: 10 } },
  { slug: "iskrat-las", nombre: "ISkrat", riot_id: "ISkrat#LAS", perfil: { icono: 20 } },
];

const campeonesMock = {
  global: {
    dias_30: {
      total_partidas: 25,
      campeones: [
        {
          campeon_id: 112,
          campeon: "Viktor",
          partidas: 15,
          victorias: 10,
          derrotas: 5,
          winrate: 66.7,
          kda: 3.2,
          promedio_kda: { asesinatos: 7.2, muertes: 3.1, asistencias: 6.5 },
          cs: 2500,
          cs_promedio: 166.7,
          cs_minuto: 7.1,
          amigo_principal: "johnadis-las",
        },
        {
          campeon_id: 115,
          campeon: "Ziggs",
          partidas: 10,
          victorias: 5,
          derrotas: 5,
          winrate: 50.0,
          kda: 2.1,
          promedio_kda: { asesinatos: 5.0, muertes: 4.0, asistencias: 8.0 },
          cs: 1400,
          cs_promedio: 140.0,
          cs_minuto: 6.2,
          amigo_principal: "iskrat-las",
        },
      ],
      por_linea: {
        TOP: [],
        JUNGLE: [],
        MIDDLE: [
          {
            campeon_id: 112,
            campeon: "Viktor",
            partidas: 15,
            victorias: 10,
            derrotas: 5,
            winrate: 66.7,
            kda: 3.2,
            promedio_kda: { asesinatos: 7.2, muertes: 3.1, asistencias: 6.5 },
            cs: 2500,
            cs_promedio: 166.7,
            cs_minuto: 7.1,
            amigo_principal: "johnadis-las",
          },
        ],
        BOTTOM: [
          {
            campeon_id: 115,
            campeon: "Ziggs",
            partidas: 10,
            victorias: 5,
            derrotas: 5,
            winrate: 50.0,
            kda: 2.1,
            promedio_kda: { asesinatos: 5.0, muertes: 4.0, asistencias: 8.0 },
            cs: 1400,
            cs_promedio: 140.0,
            cs_minuto: 6.2,
            amigo_principal: "iskrat-las",
          },
        ],
        UTILITY: [],
      },
      resumen_lineas: {
        TOP: { posicion: "TOP", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
        JUNGLE: { posicion: "JUNGLE", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
        MIDDLE: { posicion: "MIDDLE", partidas: 15, victorias: 10, derrotas: 5, winrate: 66.7, porcentaje: 60.0 },
        BOTTOM: { posicion: "BOTTOM", partidas: 10, victorias: 5, derrotas: 5, winrate: 50.0, porcentaje: 40.0 },
        UTILITY: { posicion: "UTILITY", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
      },
    },
    todo: {
      total_partidas: 40,
      campeones: [
        {
          campeon_id: 112,
          campeon: "Viktor",
          partidas: 25,
          victorias: 15,
          derrotas: 10,
          winrate: 60.0,
          kda: 3.0,
          promedio_kda: { asesinatos: 7.0, muertes: 3.0, asistencias: 6.0 },
          cs_promedio: 160.0,
          cs_minuto: 7.0,
          amigo_principal: "johnadis-las",
        },
      ],
      por_linea: { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [] },
      resumen_lineas: {},
    },
  },
  por_amigo: {
    "johnadis-las": {
      dias_30: {
        total_partidas: 15,
        campeones: [
          {
            campeon_id: 112,
            campeon: "Viktor",
            partidas: 15,
            victorias: 10,
            derrotas: 5,
            winrate: 66.7,
            kda: 3.2,
            promedio_kda: { asesinatos: 7.2, muertes: 3.1, asistencias: 6.5 },
            cs: 2500,
            cs_promedio: 166.7,
            cs_minuto: 7.1,
          },
        ],
        por_linea: {
          TOP: [],
          JUNGLE: [],
          MIDDLE: [
            {
              campeon_id: 112,
              campeon: "Viktor",
              partidas: 15,
              victorias: 10,
              derrotas: 5,
              winrate: 66.7,
              kda: 3.2,
              promedio_kda: { asesinatos: 7.2, muertes: 3.1, asistencias: 6.5 },
              cs: 2500,
              cs_promedio: 166.7,
              cs_minuto: 7.1,
            },
          ],
          BOTTOM: [],
          UTILITY: [],
        },
        resumen_lineas: {
          TOP: { posicion: "TOP", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          JUNGLE: { posicion: "JUNGLE", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          MIDDLE: { posicion: "MIDDLE", partidas: 15, victorias: 10, derrotas: 5, winrate: 66.7, porcentaje: 100.0 },
          BOTTOM: { posicion: "BOTTOM", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          UTILITY: { posicion: "UTILITY", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
        },
      },
      todo: {
        total_partidas: 25,
        campeones: [
          {
            campeon_id: 112,
            campeon: "Viktor",
            partidas: 25,
            victorias: 15,
            derrotas: 10,
            winrate: 60.0,
            kda: 3.0,
            promedio_kda: { asesinatos: 7.0, muertes: 3.0, asistencias: 6.0 },
            cs: 4000,
            cs_promedio: 160.0,
            cs_minuto: 7.0,
          },
        ],
        por_linea: {
          TOP: [],
          JUNGLE: [],
          MIDDLE: [
            {
              campeon_id: 112,
              campeon: "Viktor",
              partidas: 25,
              victorias: 15,
              derrotas: 10,
              winrate: 60.0,
              kda: 3.0,
              promedio_kda: { asesinatos: 7.0, muertes: 3.0, asistencias: 6.0 },
              cs: 4000,
              cs_promedio: 160.0,
              cs_minuto: 7.0,
            },
          ],
          BOTTOM: [],
          UTILITY: [],
        },
        resumen_lineas: {},
      },
    },
    "iskrat-las": {
      dias_30: {
        total_partidas: 10,
        campeones: [
          {
            campeon_id: 115,
            campeon: "Ziggs",
            partidas: 10,
            victorias: 5,
            derrotas: 5,
            winrate: 50.0,
            kda: 2.1,
            promedio_kda: { asesinatos: 5.0, muertes: 4.0, asistencias: 8.0 },
            cs: 1400,
            cs_promedio: 140.0,
            cs_minuto: 6.2,
          },
        ],
        por_linea: {
          TOP: [],
          JUNGLE: [],
          MIDDLE: [],
          BOTTOM: [
            {
              campeon_id: 115,
              campeon: "Ziggs",
              partidas: 10,
              victorias: 5,
              derrotas: 5,
              winrate: 50.0,
              kda: 2.1,
              promedio_kda: { asesinatos: 5.0, muertes: 4.0, asistencias: 8.0 },
              cs: 1400,
              cs_promedio: 140.0,
              cs_minuto: 6.2,
            },
          ],
          UTILITY: [],
        },
        resumen_lineas: {
          TOP: { posicion: "TOP", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          JUNGLE: { posicion: "JUNGLE", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          MIDDLE: { posicion: "MIDDLE", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          BOTTOM: { posicion: "BOTTOM", partidas: 10, victorias: 5, derrotas: 5, winrate: 50.0, porcentaje: 100.0 },
          UTILITY: { posicion: "UTILITY", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
        },
      },
    },
  },
};

describe("ModalCampeones", () => {
  it("renderiza el modal con el título y las pestañas de Global y amigos", () => {
    const onCerrar = vi.fn();
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={onCerrar}
      />,
    );

    // Título y selector de amigos
    expect(screen.getByRole("heading", { name: /Estadísticas de Campeones/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Global" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Johnadis" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ISkrat" })).toBeInTheDocument();

    // Campeones en la vista Global inicial
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();

    // Estadísticas
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("10V 5D")).toBeInTheDocument();
    expect(screen.getByText("3.20:1")).toBeInTheDocument();
  });

  it("filtra por línea al hacer clic en un rol y permite volver a todas", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // Ambos campeones visibles inicialmente
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();

    // Clic en ADC (Bottom)
    const botonAdc = screen.getByRole("button", { name: /ADC/i });
    fireEvent.click(botonAdc);

    // Solo Ziggs debe estar visible
    expect(screen.queryByText("Viktor")).not.toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();

    // Clic en "Ver todas las líneas"
    const botonTodas = screen.getByText("Ver todas las líneas");
    fireEvent.click(botonTodas);

    // Vuelven ambos
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();
  });

  it("cambia de pestaña a un amigo específico y muestra solo sus campeones", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // Cambiar a Johnadis
    const tabJohnadis = screen.getByRole("tab", { name: "Johnadis" });
    fireEvent.click(tabJohnadis);

    // Solo debe verse Viktor
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.queryByText("Ziggs")).not.toBeInTheDocument();

    // Cambiar a ISkrat
    const tabIskrat = screen.getByRole("tab", { name: "ISkrat" });
    fireEvent.click(tabIskrat);

    // Solo debe verse Ziggs
    expect(screen.queryByText("Viktor")).not.toBeInTheDocument();
    expect(screen.getByText("Ziggs")).toBeInTheDocument();
  });

  it("cambia de período temporal y muestra los datos correspondientes", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // Cambiar a 2026
    const botonTotal = screen.getByRole("button", { name: "2026" });
    fireEvent.click(botonTotal);

    // En todo el registro para el mock, Viktor tiene 25 partidas y Ziggs no está en todo
    expect(screen.getByText("Viktor")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("ordena por KDA y por Winrate al hacer clic en los encabezados", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // Por defecto ordenado por partidas desc: Viktor (15) primero, Ziggs (10) segundo
    let celdas = screen.getAllByRole("cell");
    let nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Viktor");
    expect(nombres[1]).toHaveTextContent("Ziggs");

    // Clic en KDA: por defecto desc (Viktor 3.2, Ziggs 2.1)
    const botonKda = screen.getByRole("button", { name: /KDA/i });
    fireEvent.click(botonKda);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Viktor");

    // Clic en KDA de nuevo: asc (Ziggs 2.1, Viktor 3.2)
    fireEvent.click(botonKda);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Ziggs");
    expect(nombres[1]).toHaveTextContent("Viktor");

    // Clic en Winrate: desc (Viktor 66.7%, Ziggs 50%)
    const botonWinrate = screen.getByRole("button", { name: /Winrate/i });
    fireEvent.click(botonWinrate);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Viktor");
    expect(nombres[1]).toHaveTextContent("Ziggs");

    // Clic en Winrate asc (Ziggs 50%, Viktor 66.7%)
    fireEvent.click(botonWinrate);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Ziggs");
    expect(nombres[1]).toHaveTextContent("Viktor");
    // Clic en Campeón: asc (Viktor, Ziggs)
    const botonCampeon = screen.getByRole("button", { name: /Campeón/i });
    fireEvent.click(botonCampeon);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Viktor");
    expect(nombres[1]).toHaveTextContent("Ziggs");

    // Clic en Campeón de nuevo: desc (Ziggs, Viktor)
    fireEvent.click(botonCampeon);
    celdas = screen.getAllByRole("cell");
    nombres = celdas.filter((c) => c.textContent.includes("Viktor") || c.textContent.includes("Ziggs"));
    expect(nombres[0]).toHaveTextContent("Ziggs");
    expect(nombres[1]).toHaveTextContent("Viktor");
  });

  it("en vista global muestra filas separadas por jugador para comparar el mismo campeón", () => {
    const campeonesConMismoCampeon = {
      global: {
        dias_30: {
          total_partidas: 15,
          campeones: [],
          por_linea: {},
          resumen_lineas: {},
        },
      },
      por_amigo: {
        "johnadis-las": {
          dias_30: {
            total_partidas: 5,
            campeones: [
              {
                campeon_id: 115,
                campeon: "Ziggs",
                partidas: 5,
                victorias: 4,
                derrotas: 1,
                winrate: 80.0,
                kda: 4.5,
                promedio_kda: { asesinatos: 8.0, muertes: 2.0, asistencias: 9.0 },
                cs_promedio: 150,
                cs_minuto: 7.0,
              },
            ],
            por_linea: {},
            resumen_lineas: {},
          },
        },
        "iskrat-las": {
          dias_30: {
            total_partidas: 10,
            campeones: [
              {
                campeon_id: 115,
                campeon: "Ziggs",
                partidas: 10,
                victorias: 5,
                derrotas: 5,
                winrate: 50.0,
                kda: 2.1,
                promedio_kda: { asesinatos: 5.0, muertes: 4.0, asistencias: 8.0 },
                cs_promedio: 140,
                cs_minuto: 6.2,
              },
            ],
            por_linea: {},
            resumen_lineas: {},
          },
        },
      },
    };

    render(
      <ModalCampeones
        campeones={campeonesConMismoCampeon}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // Ambas filas de Ziggs deben estar presentes con sus insignias de jugador
    expect(screen.getAllByText("Johnadis").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("ISkrat").length).toBeGreaterThanOrEqual(2);

    const filasZiggs = screen.getAllByRole("row").slice(1); // omitir thead
    expect(filasZiggs).toHaveLength(2);

    // Por defecto ordenado por partidas desc: ISkrat (10 partidas) primero, Johnadis (5) segundo
    expect(filasZiggs[0]).toHaveTextContent("ISkrat");
    expect(filasZiggs[0]).toHaveTextContent("50%");
    expect(filasZiggs[1]).toHaveTextContent("Johnadis");
    expect(filasZiggs[1]).toHaveTextContent("80%");

    // Al ordenar por KDA desc: Johnadis (4.50) debe estar primero que ISkrat (2.10)
    const botonKda = screen.getByRole("button", { name: /KDA/i });
    fireEvent.click(botonKda);

    const filasOrdenadasKda = screen.getAllByRole("row").slice(1);
    expect(filasOrdenadasKda[0]).toHaveTextContent("Johnadis");
    expect(filasOrdenadasKda[0]).toHaveTextContent("4.50:1");
    expect(filasOrdenadasKda[1]).toHaveTextContent("ISkrat");
    expect(filasOrdenadasKda[1]).toHaveTextContent("2.10:1");
  });

  it("renderiza barras horizontales con estilos destacados y desglose de KDA coloreado", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
      />,
    );

    // KDA desglose con colores: asesinatos (verde), muertes (rojo), asistencias (dorado)
    const spanAsesinatos = screen.getByText("7.2");
    const spanMuertes = screen.getByText("3.1");
    const spanAsistencias = screen.getByText("6.5");

    expect(spanAsesinatos).toHaveClass("text-victoria");
    expect(spanMuertes).toHaveClass("text-derrota");
    expect(spanAsistencias).toHaveClass("text-sapo");

    // Barras de partidas (cian) y winrate (victoria/derrota)
    const barrasCian = document.querySelectorAll(".bg-cyan-400");
    expect(barrasCian.length).toBeGreaterThan(0);

    const barrasVictoria = document.querySelectorAll(".bg-victoria");
    expect(barrasVictoria.length).toBeGreaterThan(0);
  });

  it("llama a onCerrar al hacer clic en el botón de cerrar ✕", () => {
    const onCerrar = vi.fn();
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={onCerrar}
      />,
    );

    const botonCerrar = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(botonCerrar);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("permite abrir el modal con amigoInicial, periodoInicial y lineaInicial preseleccionados", () => {
    render(
      <ModalCampeones
        campeones={campeonesMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={vi.fn()}
        amigoInicial="iskrat-las"
        periodoInicial="dias_30"
        lineaInicial="BOTTOM"
      />,
    );

    // Título con el amigo preseleccionado
    expect(screen.getByRole("heading", { name: /Estadísticas de Campeones.*ISkrat/ })).toBeInTheDocument();

    // Pestaña de jugador preseleccionada
    expect(screen.getByRole("tab", { name: /ISkrat/i })).toHaveAttribute("aria-selected", "true");

    // Botón de la línea ADC / Tirador preseleccionado
    const botonAdc = screen.getByRole("button", { name: /ADC/i });
    expect(botonAdc).toHaveAttribute("aria-pressed", "true");
  });
});
