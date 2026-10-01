import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilaPartida } from "./FilaPartida.jsx";
import { SeccionEnPartida } from "./SeccionEnPartida.jsx";
import { FilaAmigo } from "./FilaAmigo.jsx";
import { Ranking } from "./Ranking.jsx";
import { Encabezado } from "./Encabezado.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { AHORA, crearDatos, ddragon, partidaAram, partidaCompleta, partidaEnVivo, partidaRanked } from "../test/fixtures/lol.js";

describe("FilaPartida", () => {
  it("muestra una partida completa al estilo op.gg", () => {
    render(<FilaPartida partida={partidaCompleta} ddragon={ddragon} ahora={AHORA} slugPropio="rana-azul-las" />);
    const fila = screen.getByRole("article");
    expect(fila).toHaveClass("bg-derrota-fondo");
    expect(within(fila).getByText("Derrota")).toBeInTheDocument();
    expect(within(fila).getByText("Normal (Reclutamiento)")).toBeInTheDocument();
    expect(within(fila).getByText("hace 18 horas")).toBeInTheDocument();
    expect(within(fila).getByText("31 min")).toBeInTheDocument();
    expect(within(fila).getByLabelText("KDA 17 / 6 / 3")).toBeInTheDocument();
    expect(within(fila).getByText("3.33 KDA")).toBeInTheDocument();
    expect(within(fila).getByText("177 CS")).toBeInTheDocument();
    expect(within(fila).getByText("65%")).toBeInTheDocument();
    expect(within(fila).getByLabelText("Nivel 17")).toBeInTheDocument();
    expect(within(fila).getByAltText("Destello")).toBeInTheDocument();
    expect(within(fila).getByAltText("Incendiar")).toBeInTheDocument();
    expect(within(fila).getByAltText("Electrocutar")).toBeInTheDocument();
    expect(within(fila).getByAltText("Precisión")).toBeInTheDocument();

    const items = within(screen.getByRole("list", { name: "Ítems" })).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(screen.getAllByLabelText("Espacio vacío")).toHaveLength(4);
    expect(screen.getByAltText("Tormenta de Luden")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/item/6655.png",
    );
  });

  it("agrupa participantes por equipo y destaca al grupo", () => {
    render(<FilaPartida partida={partidaCompleta} ddragon={ddragon} ahora={AHORA} slugPropio="rana-azul-las" />);
    const azul = screen.getByRole("list", { name: "Equipo azul" });
    const rojo = screen.getByRole("list", { name: "Equipo rojo" });
    expect(within(azul).getAllByRole("listitem")).toHaveLength(5);
    expect(within(rojo).getAllByRole("listitem")).toHaveLength(5);
    const propio = within(azul).getByText("Rana Azul#LAS");
    expect(propio).toHaveClass("font-bold");
    expect(within(azul).getByText("Sapito#LAS")).toHaveClass("text-sapo");
    // Nombre oculto (modo streamer): se muestra el campeón.
    expect(within(azul).getByText("Amumu")).toBeInTheDocument();
  });

  it("marca las ranked y el KDA perfecto", () => {
    render(<FilaPartida partida={partidaRanked} ddragon={ddragon} ahora={AHORA} />);
    expect(screen.getByText("Victoria")).toBeInTheDocument();
    expect(screen.getByText("(ranked)")).toBeInTheDocument();
    expect(screen.getByText("KDA perfecto")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("bg-victoria-fondo");
  });

  it("tolera partidas antiguas sin ítems, runas ni participantes", () => {
    render(<FilaPartida partida={partidaAram} ddragon={ddragon} ahora={AHORA} />);
    expect(screen.getByText("Remake")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Ítems" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Equipo azul" })).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument(); // P. en asesinatos sin dato
  });

  it("no se rompe sin Data Dragon ni datos", () => {
    render(<FilaPartida partida={{}} ddragon={null} ahora={AHORA} />);
    expect(screen.getByText("Sin resultado")).toBeInTheDocument();
    expect(screen.getByText("Modo especial")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Campeón desconocido" })).toBeInTheDocument();
  });
});

describe("SeccionEnPartida", () => {
  it("dice que nadie está en partida dentro de un panel de alto fijo", () => {
    render(<SeccionEnPartida enVivo={[]} ddragon={ddragon} actualizadoMs={AHORA} ahora={AHORA} />);
    const texto = screen.getByText("Nadie en partida.");
    expect(texto.parentElement).toHaveClass("min-h-32");
  });

  it("agrupa equipos de Arena en columnas", () => {
    const arena = {
      id: "a",
      modo: "Arena",
      categoria: "otros",
      inicio: AHORA - 60000,
      equipos: [1, 2, 3, 4].map((n) => ({ equipo: n, jugadores: [{ campeon_id: 1, equipo: n, nombre: null, amigo: null }] })),
    };
    render(<SeccionEnPartida enVivo={[arena]} ddragon={ddragon} actualizadoMs={AHORA} ahora={AHORA} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Equipo 1",
      "Equipo 2",
      "Equipo 3",
      "Equipo 4",
    ]);
  });

  it("muestra una partida con varios amigos una sola vez", () => {
    const { container } = render(
      <SeccionEnPartida enVivo={[partidaEnVivo]} ddragon={ddragon} actualizadoMs={AHORA} ahora={AHORA} />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("ARAM")).toBeInTheDocument();
    expect(screen.getByText("14 min de partida")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipo azul" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipo rojo" })).toBeInTheDocument();
    // Dos amigos destacados, con anillo.
    expect(container.querySelectorAll('[data-amigo="true"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-en-partida="true"]')).toHaveLength(2);
    expect(screen.getAllByText("(del grupo)")).toHaveLength(2);
    expect(screen.getByText("Rana Azul#LAS")).toHaveClass("text-sapo");
  });

  it("con nombre oculto muestra solo el campeón", () => {
    render(<SeccionEnPartida enVivo={[partidaEnVivo]} ddragon={ddragon} actualizadoMs={AHORA} ahora={AHORA} />);
    // Sapito juega Ashe con nombre null: aparece "Ashe" como nombre principal.
    expect(screen.getByText("Ashe")).toHaveClass("text-sapo");
    expect(screen.getByText("Garen")).toBeInTheDocument();
    expect(screen.getByAltText("Ahri")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/Ahri.png",
    );
  });

  it("aguanta partidas sin equipos ni tiempo", () => {
    render(<SeccionEnPartida enVivo={[{ id: "z", modo: null }]} ddragon={null} actualizadoMs={null} ahora={AHORA} />);
    expect(screen.getByText("Tiempo desconocido")).toBeInTheDocument();
    expect(screen.getByText("No hay datos de los equipos.")).toBeInTheDocument();
  });
});

describe("FilaAmigo (acordeón)", () => {
  const datos = crearDatos();
  const [rana, sapito, charco] = datos.amigos;

  function renderFila(amigo, props = {}) {
    const onAlternar = vi.fn();
    const utils = render(
      <ul>
        <FilaAmigo amigo={amigo} ddragon={ddragon} ahora={AHORA} abierto={false} onAlternar={onAlternar} {...props} />
      </ul>,
    );
    return { ...utils, onAlternar };
  }

  it("muestra el resumen con rangos y registro", () => {
    renderFila(rana);
    expect(screen.getByRole("button", { name: /Rana Azul#LAS/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Nivel 312")).toBeInTheDocument();
    expect(screen.getByText("Platino IV")).toBeInTheDocument();
    expect(screen.getByText("Sin clasificar")).toBeInTheDocument();
    expect(screen.getByText(/45 LP/)).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument(); // Solo/Dúo 30V 25D
    expect(screen.getByText("50%")).toBeInTheDocument(); // Total
    expect(screen.getByText("3 partidas")).toBeInTheDocument();
  });

  it("no renderiza partidas hasta abrir y avisa al presionar", async () => {
    const { onAlternar } = renderFila(rana);
    expect(screen.queryByText("Últimas partidas")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Rana Azul#LAS/ }));
    expect(onAlternar).toHaveBeenCalledWith("rana-azul-las");
  });

  it("abierto muestra aviso, filtros, desglose y partidas", async () => {
    renderFila(rana, { abierto: true });
    expect(screen.getByRole("button", { name: /Rana Azul#LAS/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Contando desde 12 sept? 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Rankeds" }));
    expect(screen.getByRole("button", { name: "Rankeds" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Victoria")).toBeInTheDocument();
    const desglose = screen.getByRole("list", { name: "Desglose por modo" });
    expect(within(desglose).getAllByRole("listitem")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Normales" }));
    expect(screen.getByText("Derrota")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ARAM" }));
    expect(screen.getByText("Remake")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Otros" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("No hay partidas de Otros entre las últimas 10. Prueba con Todos.")).toBeInTheDocument();
    expect(screen.getByText("Sin partidas registradas en este filtro.")).toBeInTheDocument();
  });

  it("muestra el estado vacío de un amigo sin partidas", () => {
    renderFila(sapito, { abierto: true });
    expect(screen.getByText("Sin partidas")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay partidas registradas.")).toBeInTheDocument();
  });

  it("muestra el error de un amigo sin romper la fila", () => {
    renderFila(charco, { abierto: true });
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar sus datos");
    expect(screen.getByText(/Riot ID no encontrado/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ícono de Charco#LAS" })).toBeInTheDocument();
  });

  it("marca En partida con texto y anillo", () => {
    const jugando = { ...rana, jugando: { partida_id: "LA2_99", campeon_id: 103, queue_id: 450 } };
    const { container } = renderFila(jugando);
    expect(screen.getByText("En partida · Ahri")).toBeInTheDocument();
    expect(container.querySelector(".saco-vocal")).not.toBeNull();
  });
});

describe("Ranking", () => {
  it("lista por posición, marca el primero y explica el criterio", async () => {
    const datos = crearDatos();
    const onElegir = vi.fn();
    render(<Ranking ranking={[...datos.ranking].reverse()} amigos={datos.amigos} onElegir={onElegir} />);
    const filas = screen.getAllByRole("link");
    expect(filas[0]).toHaveTextContent("Rana Azul#LAS");
    expect(filas[0]).toHaveTextContent("Primero");
    expect(filas[0]).toHaveTextContent("Platino IV · 45 LP");
    expect(filas[1]).toHaveTextContent("Sin Solo/Dúo · winrate —");
    expect(filas[0]).toHaveAttribute("href", "#/amigo/rana-azul-las");
    await userEvent.click(filas[1]);
    expect(onElegir).toHaveBeenCalledWith("sapito-las");
  });

  it("muestra estado vacío", () => {
    render(<Ranking ranking={[]} amigos={[]} />);
    expect(screen.getByText("Todavía no hay ranking.")).toBeInTheDocument();
  });
});

describe("Encabezado e imágenes", () => {
  it("muestra hace cuánto se consultó a Riot", () => {
    const iso = new Date(AHORA - 12 * 60 * 1000).toISOString();
    render(<Encabezado actualizado={iso} ahora={AHORA} falloActualizar={false} />);
    expect(screen.getByText(/Datos de Riot:/)).toHaveTextContent("Datos de Riot: hace 12 minutos");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("avisa de forma discreta si falló la actualización", () => {
    render(<Encabezado actualizado={null} ahora={AHORA} falloActualizar />);
    expect(screen.getByText("Datos de Riot: sin fecha")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo actualizar, se reintentará en 2 minutos.");
  });

  it("cambia a iniciales si la imagen falla", () => {
    render(<ImagenDD src="https://ddragon.leagueoflegends.com/x.png" alt="Miss Fortune" />);
    fireEvent.error(screen.getByAltText("Miss Fortune"));
    expect(screen.getByRole("img", { name: "Miss Fortune" })).toHaveTextContent("MF");
  });
});
