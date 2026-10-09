import { useRef, useState } from 'react'
import { MONEDAS, formatear } from '../moneda'
import { ACEPTADOS, nombreComprobante } from '../comprobantes'

const MEDIOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago']

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FormGasto({ categorias, items, cotizacion, inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    fecha: inicial?.fecha ?? hoy(),
    monto: inicial?.monto ?? '',
    moneda: inicial?.moneda ?? '$',
    categoria_id: inicial?.categoria_id ?? '',
    item_id: inicial?.item_id ?? '',
    descripcion: inicial?.descripcion ?? '',
    medio_pago: inicial?.medio_pago ?? 'Efectivo',
    fijo: inicial?.fijo ?? false,
    individual: inicial?.individual ?? false,
  })
  // Comprobante: archivo nuevo elegido, o quitar el que ya tenía
  const [archivo, setArchivo] = useState(null)
  const [quitar, setQuitar] = useState(false)
  const inputArchivo = useRef(null)

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const tildar = (campo) => (e) => setForm({ ...form, [campo]: e.target.checked })

  // Con una categoría elegida, Item muestra los suyos y los sin categoría (como "Otros"); sin categoría, todos
  const itemsVisibles = form.categoria_id
    ? items.filter((i) => i.categoria_id == null || String(i.categoria_id) === String(form.categoria_id))
    : items

  function cambiarCategoria(e) {
    const categoria_id = e.target.value
    const item = items.find((i) => String(i.id) === String(form.item_id))
    const itemSigue = !categoria_id || item?.categoria_id == null || String(item.categoria_id) === categoria_id
    setForm({ ...form, categoria_id, item_id: itemSigue ? form.item_id : '' })
  }

  // Elegir un item completa su categoría, y si es fijo y/o individual (se puede cambiar a mano)
  function cambiarItem(e) {
    const item_id = e.target.value
    const item = items.find((i) => String(i.id) === item_id)
    setForm({
      ...form,
      item_id,
      categoria_id: item?.categoria_id ?? form.categoria_id,
      fijo: item?.fijo ?? form.fijo,
      individual: item?.individual ?? form.individual,
    })
  }

  function enviar(e) {
    e.preventDefault()
    onGuardar({
      ...(inicial?.id ? { id: inicial.id } : {}),
      fecha: form.fecha,
      monto: Number(form.monto),
      moneda: form.moneda,
      // Si sigue en U$D conserva la cotización con la que se cargó
      cotizacion: form.moneda === 'U$D' ? inicial?.cotizacion ?? null : null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      item_id: form.item_id ? Number(form.item_id) : null,
      descripcion: form.descripcion.trim() || null,
      medio_pago: form.medio_pago,
      fijo: form.fijo,
      individual: form.individual,
    }, { archivo, quitar })
    if (!inicial) {
      setForm({ ...form, monto: '', descripcion: '' })
      setArchivo(null)
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h2>{inicial ? 'Editar gasto' : 'Nuevo gasto'}</h2>
      <p className="cotizacion">
        {cotizacion ? (
          <>
            Dólar oficial (venta) <b>{formatear(cotizacion.venta)}</b> · actualizado{' '}
            {new Date(cotizacion.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
          </>
        ) : (
          'Cotización del dólar no disponible'
        )}
      </p>
      <div className="grilla">
        <label>
          Fecha
          <input type="date" required value={form.fecha} onChange={cambiar('fecha')} />
        </label>
        <label>
          Monto
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={form.monto}
            onChange={cambiar('monto')}
          />
        </label>
        <label>
          Moneda
          <select value={form.moneda} onChange={cambiar('moneda')}>
            {MONEDAS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          Categoría
          <select value={form.categoria_id} onChange={cambiarCategoria}>
            <option value="">— Elegir —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Item
          <select value={form.item_id} onChange={cambiarItem}>
            <option value="">— Elegir —</option>
            {itemsVisibles.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
        </label>
        <fieldset className="casillas">
          <legend>Gasto</legend>
          <label className="casilla">
            <input type="checkbox" checked={form.fijo} onChange={tildar('fijo')} />
            Fijo
          </label>
          <label className="casilla">
            <input type="checkbox" checked={form.individual} onChange={tildar('individual')} />
            Individual
          </label>
        </fieldset>
        <label>
          Medio de pago
          <select value={form.medio_pago} onChange={cambiar('medio_pago')}>
            {MEDIOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="ancho">
          Descripción
          <input value={form.descripcion} onChange={cambiar('descripcion')} placeholder="Opcional" />
        </label>
        <label className="ancho">
          {inicial?.comprobante && !quitar ? 'Reemplazar comprobante/factura' : 'Comprobante/Factura'}
          <input
            type="file"
            ref={inputArchivo}
            accept={ACEPTADOS}
            onChange={(e) => {
              setArchivo(e.target.files[0] ?? null)
              setQuitar(false)
            }}
          />
        </label>
        {inicial?.comprobante && !archivo && (
          <label className="casilla ancho">
            <input type="checkbox" checked={quitar} onChange={(e) => setQuitar(e.target.checked)} />
            Quitar el comprobante/factura actual ({nombreComprobante(inicial.comprobante)})
          </label>
        )}
      </div>
      <div className="botones">
        <button>{inicial ? 'Guardar cambios' : 'Agregar'}</button>
        {inicial && (
          <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
        )}
      </div>
    </form>
  )
}
