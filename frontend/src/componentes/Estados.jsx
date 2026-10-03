// Estados de carga, vacío y error reutilizables.

export function Cargando({ texto = "Cargando datos…" }) {
  return (
    <p role="status" className="py-8 text-center text-texto-suave">
      {texto}
    </p>
  );
}

export function EstadoVacio({ children }) {
  return <p className="rounded-lg border border-dashed border-borde px-4 py-6 text-center text-texto-suave">{children}</p>;
}

export function EstadoError({ titulo, children, accion }) {
  return (
    <div role="alert" className="rounded-lg border border-derrota/50 bg-derrota-fondo px-4 py-3">
      <p className="font-semibold text-texto">
        <span aria-hidden="true" className="mr-1 text-derrota">
          !
        </span>
        {titulo}
      </p>
      {children && <p className="mt-1 text-sm text-texto-suave">{children}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  );
}

/** Mensaje accionable según el tipo de error de la primera carga. */
export function ErrorCarga({ error, archivo = "datos/lol.json" }) {
  if (error.tipo === "sin-datos") {
    return (
      <EstadoError titulo="Todavía no hay datos.">
        Corre el recolector: <code className="rounded bg-fondo px-1 text-texto">python -m lolsapo</code>. La página
        revisa de nuevo cada 2 minutos.
      </EstadoError>
    );
  }
  if (error.tipo === "formato") {
    return (
      <EstadoError titulo="Los datos están dañados.">
        Vuelve a correr el recolector para generar {archivo} de nuevo. La página revisa otra vez cada 2 minutos.
      </EstadoError>
    );
  }
  return (
    <EstadoError titulo="No se pudieron cargar los datos.">
      {error.mensaje} La página reintenta sola cada 2 minutos.
    </EstadoError>
  );
}
