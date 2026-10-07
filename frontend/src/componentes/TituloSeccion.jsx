/** Título de sección, siempre fuera de su caja y con la misma altura, para alinear columnas. */
export function TituloSeccion({ id, children }) {
  return (
    <h2 id={id} className="titulo-seccion mb-3 flex h-8 items-center gap-2">
      {children}
    </h2>
  );
}
