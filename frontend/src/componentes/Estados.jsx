// Estados de carga, vacío y error reutilizables.

export function Cargando({ texto = "Cargando datos…" }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-texto-suave">
      {texto}
    </p>
  );
}

export function EstadoVacio({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-borde px-4 py-8 text-center text-sm text-texto-suave">{children}</p>
  );
}

export function EstadoError({ titulo, children, accion }) {
  return (
    <div role="alert" data-tono="error" className="canto rounded-lg py-4 pr-4 pl-5">
      <p className="titulo-sub flex items-center gap-2 text-texto">
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-derrota font-sans text-xs font-bold text-fondo"
        >
          !
        </span>
        {titulo}
      </p>
      {children && <p className="mt-1.5 max-w-prose text-sm text-texto-suave">{children}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  );
}

/** Mensaje accionable según el tipo de error de la primera carga. */
export function ErrorCarga({ error, archivo = "datos/lol.json" }) {
  if (error.tipo === "sin-datos") {
    return (
      <EstadoError titulo="Todavía no hay datos.">
        Corre el recolector: <code className="rounded bg-fondo px-1.5 py-0.5 text-texto">python -m lolsapo</code>. La página
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
