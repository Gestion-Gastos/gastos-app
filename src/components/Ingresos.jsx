import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { MONEDAS, formatear, enPesos } from '../moneda'
import { filtrarLetras } from '../personas'
import { fechaCorta, fechaEnMes, fechaPorDefecto, rangoDelMes, sumarMeses } from '../fechas'

// Ingresos del mes que se está viendo: lista, alta rápida y copia del mes anterior.
// Cada ingreso lleva el Nombre de una persona; esas personas son las que se eligen en "Quién pagó".
// onPersona(nombre): valida el nombre y devuelve la persona (la existente sin importar mayúsculas, o una nueva)
export default function Ingresos({ duenio, mes, ingresos, personas, cotizacion, puedeEscribir, onPersona, onCambio, onError }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', monto: '', moneda: '$', fecha: fechaPorDefecto(mes) })
  const [enviando, setEnviando] = useState(false)
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const venta = cotizacion?.venta

  // Un ingreso en U$D guarda la cotización de hoy, igual que los gastos
  function conCotizacion(moneda) {
    if (moneda !== 'U$D') return null
    if (!venta) throw new Error('No hay cotización del dólar disponible; no se puede guardar un ingreso en U$D.')
    return venta
  }

  async function agregar(e) {
    e.preventDefault()
    try {
      setEnviando(true)
      const persona = await onPersona(form.nombre)
      const { error } = await supabase.from('ingresos').insert({
        user_id: duenio.id,
        persona_id: persona.id,
        fecha: form.fecha,
        monto: Number(form.monto),
        moneda: form.moneda,
        cotizacion: conCotizacion(form.moneda),
        descripcion: form.descripcion.trim() || null,
      })
      if (error) throw error
      setForm({ ...form, nombre: '', descripcion: '', monto: '' })
      onCambio()
    } catch (e) {
      onError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function borrar(id) {
    if (!confirm('¿Borrar este ingreso?')) return
    const { error } = await supabase.from('ingresos').delete().eq('id', id)
    if (error) return onError(error.message)
    onCambio()
  }

  async function copiarAnterior() {
    try {
      setEnviando(true)
      const { desde, hasta } = rangoDelMes(sumarMeses(mes, -1))
      const { data, error } = await supabase
        .from('ingresos')
        .select('fecha, monto, moneda, descripcion, persona_id')
        .eq('user_id', duenio.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
      if (error) throw error
      if (data.length === 0) return onError('El mes anterior no tiene ingresos para copiar.')
      const nuevos = data.map((i) => ({
        ...i,
        user_id: duenio.id,
        fecha: fechaEnMes(i.fecha, mes),
        cotizacion: conCotizacion(i.moneda),
      }))
      const { error: errorAlta } = await supabase.from('ingresos').insert(nuevos)
      if (errorAlta) throw errorAlta
      onCambio()
    } catch (e) {
      onError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const total = ingresos.reduce((s, i) => s + enPesos(i, venta), 0)

  return (
    <section className="tarjeta">
      <div className="fila-titulo">
        <h2>Ingresos del mes</h2>
        {puedeEscribir && ingresos.length === 0 && (
          <button className="secundario" disabled={enviando} onClick={copiarAnterior}>
            Copiar del mes anterior
          </button>
        )}
      </div>

      {ingresos.length === 0 ? (
        <p className="vacio">No hay ingresos cargados en este mes.</p>
      ) : (
        <div className="tabla-scroll">
          <table>
            <tbody>
              {ingresos.map((i) => (
                <tr key={i.id}>
                  <td>{fechaCorta(i.fecha)}</td>
                  <td>{i.personas?.nombre ?? '—'}</td>
                  <td>{i.descripcion ?? '—'}</td>
                  <td className="num">{formatear(i.monto, i.moneda)}</td>
                  {puedeEscribir && (
                    <td className="acciones">
                      <button className="peligro" onClick={() => borrar(i.id)}>Borrar</button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="fila-total">
                <td colSpan={3}>Total</td>
                <td className="num">{formatear(total)}</td>
                {puedeEscribir && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {puedeEscribir && (
        <form className="grilla ingreso-form" onSubmit={agregar}>
          <label>
            Nombre
            <input
              required
              list="personas-ingresos"
              maxLength={40}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: filtrarLetras(e.target.value) })}
              placeholder="Solo letras"
            />
            <datalist id="personas-ingresos">
              {personas.map((p) => <option key={p.id} value={p.nombre} />)}
            </datalist>
          </label>
          <label>
            Descripción
            <input value={form.descripcion} onChange={cambiar('descripcion')} placeholder="Sueldo, extra…" />
          </label>
          <label>
            Monto
            <input type="number" required min="0.01" step="0.01" inputMode="decimal" value={form.monto} onChange={cambiar('monto')} />
          </label>
          <label>
            Moneda
            <select value={form.moneda} onChange={cambiar('moneda')}>
              {MONEDAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Fecha
            <input type="date" required value={form.fecha} onChange={cambiar('fecha')} />
          </label>
          <div className="botones">
            <button disabled={enviando}>Agregar ingreso</button>
          </div>
        </form>
      )}
    </section>
  )
}
