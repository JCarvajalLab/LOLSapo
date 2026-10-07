import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App.jsx";
import { EsqueletoPagina, FILAS_ESQUELETO } from "./Esqueleto.jsx";
import { ErrorCarga } from "./Estados.jsx";
import { FilaAmigo } from "./FilaAmigo.jsx";
import { SeccionEnPartida } from "./SeccionEnPartida.jsx";
import { FiltroModos } from "./FiltroModos.jsx";
import { AHORA, crearDatos, ddragon, partidaEnVivo } from "../test/fixtures/lol.js";

function clasesGrilla(el) {
  return el.querySelector(":scope > div").className.split(" ").filter((c) => c.includes("grid") || c.includes("h-["));
}

describe("esqueleto de la primera carga", () => {
  it("se anuncia como carga y repite títulos y alturas de la página real", () => {
    const { container } = render(<EsqueletoPagina />);
    expect(screen.getByRole("status", { name: "Cargando datos…" })).toBeInTheDocument();
    const titulos = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(titulos).toEqual(["En partida", "Ranking", "Amigos"]);
    expect(container.querySelector(".min-h-32")).not.toBeNull();
    const ranking = container.querySelectorAll("ol > li[data-esqueleto]");
    expect(ranking).toHaveLength(FILAS_ESQUELETO);
    expect(ranking[0]).toHaveClass("h-14", "lg:h-20");
  });

  it("las filas de amigo usan la misma grilla que una fila real", () => {
    const { container } = render(<EsqueletoPagina />);
    const esqueleto = container.querySelector("ul > li[data-esqueleto]");
    const real = render(
      <ul>
        <FilaAmigo
          amigo={crearDatos().amigos[0]}
          ddragon={ddragon}
          ahora={AHORA}
          actualizadoMs={AHORA}
          abierto={false}
          onAlternar={() => {}}
        />
      </ul>,
    ).container.querySelector("li");
    expect(clasesGrilla(esqueleto)).toEqual(clasesGrilla(real));
    expect(clasesGrilla(real)).toContain("sm:h-[78px]");
  });

  it("App muestra el esqueleto mientras carga y lo cambia por los datos", async () => {
    let resolver;
    const fetchFn = vi.fn(() => new Promise((r) => (resolver = r)));
    const { container } = render(<App fetchFn={fetchFn} />);
    expect(container.querySelector('[data-esqueleto-pagina="true"]')).not.toBeNull();
    resolver({ ok: true, json: async () => crearDatos({ actualizado: new Date().toISOString() }) });
    expect(await screen.findByRole("heading", { name: "Amigos" })).toBeInTheDocument();
    expect(container.querySelector('[data-esqueleto-pagina="true"]')).toBeNull();
  });
});

describe("mensajes de error de la primera carga", () => {
  it("sin datos: indica correr el recolector", () => {
    render(<ErrorCarga error={{ tipo: "sin-datos", mensaje: "Todavía no hay datos." }} />);
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Todavía no hay datos.");
    expect(alerta).toHaveTextContent("Corre el recolector: python -m lolsapo");
  });

  it("error de red: mensaje genérico y reintento automático", () => {
    render(<ErrorCarga error={{ tipo: "red", mensaje: "No se pudo conectar con el servidor." }} />);
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("No se pudieron cargar los datos.");
    expect(alerta).toHaveTextContent("No se pudo conectar con el servidor. La página reintenta sola cada 2 minutos.");
  });

  it("archivo dañado: pide volver a correr el recolector", () => {
    render(<ErrorCarga error={{ tipo: "formato", mensaje: "x" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Los datos están dañados.");
    expect(screen.getByRole("alert")).toHaveTextContent("Vuelve a correr el recolector");
  });

  it("App con error de red no muestra el esqueleto", async () => {
    const { container } = render(<App fetchFn={() => Promise.reject(new TypeError("sin red"))} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar los datos.");
    expect(container.querySelector('[data-esqueleto-pagina="true"]')).toBeNull();
  });
});

describe("amigo con error", () => {
  it("muestra sus últimos datos conocidos y un aviso discreto", () => {
    const amigo = { ...crearDatos().amigos[0], estado: "error", error: "No se pudo consultar a Riot" };
    const { container } = render(
      <ul>
        <FilaAmigo amigo={amigo} ddragon={ddragon} ahora={AHORA} actualizadoMs={AHORA} abierto={false} onAlternar={() => {}} />
      </ul>,
    );
    expect(screen.getByText("Platino IV")).toBeInTheDocument();
    expect(screen.getByText("3 partidas")).toBeInTheDocument();
    expect(container.querySelector('[data-aviso-error="true"]')).toHaveTextContent("Sin actualizar");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("móvil y accesibilidad", () => {
  it("el encabezado de la partida no deja separadores sueltos en móvil: se separa con espacio y se envuelve", () => {
    const { container } = render(
      <SeccionEnPartida
        enVivo={[partidaEnVivo]}
        ddragon={ddragon}
        amigos={crearDatos().amigos}
        actualizadoMs={AHORA}
        ahora={AHORA}
      />,
    );
    const separadores = [...container.querySelectorAll("article header span[aria-hidden]")].filter(
      (s) => s.textContent.trim() === "·",
    );
    expect(separadores).toHaveLength(0);
    expect(container.querySelector("article header")).toHaveClass("flex-wrap");
  });

  it("los botones de filtro miden al menos 40 px de alto", () => {
    render(<FiltroModos valor="todos" onCambiar={() => {}} />);
    for (const b of screen.getAllByRole("button")) expect(b).toHaveClass("min-h-10");
  });
});
