import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { useAmigosAbiertosLocal } from "../rutas/useAmigosAbiertos.js";
import { VistaTft } from "./VistaTft.jsx";
import { EsqueletoPagina } from "./Esqueleto.jsx";
import { FilaAmigoTftEsqueleto } from "./FilaAmigoTft.jsx";
import { FilaPartidaTft } from "./FilaPartidaTft.jsx";
import { SeccionEnPartidaTft } from "./SeccionEnPartidaTft.jsx";
import { crearDatos } from "../test/fixtures/lol.js";
import { AHORA, crearDatosTft, ddragonTft, fetchPorRuta, partidaEnVivoTft, partidaTft } from "../test/fixtures/tft.js";

const MIN = 60 * 1000;

/** VistaTft con el estado real del acordeón. */
function Vista({ datos, error = null, ahora = AHORA }) {
  const abiertos = useAmigosAbiertosLocal();
  return <VistaTft datos={datos} error={error} ahora={ahora} {...abiertos} />;
}

function renderVista(datos, opciones) {
  return render(<Vista datos={datos} {...opciones} />);
}

async function abrir(riotId) {
  const boton = screen.getByRole("button", { name: riotId });
  await userEvent.click(boton);
  return boton;
}

describe("vista de TFT con datos", () => {
  it("muestra En partida, ranking y una fila por amigo", () => {
    renderVista(crearDatosTft());
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "●En partida",
      "Ranking",
      "Amigos",
    ]);
    expect(screen.getByText("Nadie en partida.")).toBeInTheDocument();

    const ranking = screen.getAllByRole("link");
    expect(ranking[0]).toHaveTextContent("Croac#LAS");
    expect(ranking[0]).toHaveTextContent("Primero · Platino II · 61 LP");
    expect(ranking[0]).toHaveAttribute("href", "#/tft");
    expect(ranking[2]).toHaveTextContent("Sin Ranked · top 4 —");

    const filas = screen.getAllByRole("button");
    // Las filas van por partidas registradas (12, 3, 0), no por el orden del JSON.
    expect(filas.map((b) => b.textContent)).toEqual(["Croac#LAS", "Lodo#LAS", "Renacuaja#LAS"]);
    const croac = filas[0].closest("li");
    expect(croac).toHaveTextContent("Platino II · 61 LP");
    expect(croac).toHaveTextContent("58%");
    expect(croac).toHaveTextContent("3,9");
    expect(croac).toHaveTextContent("12");
    expect(filas[2].closest("li")).toHaveTextContent("Sin rango");
  });

  it("todas las filas usan la misma grilla de alto fijo", () => {
    const { container } = renderVista(crearDatosTft());
    const grillas = [...container.querySelectorAll("section[aria-labelledby='titulo-tft-amigos'] ul > li > div:first-child")].map(
      (d) => d.className,
    );
    expect(grillas).toHaveLength(3);
    expect(new Set(grillas).size).toBe(1);
    expect(grillas[0]).toContain("sm:h-[78px]");
  });

  it("el esqueleto de carga usa la misma grilla que las filas reales", () => {
    const real = renderVista(crearDatosTft()).container.querySelector("section[aria-labelledby='titulo-tft-amigos'] ul > li > div");
    const { container } = render(<EsqueletoPagina FilaEsqueleto={FilaAmigoTftEsqueleto} etiqueta="Cargando datos de TFT…" />);
    const esqueleto = container.querySelector("ul > li[data-esqueleto] > div");
    const grilla = (el) => el.className.split(" ").filter((c) => c.includes("grid") || c.includes("h-["));
    expect(grilla(esqueleto)).toEqual(grilla(real));
  });

  it("el acordeón abre y cierra el panel del amigo", async () => {
    renderVista(crearDatosTft());
    const boton = await abrir("Croac#LAS");
    expect(boton).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(boton.getAttribute("aria-controls"));
    expect(panel).toBeVisible();

    const rangos = within(panel).getByRole("list", { name: "Rangos" });
    expect(rangos).toHaveTextContent("RankedPlatino II · 61 LP");
    expect(rangos).toHaveTextContent("30 top 4 en 50 partidas · 60%");
    expect(rangos).toHaveTextContent("Dúo dinámicoOro I · 12 LP");
    expect(rangos).toHaveTextContent("Hyper RollMorado · 3100 puntos");
    expect(within(rangos).getByText("Morado")).toHaveClass("text-costo-4");

    const desglose = within(panel).getByRole("list", { name: "Desglose por modo" });
    expect(desglose).toHaveTextContent("Clasificatoria · 10 partidas");
    expect(desglose).toHaveTextContent("Top 4 60% · Prom. 3,8");

    expect(within(panel).getAllByRole("article")).toHaveLength(6);

    await userEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
  });

  it("amigo sin partidas ni rangos muestra estados vacíos", async () => {
    renderVista(crearDatosTft());
    const boton = await abrir("Renacuaja#LAS");
    const panel = document.getElementById(boton.getAttribute("aria-controls"));
    expect(panel).toHaveTextContent("Sin rango en ninguna cola de TFT esta temporada.");
    expect(panel).toHaveTextContent("Sin partidas registradas todavía.");
    expect(panel).toHaveTextContent("Todavía no hay partidas de TFT registradas.");
  });

  it("clic en el ranking abre la fila del amigo", async () => {
    renderVista(crearDatosTft());
    await userEvent.click(screen.getAllByRole("link")[1]);
    expect(screen.getByRole("button", { name: "Lodo#LAS" })).toHaveAttribute("aria-expanded", "true");
  });

  it("sin amigos muestra un estado vacío", () => {
    renderVista(crearDatosTft({ amigos: [], ranking: [] }));
    expect(screen.getByText(/No hay amigos configurados/)).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay ranking.")).toBeInTheDocument();
  });
});

describe("orden de las filas de amigos en TFT", () => {
  const conTotal = (amigo, total) => ({ ...amigo, estadisticas: { ...amigo.estadisticas, total } });

  it("más partidas primero; empate por top 4 % (null al final) y luego Riot ID", () => {
    const base = crearDatosTft();
    const [croac, renacuaja, lodo] = base.amigos;
    const amigos = [
      conTotal(croac, { partidas: 5, top4_pct: null }),
      conTotal(renacuaja, { partidas: 5, top4_pct: 40 }),
      conTotal(lodo, { partidas: 20, top4_pct: 10 }),
      conTotal({ ...croac, slug: "barro-las", riot_id: "barro#LAS" }, { partidas: 5, top4_pct: 40 }),
    ];
    renderVista(crearDatosTft({ amigos }));
    const filas = within(screen.getByRole("region", { name: "Amigos" })).getAllByRole("button", { expanded: false });
    expect(filas.map((b) => b.textContent)).toEqual(["Lodo#LAS", "barro#LAS", "Renacuaja#LAS", "Croac#LAS"]);
  });

  it("el ranking conserva el orden de ranking", () => {
    renderVista(crearDatosTft());
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      expect.stringContaining("Croac#LAS"),
      expect.stringContaining("Lodo#LAS"),
      expect.stringContaining("Renacuaja#LAS"),
    ]);
  });
});

describe("partida de TFT", () => {
  function renderPartida(puesto, cambios, ddragon = ddragonTft) {
    return render(<FilaPartidaTft partida={partidaTft(puesto, cambios)} ddragon={ddragon} ahora={AHORA} slugPropio="croac-las" />);
  }

  it.each([
    [1, "primero", "text-oro", "border-l-oro"],
    [2, "top4", "text-victoria", "border-l-victoria"],
    [4, "top4", "text-victoria", "border-l-victoria"],
    [5, "abajo", "text-derrota", "border-l-derrota"],
    [8, "abajo", "text-derrota", "border-l-derrota"],
  ])("puesto %i: número en texto y color %s", (puesto, grupo, texto, borde) => {
    renderPartida(puesto);
    const articulo = screen.getByRole("article");
    expect(articulo).toHaveAttribute("data-puesto", grupo);
    expect(articulo).toHaveClass(borde);
    const marca = articulo.querySelector("[data-puesto]:not(article)");
    expect(marca).toHaveClass(texto);
    expect(marca).toHaveTextContent(`${puesto}.º puesto`);
  });

  it("muestra modo, fecha, duración, nivel, rasgos y unidades con estrellas e ítems", () => {
    renderPartida(1);
    const articulo = screen.getByRole("article", { name: "1.º puesto, Clasificatoria" });
    expect(articulo).toHaveTextContent("Clasificatoria");
    expect(articulo).toHaveTextContent("hace 1 hora");
    expect(articulo).toHaveTextContent("35 min");
    expect(articulo).toHaveTextContent("Nivel 8 · 2 eliminados");

    const rasgos = within(articulo).getAllByRole("listitem").filter((li) => li.hasAttribute("data-estilo"));
    expect(rasgos.map((r) => r.getAttribute("data-estilo"))).toEqual(["4", "1", "3"]);
    expect(rasgos[2]).toHaveAttribute("data-unico", "true");
    expect(screen.getByAltText("Anfibio (4), nivel prismático")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/99.1.1/img/tft-trait/Trait_Icon_X_Anfibio.png",
    );
    expect(rasgos[0].querySelector("span")).toHaveClass("bg-rasgo-prisma");

    expect(screen.getByAltText("Nenúfar, 2 estrellas, costo 5")).toBeInTheDocument();
    expect(screen.getByAltText("Charca, 3 estrellas, costo 4").parentElement).toHaveClass("border-costo-4");
    const items = screen.getByRole("list", { name: "Ítems de Nenúfar" });
    expect(within(items).getAllByRole("img").map((i) => i.getAttribute("alt") ?? i.getAttribute("aria-label"))).toEqual([
      "Espada de Caña",
      "Escudo de Hoja",
      "Desconocido",
    ]);
  });

  it("oculta el daño si es 0 y lo muestra si no", () => {
    const { unmount } = renderPartida(3);
    expect(screen.getByRole("article")).not.toHaveTextContent("de daño");
    unmount();
    renderPartida(3, { danio: 12345 });
    expect(screen.getByRole("article")).toHaveTextContent("12.345 de daño");
  });

  it("resalta al amigo y al resto del grupo en el lobby", () => {
    renderPartida(2);
    const lobby = screen.getByRole("list", { name: "Lobby" });
    const filas = within(lobby).getAllByRole("listitem");
    expect(filas).toHaveLength(8);
    expect(filas[1]).toHaveAttribute("data-propio", "true");
    expect(filas[1]).toHaveTextContent("Croac#LAS");
    expect(filas[7]).toHaveAttribute("data-amigo", "true");
    expect(filas[7]).toHaveTextContent("Renacuaja#LAS (del grupo)");
    expect(filas[3]).toHaveTextContent("Jugador oculto");
    expect(filas[0]).not.toHaveAttribute("data-amigo");
  });

  it("sin ddragon no muestra imágenes: usa nombres e iniciales", () => {
    const { container } = renderPartida(1, {}, null);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "Anfibio (4), nivel prismático" })).toHaveTextContent("A");
    expect(screen.getByRole("img", { name: "Charca, 3 estrellas, costo 5" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Espada" })).toHaveLength(2);
  });

  it("tolera una partida sin tablero ni lobby", () => {
    render(<FilaPartidaTft partida={{ id: "x", puesto: null }} ddragon={null} ahora={AHORA} />);
    const articulo = screen.getByRole("article", { name: "— puesto, Modo especial" });
    expect(articulo).toHaveTextContent("Sin datos del tablero.");
    expect(screen.queryByRole("list", { name: "Lobby" })).not.toBeInTheDocument();
  });
});

describe("en partida y avisos", () => {
  it("muestra la partida en vivo con los amigos resaltados", () => {
    const datos = crearDatosTft();
    const actualizadoMs = AHORA - 5 * MIN;
    datos.en_vivo = [partidaEnVivoTft(actualizadoMs)];
    datos.amigos[0].jugando = { partida_id: 777, queue_id: 1100, modo: "Clasificatoria", categoria: "ranked", inicio: null, duracion: 600 };
    const { container } = renderVista(datos);

    const enVivo = screen.getByRole("list", { name: "Partidas en curso" });
    expect(enVivo).toHaveTextContent("15 min de partida");
    expect(enVivo).toHaveTextContent("Croac y Renacuaja");
    const jugadores = within(enVivo).getAllByRole("listitem").filter((li) => li.closest("[aria-label='Jugadores del lobby']"));
    expect(jugadores).toHaveLength(8);
    expect(jugadores.filter((j) => j.dataset.amigo === "true").map((j) => j.textContent)).toEqual([
      "Croac#LAS (del grupo)",
      "Renacuaja#LAS (del grupo)",
    ]);
    expect(jugadores[3]).toHaveTextContent("Jugador oculto");

    const fila = screen.getByRole("button", { name: "Croac#LAS" }).closest("li");
    expect(fila).toHaveTextContent("En partida · Clasificatoria");
    expect(fila.querySelector('[data-en-partida="true"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-en-partida="true"]')).toHaveLength(1);
  });

  it("en_vivo_disponible false: solo una línea discreta", () => {
    renderVista(crearDatosTft({ en_vivo_disponible: false, en_vivo: [partidaEnVivoTft()] }));
    expect(screen.getByText("«Jugando ahora» no está disponible por el momento.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Partidas en curso" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nadie en partida.")).not.toBeInTheDocument();
  });

  it("muestra el aviso global sin romper la página", () => {
    const aviso = "No se pudieron consultar los datos de TFT: límite de Riot. Se muestran los últimos datos conocidos.";
    renderVista(crearDatosTft({ error: aviso }));
    expect(screen.getByRole("status")).toHaveTextContent(aviso);
    expect(screen.getByRole("button", { name: "Croac#LAS" })).toBeInTheDocument();
  });

  it("amigo con error: aviso discreto y sus últimos datos", () => {
    renderVista(crearDatosTft());
    const fila = screen.getByRole("button", { name: "Lodo#LAS" }).closest("li");
    expect(fila.querySelector('[data-aviso-error="true"]')).toHaveTextContent("Sin actualizar: se muestran sus últimos datos");
    expect(fila).toHaveTextContent("Plata IV");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sin ddragon la vista se ve igual, sin imágenes", async () => {
    const { container } = renderVista(crearDatosTft({ ddragon: null }));
    await abrir("Croac#LAS");
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(container.querySelector("img")).toBeNull();
  });

  it("datos de hace 20 min: aviso, partida atenuada y fila sin anillo", () => {
    const actualizadoMs = AHORA - 20 * MIN;
    const datos = crearDatosTft({ actualizado: new Date(actualizadoMs).toISOString(), en_vivo: [partidaEnVivoTft(actualizadoMs)] });
    datos.amigos[0].jugando = { modo: "Clasificatoria", categoria: "ranked" };
    const { container } = renderVista(datos);
    expect(screen.getByText(/Puede que estas partidas ya hayan terminado/)).toHaveTextContent("Datos de hace 20 min.");
    expect(container.querySelector('article[data-atenuada="true"]')).toHaveTextContent("10 min de partida (al consultar)");
    expect(container.querySelector('[data-en-partida="true"]')).toBeNull();
    expect(container.querySelector('[data-atenuado="true"]')).toHaveTextContent("En partida · Clasificatoria");
  });

  it("datos de hace 90 min: oculta En partida", () => {
    const actualizadoMs = AHORA - 90 * MIN;
    const datos = crearDatosTft({ actualizado: new Date(actualizadoMs).toISOString(), en_vivo: [partidaEnVivoTft(actualizadoMs)] });
    datos.amigos[0].jugando = { modo: "Clasificatoria", categoria: "ranked" };
    renderVista(datos);
    expect(screen.getByText(/No se puede saber quién está en partida ahora/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Partidas en curso" })).not.toBeInTheDocument();
    expect(screen.queryByText("En partida · Clasificatoria")).not.toBeInTheDocument();
  });

  it("la sección En partida no muestra nada si la lista viene vacía", () => {
    render(<SeccionEnPartidaTft enVivo={null} amigos={[]} actualizadoMs={AHORA} ahora={AHORA} />);
    expect(screen.getByText("Nadie en partida.")).toBeInTheDocument();
  });
});

describe("carga de tft.json en la app", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/#/tft");
  });

  it("404: estado vacío claro", async () => {
    render(<App fetchFn={fetchPorRuta({ lol: crearDatos(), tft: 404 })} />);
    expect(await screen.findByText(/Todavía no hay datos de TFT/)).toHaveTextContent(
      "Corre el recolector (python -m lolsapo) para generar datos/tft.json.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("archivo dañado: error accionable con el nombre del archivo", async () => {
    render(<App fetchFn={fetchPorRuta({ lol: crearDatos(), tft: { sin: "amigos" } })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Vuelve a correr el recolector para generar datos/tft.json de nuevo.");
  });

  it("muestra la fecha de tft.json en el encabezado", async () => {
    const tft = crearDatosTft({ actualizado: new Date(Date.now() - 7 * MIN).toISOString() });
    render(<App fetchFn={fetchPorRuta({ lol: crearDatos({ actualizado: new Date().toISOString() }), tft })} />);
    await screen.findByRole("button", { name: "Croac#LAS" });
    expect(screen.getByText(/Datos de Riot:/)).toHaveTextContent("Datos de Riot: hace 7 minutos");
  });

  it("no pide tft.json mientras se mira League", async () => {
    window.history.replaceState(null, "", "/#/");
    const fetchFn = vi.fn(fetchPorRuta({ lol: crearDatos({ actualizado: new Date().toISOString() }), tft: crearDatosTft() }));
    render(<App fetchFn={fetchFn} />);
    await screen.findByRole("heading", { name: "Amigos" });
    expect(fetchFn.mock.calls.map(([ruta]) => ruta)).toEqual(["./datos/lol.json"]);

    await userEvent.click(screen.getByRole("tab", { name: "TFT" }));
    await screen.findByRole("button", { name: "Croac#LAS" });
    expect(fetchFn.mock.calls.map(([ruta]) => ruta)).toEqual(["./datos/lol.json", "./datos/tft.json"]);
  });
});
