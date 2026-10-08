import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import FormGasto from './FormGasto'

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rangoDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(a, m, 0).getDate()
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, '0')}` }
}

export default function Gastos() {
  const [mes, setMes] = useState(mesActual())
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [items, setItems] = useState([])
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState(null)

  async function cargarCategorias() {
    const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre')
    if (error) return setError(error.message)
    setCategorias(data)
  }

  async function cargarItems() {
    const { data, error } = await supabase.from('items').select('id, nombre, categoria_id').order('nombre')
    if (error) return setError(error.message)
    setItems(data)
  }

  async function cargarGastos() {
    const { desde, hasta } = rangoDelMes(mes)
    const { data, error } = await supabase
      .from('gastos')
      .select('id, fecha, monto, descripcion, medio_pago, categoria_id, categorias(nombre), item_id, items(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
    if (error) return setError(error.message)
    setError(null)
    setGastos(data)
  }

  useEffect(() => {
    cargarCategorias()
    cargarItems()
  }, [])

  useEffect(() => {
    cargarGastos()
  }, [mes])

  async function guardar(gasto) {
    const { id, ...campos } = gasto
    const { error } = id
      ? await supabase.from('gastos').update(campos).eq('id', id)
      : await supabase.from('gastos').insert(campos)
    if (error) return setError(error.message)
    setEditando(null)
    cargarGastos()
  }

  async function borrar(id) {
    if (!confirm('¿Borrar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) return setError(error.message)
    cargarGastos()
  }

  const total = useMemo(() => gastos.reduce((s, g) => s + Number(g.monto), 0), [gastos])

  const porCategoria = useMemo(() => {
    const acc = {}
    for (const g of gastos) {
      const nombre = g.categorias?.nombre ?? 'Sin categoría'
      acc[nombre] = (acc[nombre] ?? 0) + Number(g.monto)
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [gastos])

  return (
    <>
      {error && <p className="error">{error}</p>}

      <FormGasto
        key={editando?.id ?? 'nuevo'}
        categorias={categorias}
        items={items}
        inicial={editando}
        onGuardar={guardar}
        onCancelar={() => setEditando(null)}
      />

      <section className="tarjeta">
        <div className="fila-titulo">
          <h2>Historial</h2>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>

        <div className="resumen">
          <div className="total">
            <span>Total del mes</span>
            <strong>{pesos.format(total)}</strong>
          </div>
          {porCategoria.length > 0 && (
            <ul className="categorias">
              {porCategoria.map(([nombre, monto]) => (
                <li key={nombre}>
                  <span>{nombre}</span>
                  <div className="barra">
                    <div style={{ width: `${(monto / total) * 100}%` }} />
                  </div>
                  <span className="num">{pesos.format(monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {gastos.length === 0 ? (
          <p className="vacio">No hay gastos cargados en este mes.</p>
        ) : (
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Item</th>
                  <th>Descripción</th>
                  <th>Medio</th>
                  <th className="num">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td>{g.fecha.split('-').reverse().join('/')}</td>
                    <td>{g.categorias?.nombre ?? '—'}</td>
                    <td>{g.items?.nombre ?? '—'}</td>
                    <td>{g.descripcion}</td>
                    <td>{g.medio_pago}</td>
                    <td className="num">{pesos.format(g.monto)}</td>
                    <td className="acciones">
                      <button className="secundario" onClick={() => setEditando(g)}>Editar</button>
                      <button className="peligro" onClick={() => borrar(g.id)}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
