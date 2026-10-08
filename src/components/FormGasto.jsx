import { useState } from 'react'

const MEDIOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago']

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FormGasto({ categorias, items, inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    fecha: inicial?.fecha ?? hoy(),
    monto: inicial?.monto ?? '',
    categoria_id: inicial?.categoria_id ?? '',
    item_id: inicial?.item_id ?? '',
    descripcion: inicial?.descripcion ?? '',
    medio_pago: inicial?.medio_pago ?? 'Efectivo',
    fijo: inicial?.fijo ?? false,
    individual: inicial?.individual ?? false,
  })

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const cambiarSiNo = (campo) => (e) => setForm({ ...form, [campo]: e.target.value === 'true' })

  // Con una categoría elegida, Item muestra solo los suyos; sin categoría, todos
  const itemsVisibles = form.categoria_id
    ? items.filter((i) => String(i.categoria_id) === String(form.categoria_id))
    : items

  function cambiarCategoria(e) {
    const categoria_id = e.target.value
    const item = items.find((i) => String(i.id) === String(form.item_id))
    const itemSigue = !categoria_id || String(item?.categoria_id) === categoria_id
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
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      item_id: form.item_id ? Number(form.item_id) : null,
      descripcion: form.descripcion.trim() || null,
      medio_pago: form.medio_pago,
      fijo: form.fijo,
      individual: form.individual,
    })
    if (!inicial) setForm({ ...form, monto: '', descripcion: '' })
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h2>{inicial ? 'Editar gasto' : 'Nuevo gasto'}</h2>
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
        <label>
          Tipo
          <select value={String(form.fijo)} onChange={cambiarSiNo('fijo')}>
            <option value="false">Variable</option>
            <option value="true">Fijo</option>
          </select>
        </label>
        <label>
          Gasto
          <select value={String(form.individual)} onChange={cambiarSiNo('individual')}>
            <option value="false">Familiar</option>
            <option value="true">Individual</option>
          </select>
        </label>
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
