import { useRef, useState } from 'react'
import { MONEDAS } from '../moneda'
import { ACEPTADOS } from '../comprobantes'
import { hoy } from '../fechas'
import { MEDIOS, useFormGasto } from './FormGasto'

// Fila de la tabla en modo edición: cada celda con su campo. Enter guarda, Esc cancela.
export default function FilaEdicion({ gasto, categorias, items, personas, onGuardar, onCancelar, onVerComprobante }) {
  const { form, cambiar, tildar, cambiarCategoria, cambiarItem, itemsVisibles, armar } = useFormGasto(gasto, items)
  const [archivo, setArchivo] = useState(null)
  const [quitar, setQuitar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const inputArchivo = useRef(null)

  const elegirArchivo = () => inputArchivo.current.click()

  function descartarArchivo() {
    setArchivo(null)
    inputArchivo.current.value = ''
  }

  async function guardar() {
    if (!form.fecha) return setAviso('Falta la fecha.')
    if (form.fecha > hoy()) return setAviso('La fecha no puede ser posterior a hoy.')
    if (!(Number(form.monto) > 0)) return setAviso('El monto tiene que ser mayor a 0.')
    if (!form.pagado_por) return setAviso('Elegí quién pagó.')
    setAviso(null)
    setEnviando(true)
    await onGuardar(armar(), { archivo, quitar })
    setEnviando(false)
  }

  function tecla(e) {
    if (e.key === 'Escape') onCancelar()
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') {
      e.preventDefault()
      guardar()
    }
  }

  return (
    <tr className="fila-edicion" onKeyDown={tecla}>
      <td>
        <input type="date" max={hoy()} value={form.fecha} onChange={cambiar('fecha')} aria-label="Fecha" />
      </td>
      <td>
        <select value={form.categoria_id} onChange={cambiarCategoria} aria-label="Categoría">
          <option value="">—</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </td>
      <td>
        <select value={form.item_id} onChange={cambiarItem} aria-label="Item">
          <option value="">—</option>
          {itemsVisibles.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>
      </td>
      <td>
        <label className="casilla">
          <input type="checkbox" checked={form.fijo} onChange={tildar('fijo')} />
          Fijo
        </label>
        <label className="casilla">
          <input type="checkbox" checked={form.individual} onChange={tildar('individual')} />
          Individual
        </label>
      </td>
      <td>
        <input value={form.descripcion} onChange={cambiar('descripcion')} aria-label="Descripción" />
      </td>
      <td>
        <select value={form.medio_pago} onChange={cambiar('medio_pago')} aria-label="Medio de pago">
          {MEDIOS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </td>
      <td>
        <select value={form.moneda} onChange={cambiar('moneda')} aria-label="Moneda">
          {MONEDAS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </td>
      <td className="num">
        <input
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          className="monto"
          value={form.monto}
          onChange={cambiar('monto')}
          aria-label="Monto"
          autoFocus
        />
      </td>
      <td>
        <select value={form.pagado_por} onChange={cambiar('pagado_por')} aria-label="Quién pagó">
          <option value="">— Elegir —</option>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </td>
      <td>{gasto.creado_por_email ?? '—'}</td>
      <td>{gasto.modificado_por_email ?? '—'}</td>
      <td>
        <div className="comprobante-edicion">
          <input
            type="file"
            hidden
            ref={inputArchivo}
            accept={ACEPTADOS}
            onChange={(e) => {
              setArchivo(e.target.files[0] ?? null)
              setQuitar(false)
            }}
          />
          {archivo ? (
            // Archivo nuevo elegido: clip resaltado, nombre y ✕ para descartarlo
            <>
              <button type="button" className="clip adjunto" title="Cambiar archivo" onClick={elegirArchivo}>📎</button>
              <span className="archivo-elegido" title={archivo.name}>{archivo.name}</span>
              <button type="button" className="secundario clip" title="Descartar" aria-label="Descartar archivo" onClick={descartarArchivo}>✕</button>
            </>
          ) : gasto.comprobante && quitar ? (
            <>
              <span className="archivo-quitado">Se quitará</span>
              <button type="button" className="secundario clip" title="Deshacer" aria-label="No quitar" onClick={() => setQuitar(false)}>↺</button>
            </>
          ) : gasto.comprobante ? (
            <>
              <button type="button" className="secundario comprobante" onClick={() => onVerComprobante(gasto.comprobante)}>
                📎 Ver
              </button>
              <button type="button" className="secundario clip" title="Reemplazar" aria-label="Reemplazar comprobante/factura" onClick={elegirArchivo}>📎</button>
              <button type="button" className="secundario clip" title="Quitar" aria-label="Quitar comprobante/factura" onClick={() => setQuitar(true)}>✕</button>
            </>
          ) : (
            <button type="button" className="secundario clip" title="Adjuntar comprobante/factura" aria-label="Adjuntar comprobante/factura" onClick={elegirArchivo}>📎</button>
          )}
        </div>
      </td>
      <td>
        <div className="acciones">
          <button type="button" disabled={enviando} onClick={guardar}>{enviando ? 'Guardando…' : 'Guardar'}</button>
          <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
        </div>
        {aviso && <div className="error">{aviso}</div>}
      </td>
    </tr>
  )
}
