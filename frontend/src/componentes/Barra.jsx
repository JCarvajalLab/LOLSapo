/**
 * Barra decorativa de 0 a 100: el número va siempre al lado en texto. Ancho vía CSSOM
 * (prop `style` de React), como BarraWinrate, para no romper la CSP.
 */
export function Barra({ ancho, clase }) {
  const valor = Math.min(100, Math.max(0, ancho));
  return (
    <span className="relative block h-1.5 overflow-hidden rounded-full bg-superficie-alta" aria-hidden="true">
      <span data-barra className={`absolute inset-y-0 left-0 rounded-full ${clase}`} style={{ width: `${valor}%` }} />
    </span>
  );
}
