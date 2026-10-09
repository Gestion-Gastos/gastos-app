import { useEffect } from 'react'

// Ventana sobre la página. Se cierra con ✕ o Esc; no al tocar afuera, para no perder lo escrito.
export default function Modal({ titulo, onCerrar, children }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  return (
    <div className="modal-fondo">
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="secundario cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
