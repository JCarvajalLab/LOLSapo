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
  const amigos = crearDatos().amigos;

  function renderVivo(enVivo = [partidaEnVivo]) {
    return render(
      <SeccionEnPartida enVivo={enVivo} ddragon={ddragon} amigos={amigos} actualizadoMs={AHORA} ahora={AHORA} />,
    );
  }

  function filaDe(texto) {
    return screen.getByText(texto).closest("li");
  }

  it("dice que nadie está en partida dentro de un panel de alto fijo", () => {
    renderVivo([]);
    const texto = screen.getByText("Nadie en partida.");
    expect(texto.parentElement).toHaveClass("min-h-32");
  });

  it("cada partida ocupa el ancho completo, una debajo de otra", () => {
    renderVivo([partidaEnVivo, { ...partidaEnVivo, id: "otra" }]);
    const lista = screen.getByRole("list", { name: "Partidas en curso" });
    expect(lista).toHaveClass("flex-col");
    expect(lista.className).not.toMatch(/grid-cols/);
    const items = [...lista.children];
    expect(items).toHaveLength(2);
    for (const item of items) expect(item).toHaveClass("w-full");
    expect(screen.getAllByRole("article")[0]).toHaveClass("w-full");
  });

  it("encabezado con modo, minutos y amigos en la partida", () => {
    renderVivo();
    const header = screen.getByRole("article").querySelector("header");
    expect(header).toHaveTextContent("ARAM");
    expect(header).toHaveTextContent("14 min de partida");
    expect(header).toHaveTextContent("Rana Azul y Sapito");
  });

  it("equipos con encabezado y la misma grilla en todas las filas", () => {
    renderVivo();
    expect(screen.getByRole("heading", { name: "Equipo azul" })).toHaveClass("text-ranked");
    expect(screen.getByRole("heading", { name: "Equipo rojo" })).toHaveClass("text-derrota/80");
    const azul = screen.getByRole("list", { name: "Jugadores del equipo azul" });
    const rojo = screen.getByRole("list", { name: "Jugadores del equipo rojo" });
    const filas = [...azul.children, ...rojo.children];
    expect(filas).toHaveLength(5);
    const clases = new Set(filas.map((f) => f.className.replace("bg-sapo-fondo", "").trim()));
    expect(clases.size).toBe(1);
  });

  it("muestra rangos: con división, sin rango y Maestro sin división", () => {
    renderVivo();
    expect(within(filaDe("Rana Azul#LAS")).getByText("Diamante IV · 45 LP")).toHaveClass("cifras");
    expect(within(filaDe("Desconocido Uno#AAA")).getByText("Maestro · 250 LP")).toBeInTheDocument();
    expect(within(filaDe("Rival Uno#CCC")).getByText("Oro I · 0 LP")).toBeInTheDocument();
    expect(within(filaDe("Ashe")).getByText("Sin clasificar")).toHaveClass("text-texto-suave");
  });

  it("muestra hechizos y runas de cada jugador", () => {
    renderVivo();
    const fila = filaDe("Rana Azul#LAS");
    expect(within(fila).getByAltText("Destello")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/spell/SummonerFlash.png",
    );
    expect(within(fila).getByAltText("Incendiar")).toBeInTheDocument();
    expect(within(fila).getByAltText("Electrocutar")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png",
    );
    expect(within(fila).getByAltText("Precisión")).toBeInTheDocument();
  });

  it("modo streamer: campeón como texto principal y aviso debajo", () => {
    renderVivo();
    const fila = filaDe("Garen");
    expect(within(fila).getByText("Modo streamer")).toHaveClass("text-texto-suave");
    // Jugador sin hechizos, runas ni rango: la fila no se rompe.
    expect(within(fila).getByText("Sin clasificar")).toBeInTheDocument();
  });

  it("destaca a los amigos con color y anillo", () => {
    const { container } = renderVivo();
    expect(container.querySelectorAll('li[data-amigo="true"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-en-partida="true"]')).toHaveLength(2);
    expect(screen.getAllByText("(del grupo)")).toHaveLength(2);
    expect(screen.getByText("Rana Azul#LAS")).toHaveClass("text-sapo");
    expect(filaDe("Rana Azul#LAS")).toHaveClass("bg-sapo-fondo");
    expect(screen.getByText("Ashe")).toHaveClass("text-sapo");
    expect(filaDe("Rival Uno#CCC")).not.toHaveClass("bg-sapo-fondo");
  });

  it("muestra baneos en gris solo si el equipo tiene", () => {
    renderVivo();
    const baneosAzul = screen.getByRole("list", { name: "Baneos del equipo azul" });
    const imgs = within(baneosAzul).getAllByRole("img");
    expect(imgs.map((i) => i.getAttribute("alt"))).toEqual(["Caitlyn", "Miss Fortune"]);
    expect(imgs[0]).toHaveAttribute("title", "Caitlyn");
    expect(imgs[0]).toHaveClass("grayscale");
    expect(screen.queryByRole("list", { name: "Baneos del equipo rojo" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Baneos:")).toHaveLength(1);
  });

  it("agrupa equipos de Arena en una grilla automática", () => {
    const arena = {
      id: "a",
      modo: "Arena",
      categoria: "otros",
      inicio: AHORA - 60000,
      equipos: [1, 2, 3, 4].map((n) => ({ equipo: n, jugadores: [{ campeon_id: 1, equipo: n, nombre: null, amigo: null }] })),
    };
    renderVivo([arena]);
    const titulos = screen.getAllByRole("heading", { level: 3 });
    expect(titulos.map((h) => h.textContent)).toEqual(["Equipo 1", "Equipo 2", "Equipo 3", "Equipo 4"]);
    expect(titulos[0].parentElement.parentElement.className).toMatch(/auto-fill/);
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
