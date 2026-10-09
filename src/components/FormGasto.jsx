import { useState } from 'react'
import { MONEDAS, formatear } from '../moneda'
import { ACEPTADOS } from '../comprobantes'
import { hoy } from '../fechas'

export const MEDIOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago']

// Estado y reglas de un gasto en edición; lo usan la ventana de alta y la fila editable de la tabla.
// base: el gasto que se edita, o valores iniciales para uno nuevo (ej. un fijo pendiente)
export function useFormGasto(base, items) {
  const [form, setForm] = useState({
    fecha: base?.fecha ?? hoy(),
    monto: base?.monto ?? '',
    moneda: base?.moneda ?? '$',
    categoria_id: base?.categoria_id ?? '',
    item_id: base?.item_id ?? '',
    descripcion: base?.descripcion ?? '',
    medio_pago: base?.medio_pago ?? 'Efectivo',
    fijo: base?.fijo ?? false,
    individual: base?.individual ?? false,
    pagado_por: base?.pagado_por ?? '',
  })

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

  const armar = () => ({
    ...(base?.id ? { id: base.id } : {}),
    fecha: form.fecha,
    monto: Number(form.monto),
    moneda: form.moneda,
    // Si sigue en U$D conserva la cotización con la que se cargó
    cotizacion: form.moneda === 'U$D' ? base?.cotizacion ?? null : null,
    categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
    item_id: form.item_id ? Number(form.item_id) : null,
    descripcion: form.descripcion.trim() || null,
    medio_pago: form.medio_pago,
    fijo: form.fijo,
    individual: form.individual,
    pagado_por: form.pagado_por ? Number(form.pagado_por) : null,
  })

  return { form, cambiar, tildar, cambiarCategoria, cambiarItem, itemsVisibles, armar }
}

// Alta de un gasto (va dentro de la ventana "Nuevo gasto")
// personas: lista de "Quién pagó" (se arma con los nombres de los ingresos)
export default function FormGasto({ categorias, items, personas, cotizacion, precarga, onGuardar, onCancelar }) {
  const { form, cambiar, tildar, cambiarCategoria, cambiarItem, itemsVisibles, armar } = useFormGasto(precarga, items)
  const [archivo, setArchivo] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    await onGuardar(armar(), { archivo })
    setEnviando(false)
  }

  return (
    <form className="formulario" onSubmit={enviar}>
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
          <input type="date" required max={hoy()} value={form.fecha} onChange={cambiar('fecha')} />
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
            autoFocus
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
        <label>
          Quién pagó
          <select required value={form.pagado_por} onChange={cambiar('pagado_por')}>
            <option value="">{personas.length ? '— Elegir —' : 'Cargá un ingreso con nombre'}</option>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="ancho">
          Descripción
          <input value={form.descripcion} onChange={cambiar('descripcion')} placeholder="Opcional" />
        </label>
        <label className="ancho">
          Comprobante/Factura
          <input type="file" accept={ACEPTADOS} onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
        </label>
      </div>
      <div className="botones">
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
        <button disabled={enviando}>{enviando ? 'Guardando…' : 'Agregar'}</button>
      </div>
    </form>
  )
}
