import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal accesible, sin librerías. Se monta solo mientras está abierta.
 * - role="dialog", aria-modal y título enlazado con `idTitulo`.
 * - Al abrir, el foco entra al diálogo; Tab y Shift+Tab quedan atrapados dentro.
 * - Se cierra con ✕, con Esc y con clic fuera (`onCerrar`). Devolver el foco
 *   le toca a quien la abrió, porque sabe a dónde debe volver.
 * - Mientras está abierta, la página de fondo no hace scroll (clase en <html>).
 */
export function Dialogo({ idTitulo, titulo, onCerrar, children }) {
  const ref = useRef(null);
  const presionFuera = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    const raiz = document.documentElement;
    raiz.classList.add("overflow-hidden");
    return () => raiz.classList.remove("overflow-hidden");
  }, []);

  function alTeclear(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCerrar();
      return;
    }
    if (e.key !== "Tab") return;
    const focos = [...ref.current.querySelectorAll(ENFOCABLES)];
    if (focos.length === 0) {
      e.preventDefault();
      return;
    }
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    const activo = document.activeElement;
    if (e.shiftKey && (activo === primero || activo === ref.current)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  return createPortal(
    <div
      data-fondo-dialogo
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-fondo/85 px-2 py-4 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        presionFuera.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Solo si el clic empezó y terminó fuera (no al soltar una selección de texto).
        if (presionFuera.current && e.target === e.currentTarget) onCerrar();
        presionFuera.current = false;
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={alTeclear}
        className="losa dialogo-entra w-full max-w-lg rounded-xl border p-3 shadow-2xl shadow-black/60 focus:outline-none sm:p-5"
      >
        <div className="mb-4 flex items-start gap-3 border-b border-borde pb-3">
          <div className="min-w-0 flex-1">{titulo}</div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-borde text-base text-texto-suave hover:border-texto-suave hover:bg-superficie-alta hover:text-texto"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
