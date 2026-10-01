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
