export function TarjetaEnConstruccion({ titulo = "Próximamente", subtitulo = "Espacio reservado" }) {
  return (
    <article
      aria-label={`${titulo} - ${subtitulo}`}
      className="flex h-full min-h-64 flex-col justify-between rounded-lg border border-dashed border-borde/80 bg-fondo/20 p-4 transition-colors select-none"
    >
      <div className="flex items-center justify-between">
        <span className="font-titulo text-xs font-semibold tracking-wider uppercase text-texto-suave">
          {titulo}
        </span>
        <span className="rounded bg-fondo/80 px-2 py-0.5 text-[10px] font-medium text-texto-suave border border-borde/60">
          En construcción
        </span>
      </div>

      <div className="my-auto flex flex-col items-center justify-center gap-2 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-borde bg-fondo/60 text-texto-suave">
          <svg
            className="h-6 w-6 stroke-current stroke-1.5 fill-none opacity-60"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-texto-suave">{subtitulo}</p>
        <p className="text-xs text-texto-suave/70">Alineación reservada para nuevos bloques</p>
      </div>

      <div className="h-2 w-full rounded bg-borde/20 opacity-30" aria-hidden="true" />
    </article>
  );
}
