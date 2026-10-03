/**
 * Título de sección, siempre fuera de su caja y con la misma altura, para alinear columnas.
 * `subtitulo` (opcional) va a la derecha en la misma fila, así no cambia la altura.
 */
export function TituloSeccion({ id, subtitulo, children }) {
  if (!subtitulo) {
    return (
      <h2 id={id} className="mb-3 flex h-8 items-center gap-2 font-titulo text-lg font-bold">
        {children}
      </h2>
    );
  }
  return (
    <div className="mb-3 flex h-8 items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 font-titulo text-lg font-bold">
        {children}
      </h2>
      <p className="truncate text-xs text-texto-suave">{subtitulo}</p>
    </div>
  );
}
