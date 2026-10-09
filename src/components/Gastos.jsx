import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import FormGasto from './FormGasto'
import Compartir from './Compartir'
import GraficoTorta from './GraficoTorta'
import VisorComprobante from './VisorComprobante'
import { formatear, obtenerCotizacion, enPesos } from '../moneda'
import { subirComprobante, borrarComprobante } from '../comprobantes'

const MAX_COMPROBANTE = 10 * 1024 * 1024

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
  const [cotizacion, setCotizacion] = useState(null)
  const [editando, setEditando] = useState(null)
  const [viendoComprobante, setViendoComprobante] = useState(null)
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
      .select('id, fecha, monto, moneda, cotizacion, descripcion, medio_pago, categoria_id, categorias(nombre), item_id, items(nombre), fijo, individual, creado_por, creado_por_email, comprobante')
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

  // Cotización del dólar: al abrir y cada 30 minutos (si falla, queda la última obtenida)
  useEffect(() => {
    const actualizar = () => obtenerCotizacion().then(setCotizacion, (e) => setError(e.message))
    actualizar()
    const intervalo = setInterval(actualizar, 30 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    cargarGastos()
  }, [mes])

  async function guardar(gasto, { archivo, quitar }) {
    const { id, ...campos } = gasto
    // Un gasto en U$D nuevo (o que pasó de $ a U$D) guarda la cotización de hoy
    if (campos.moneda === 'U$D' && campos.cotizacion == null) {
      if (!cotizacion) return setError('No hay cotización del dólar disponible; no se puede guardar un gasto en U$D.')
      campos.cotizacion = cotizacion.venta
    }
    if (archivo && archivo.size > MAX_COMPROBANTE) return setError('El comprobante/factura no puede pesar más de 10 MB.')
    const { data, error } = id
      ? await supabase.from('gastos').update(campos).eq('id', id).select('id').single()
      : await supabase.from('gastos').insert({ ...campos, user_id: duenio.id }).select('id').single()
    if (error) return setError(error.message)
    setError(null)

    // Comprobante: se sube después de guardar el gasto (la ruta lleva su id); si falla, el gasto queda guardado
    const anterior = id ? gastos.find((g) => g.id === id)?.comprobante : null
    try {
      if (archivo) {
        const ruta = await subirComprobante(duenio.id, data.id, archivo)
        const { error } = await supabase.from('gastos').update({ comprobante: ruta }).eq('id', data.id)
        if (error) throw error
        await borrarComprobante(anterior)
      } else if (quitar && anterior) {
        const { error } = await supabase.from('gastos').update({ comprobante: null }).eq('id', data.id)
        if (error) throw error
        await borrarComprobante(anterior)
      }
    } catch (e) {
      setError(`El gasto se guardó, pero hubo un problema con el comprobante/factura: ${e.message}`)
    }
    setEditando(null)
    cargarGastos()
  }

  async function borrar(g) {
    if (!confirm('¿Borrar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', g.id)
    if (error) return setError(error.message)
    borrarComprobante(g.comprobante).catch(() => {})
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

  // Todos los totales en pesos: los gastos en U$D se convierten con su cotización
  const venta = cotizacion?.venta
  const suma = (lista) => lista.reduce((s, g) => s + enPesos(g, venta), 0)
  const total = useMemo(() => suma(filtrados), [filtrados, venta])
  const fijo = useMemo(() => suma(filtrados.filter((g) => g.fijo)), [filtrados, venta])
  const individual = useMemo(() => suma(filtrados.filter((g) => g.individual)), [filtrados, venta])

  const porCategoria = useMemo(() => {
    const acc = {}
    for (const g of filtrados) {
      const nombre = g.categorias?.nombre ?? 'Sin categoría'
      acc[nombre] = (acc[nombre] ?? 0) + enPesos(g, venta)
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filtrados, venta])

  return (
    <>
      {error && <p className="error">{error}</p>}

      {puedeEscribir && (
        <FormGasto
          key={editando?.id ?? 'nuevo'}
          categorias={categorias}
          items={items}
          cotizacion={cotizacion}
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
            <strong>{formatear(total)}</strong>
          </div>
          <div className="reparto">
            <span>Fijo <b>{formatear(fijo)}</b> · Variable <b>{formatear(total - fijo)}</b></span>
            <span>Familiar <b>{formatear(total - individual)}</b> · Individual <b>{formatear(individual)}</b></span>
          </div>
          {porCategoria.length > 0 && <GraficoTorta datos={porCategoria} total={total} />}
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
                  <th>Comprobante/Factura</th>
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
                    <td>
                      {g.comprobante ? (
                        <button className="secundario comprobante" onClick={() => setViendoComprobante(g.comprobante)}>
                          📎 Ver
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    {puedeEscribir && (
                      <td className="acciones">
                        <button className="secundario" onClick={() => setEditando(g)}>Editar</button>
                        {g.creado_por === yo && (
                          <button className="peligro" onClick={() => borrar(g)}>Borrar</button>
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

      {viendoComprobante && (
        <VisorComprobante ruta={viendoComprobante} onCerrar={() => setViendoComprobante(null)} />
      )}

      {duenio.propio && <Compartir />}
    </>
  )
}
