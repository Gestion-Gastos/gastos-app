import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import FormGasto from './FormGasto'
import Compartir from './Compartir'
import GraficoTorta from './GraficoTorta'
import { MONEDAS, formatear } from '../moneda'

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rangoDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(a, m, 0).getDate()
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, '0')}` }
}

// duenio: de quién son los gastos que se ven ({ id, propio } o { id, email, permiso } si me los compartieron)
// yo: mi id de usuario (solo quien cargó un gasto lo puede borrar)
export default function Gastos({ duenio, yo }) {
  const puedeEscribir = duenio.propio || duenio.permiso === 'escritura'
  const [mes, setMes] = useState(mesActual())
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [items, setItems] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroGasto, setFiltroGasto] = useState('')
  const [monedaResumen, setMonedaResumen] = useState('$')
  const [editando, setEditando] = useState(null)
  const [error, setError] = useState(null)

  async function cargarCategorias() {
    const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre')
    if (error) return setError(error.message)
    setCategorias(data)
  }

  async function cargarItems() {
    const { data, error } = await supabase.from('items').select('id, nombre, categoria_id, fijo, individual').order('nombre')
    if (error) return setError(error.message)
    setItems(data)
  }

  async function cargarGastos() {
    const { desde, hasta } = rangoDelMes(mes)
    const { data, error } = await supabase
      .from('gastos')
      .select('id, fecha, monto, moneda, descripcion, medio_pago, categoria_id, categorias(nombre), item_id, items(nombre), fijo, individual, creado_por, creado_por_email')
      .eq('user_id', duenio.id)
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
      : await supabase.from('gastos').insert({ ...campos, user_id: duenio.id })
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

  const filtrados = useMemo(
    () =>
      gastos.filter(
        (g) =>
          (!filtroTipo || g.fijo === (filtroTipo === 'fijo')) &&
          (!filtroGasto || g.individual === (filtroGasto === 'individual'))
      ),
    [gastos, filtroTipo, filtroGasto]
  )

  const suma = (lista) => lista.reduce((s, g) => s + Number(g.monto), 0)
  const totalesPorMoneda = useMemo(
    () => MONEDAS.map((m) => [m, suma(filtrados.filter((g) => g.moneda === m))]),
    [filtrados]
  )

  // El reparto, la torta y las barras nunca mezclan monedas: muestran solo la elegida
  const delResumen = useMemo(
    () => filtrados.filter((g) => g.moneda === monedaResumen),
    [filtrados, monedaResumen]
  )
  const total = useMemo(() => suma(delResumen), [delResumen])
  const fijo = useMemo(() => suma(delResumen.filter((g) => g.fijo)), [delResumen])
  const individual = useMemo(() => suma(delResumen.filter((g) => g.individual)), [delResumen])
  const fmt = (monto) => formatear(monto, monedaResumen)

  const porCategoria = useMemo(() => {
    const acc = {}
    for (const g of delResumen) {
      const nombre = g.categorias?.nombre ?? 'Sin categoría'
      acc[nombre] = (acc[nombre] ?? 0) + Number(g.monto)
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [delResumen])

  return (
    <>
      {error && <p className="error">{error}</p>}

      {puedeEscribir && (
        <FormGasto
          key={editando?.id ?? 'nuevo'}
          categorias={categorias}
          items={items}
          inicial={editando}
          onGuardar={guardar}
          onCancelar={() => setEditando(null)}
        />
      )}

      <section className="tarjeta">
        <div className="fila-titulo">
          <h2>{duenio.propio ? 'Historial' : `Gastos de ${duenio.email}`}</h2>
          <div className="filtros">
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Fijos y variables</option>
              <option value="fijo">Solo fijos</option>
              <option value="variable">Solo variables</option>
            </select>
            <select value={filtroGasto} onChange={(e) => setFiltroGasto(e.target.value)}>
              <option value="">Familiares e individuales</option>
              <option value="familiar">Solo familiares</option>
              <option value="individual">Solo individuales</option>
            </select>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
        </div>

        <div className="resumen">
          <div className="total">
            <span>Total del mes</span>
            <div className="monedas">
              {totalesPorMoneda.map(([m, monto]) => (
                <strong key={m}>{formatear(monto, m)}</strong>
              ))}
            </div>
          </div>
          <div className="reparto">
            <label className="ver-en">
              Ver resumen en
              <select value={monedaResumen} onChange={(e) => setMonedaResumen(e.target.value)}>
                {MONEDAS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <span>Fijo <b>{fmt(fijo)}</b> · Variable <b>{fmt(total - fijo)}</b></span>
            <span>Familiar <b>{fmt(total - individual)}</b> · Individual <b>{fmt(individual)}</b></span>
          </div>
          {porCategoria.length > 0 && <GraficoTorta datos={porCategoria} total={total} moneda={monedaResumen} />}
          {porCategoria.length > 0 && (
            <ul className="categorias">
              {porCategoria.map(([nombre, monto]) => (
                <li key={nombre}>
                  <span>{nombre}</span>
                  <div className="barra">
                    <div style={{ width: `${(monto / total) * 100}%` }} />
                  </div>
                  <span className="num">{fmt(monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {filtrados.length === 0 ? (
          <p className="vacio">
            {gastos.length === 0 ? 'No hay gastos cargados en este mes.' : 'Ningún gasto coincide con los filtros.'}
          </p>
        ) : (
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Medio</th>
                  <th>Moneda</th>
                  <th className="num">Monto</th>
                  <th>Cargado por</th>
                  {puedeEscribir && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((g) => (
                  <tr key={g.id}>
                    <td>{g.fecha.split('-').reverse().join('/')}</td>
                    <td>{g.categorias?.nombre ?? '—'}</td>
                    <td>{g.items?.nombre ?? '—'}</td>
                    <td>{g.fijo ? 'Fijo' : 'Variable'} · {g.individual ? 'Individual' : 'Familiar'}</td>
                    <td>{g.descripcion}</td>
                    <td>{g.medio_pago}</td>
                    <td>{g.moneda}</td>
                    <td className="num">{formatear(g.monto, g.moneda)}</td>
                    <td>{g.creado_por_email ?? '—'}</td>
                    {puedeEscribir && (
                      <td className="acciones">
                        <button className="secundario" onClick={() => setEditando(g)}>Editar</button>
                        {g.creado_por === yo && (
                          <button className="peligro" onClick={() => borrar(g.id)}>Borrar</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {duenio.propio && <Compartir />}
    </>
  )
}
