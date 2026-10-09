import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import FormGasto from './FormGasto'
import FilaEdicion from './FilaEdicion'
import Modal from './Modal'
import Compartir from './Compartir'
import GraficoTorta from './GraficoTorta'
import VisorComprobante from './VisorComprobante'
import Ingresos from './Ingresos'
import FijosPendientes from './FijosPendientes'
import { formatear, obtenerCotizacion, enPesos } from '../moneda'
import { subirComprobante, borrarComprobante, nombreComprobante } from '../comprobantes'
import { descargarCsv, numeroCsv } from '../csv'
import { buscarPersona, normalizarNombre, validarNombre } from '../personas'
import { diasDelMes, fechaCorta, fechaEnMes, hoy, mesActual, rangoDelMes, sumarMeses } from '../fechas'

const MAX_COMPROBANTE = 10 * 1024 * 1024

// duenio: de quién son los gastos que se ven ({ id, propio } o { id, email, permiso } si me los compartieron)
// yo: mi id de usuario (solo quien cargó un gasto lo puede borrar)
export default function Gastos({ duenio, yo }) {
  const puedeEscribir = duenio.propio || duenio.permiso === 'escritura'
  const [mes, setMes] = useState(mesActual())
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [items, setItems] = useState([])
  const [personas, setPersonas] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroGasto, setFiltroGasto] = useState('')
  const [cotizacion, setCotizacion] = useState(null)
  // editando: id del gasto cuya fila está en edición. nuevoAbierto/precarga: ventana "Nuevo gasto"
  const [editando, setEditando] = useState(null)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [precarga, setPrecarga] = useState(null)
  const [errorGuardar, setErrorGuardar] = useState(null)
  // Gastos de los 3 meses anteriores (fijos pendientes; también los usaba la comparación, hoy oculta) e ingresos del mes
  const [anteriores, setAnteriores] = useState([])
  const [ingresos, setIngresos] = useState([])
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

  async function cargarPersonas() {
    const { data, error } = await supabase.from('personas').select('id, nombre').eq('user_id', duenio.id).order('nombre')
    if (error) return setError(error.message)
    setPersonas(data)
  }

  // Persona con ese nombre (para el Nombre de un ingreso): la existente sin importar mayúsculas, o una nueva
  async function personaPorNombre(texto) {
    const nombre = normalizarNombre(texto)
    const problema = validarNombre(nombre)
    if (problema) throw new Error(problema)
    const existente = buscarPersona(nombre, personas)
    if (existente) return existente
    const { data, error } = await supabase.from('personas').insert({ user_id: duenio.id, nombre }).select('id, nombre').single()
    if (error?.code === '23505') {
      // La cargó alguien más mientras tanto: se usa esa
      const { data: lista } = await supabase.from('personas').select('id, nombre').eq('user_id', duenio.id)
      setPersonas(lista ?? personas)
      const otra = buscarPersona(nombre, lista ?? [])
      if (otra) return otra
    }
    if (error) throw new Error(error.code === '23514' ? 'Solo se permiten letras en el nombre.' : error.message)
    await cargarPersonas()
    return data
  }

  // Si un mes tiene al menos un ingreso (el que se está viendo ya está cargado; otro, se consulta)
  async function mesTieneIngresos(m) {
    if (m === mes) return ingresos.length > 0
    const { desde, hasta } = rangoDelMes(m)
    const { count, error } = await supabase
      .from('ingresos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', duenio.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
    return !error && count > 0
  }

  async function cargarGastos() {
    const { desde, hasta } = rangoDelMes(mes)
    const { data, error } = await supabase
      .from('gastos')
      .select('id, fecha, monto, moneda, cotizacion, descripcion, medio_pago, categoria_id, categorias(nombre), item_id, items(nombre), fijo, individual, pagado_por, personas(nombre), creado_por, creado_por_email, modificado_por_email, modificado_en, comprobante')
      .eq('user_id', duenio.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
    if (error) return setError(error.message)
    setError(null)
    setGastos(data)
    cargarAnteriores()
  }

  async function cargarAnteriores() {
    const { data, error } = await supabase
      .from('gastos')
      .select('fecha, monto, moneda, cotizacion, descripcion, medio_pago, categoria_id, categorias(nombre), item_id, items(nombre), fijo, individual, pagado_por')
      .eq('user_id', duenio.id)
      .gte('fecha', rangoDelMes(sumarMeses(mes, -3)).desde)
      .lte('fecha', rangoDelMes(sumarMeses(mes, -1)).hasta)
      .order('fecha')
    if (error) return setError(error.message)
    setAnteriores(data)
  }

  async function cargarIngresos() {
    const { desde, hasta } = rangoDelMes(mes)
    const { data, error } = await supabase
      .from('ingresos')
      .select('id, fecha, monto, moneda, cotizacion, descripcion, persona_id, personas(nombre)')
      .eq('user_id', duenio.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')
      .order('id')
    if (error) return setError(error.message)
    setIngresos(data)
  }

  useEffect(() => {
    cargarCategorias()
    cargarItems()
    cargarPersonas()
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
    cargarIngresos()
    cerrarNuevo()
    setEditando(null)
  }, [mes])

  // Ventana "Nuevo gasto": vacía, o completada al "Cargar" un fijo pendiente
  function abrirNuevo(valores = null) {
    setEditando(null)
    setErrorGuardar(null)
    setPrecarga(valores)
    setNuevoAbierto(true)
  }

  function cerrarNuevo() {
    setNuevoAbierto(false)
    setPrecarga(null)
    setErrorGuardar(null)
  }

  function cargarPendiente(g) {
    const { categorias: _c, items: _i, cotizacion: _cot, ...campos } = g
    // El mismo día que el mes anterior, pero nunca después de hoy
    const fecha = fechaEnMes(g.fecha, mes)
    abrirNuevo({ ...campos, fecha: fecha > hoy() ? hoy() : fecha })
  }

  // Editar: la fila del gasto se vuelve editable
  function editar(g) {
    cerrarNuevo()
    setEditando(g.id)
  }

  function cancelarEdicion() {
    setEditando(null)
    setErrorGuardar(null)
  }

  // Alta o modificación. Devuelve si se guardó; si no, deja el error en errorGuardar y no cierra nada.
  async function guardar(gasto, { archivo, quitar }) {
    const { id, ...campos } = gasto
    if (campos.fecha > hoy()) return falla('La fecha no puede ser posterior a hoy.')
    if (!campos.pagado_por) return falla('Elegí quién pagó.')
    // Un gasto nuevo (o que se pasa a otro mes) necesita que ese mes tenga al menos un ingreso
    const mesGasto = campos.fecha.slice(0, 7)
    const mesOriginal = id ? gastos.find((g) => g.id === id)?.fecha.slice(0, 7) : null
    if (mesGasto !== mesOriginal && !(await mesTieneIngresos(mesGasto))) {
      return falla('Para cargar gastos de este mes, primero cargá al menos un ingreso del mes.')
    }
    // Un gasto en U$D nuevo (o que pasó de $ a U$D) guarda la cotización de hoy
    if (campos.moneda === 'U$D' && campos.cotizacion == null) {
      if (!cotizacion) return falla('No hay cotización del dólar disponible; no se puede guardar un gasto en U$D.')
      campos.cotizacion = cotizacion.venta
    }
    if (archivo && archivo.size > MAX_COMPROBANTE) return falla('El comprobante/factura no puede pesar más de 10 MB.')

    // El comprobante se sube primero y se guarda en la misma operación que el gasto
    const anterior = id ? gastos.find((g) => g.id === id)?.comprobante : null
    let nuevo = null
    try {
      if (archivo) {
        nuevo = await subirComprobante(duenio.id, archivo)
        campos.comprobante = nuevo
      } else if (quitar && anterior) {
        campos.comprobante = null
      }
    } catch (e) {
      return falla(`No se pudo subir el comprobante/factura: ${e.message}`)
    }

    const { error } = id
      ? await supabase.from('gastos').update(campos).eq('id', id)
      : await supabase.from('gastos').insert({ ...campos, user_id: duenio.id })
    if (error) {
      borrarComprobante(nuevo).catch(() => {})
      return falla(error.message)
    }
    if (anterior && 'comprobante' in campos) borrarComprobante(anterior).catch(() => {})

    setError(null)
    cerrarNuevo()
    setEditando(null)
    cargarGastos()
    return true
  }

  function falla(mensaje) {
    setErrorGuardar(mensaje)
    return false
  }

  // Exporta los gastos que se ven (mes y filtros aplicados)
  function exportarCsv() {
    const encabezados = [
      'Fecha', 'Categoría', 'Item', 'Tipo', 'Gasto', 'Descripción', 'Medio de pago', 'Moneda', 'Monto',
      'Cotización', 'Monto en pesos', 'Quién pagó', 'Cargado por', 'Modificado por', 'Comprobante/Factura',
    ]
    const filas = filtrados.map((g) => [
      fechaCorta(g.fecha),
      g.categorias?.nombre ?? '',
      g.items?.nombre ?? '',
      g.fijo ? 'Fijo' : 'Variable',
      g.individual ? 'Individual' : 'Familiar',
      g.descripcion ?? '',
      g.medio_pago ?? '',
      g.moneda,
      numeroCsv(g.monto),
      g.moneda === 'U$D' ? numeroCsv(g.cotizacion) : '',
      numeroCsv(enPesos(g, cotizacion?.venta)),
      g.personas?.nombre ?? '',
      g.creado_por_email ?? '',
      g.modificado_por_email ?? '',
      g.comprobante ? nombreComprobante(g.comprobante) : '',
    ])
    const de = duenio.propio ? '' : `${duenio.email.split('@')[0]}-`
    descargarCsv(`gastos-${de}${mes}.csv`, encabezados, filas)
  }

  async function borrar(g) {
    if (!confirm('¿Borrar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', g.id)
    if (error) return setError(error.message)
    borrarComprobante(g.comprobante).catch(() => {})
    cargarGastos()
  }

  const pasaFiltros = (g) =>
    (!filtroTipo || g.fijo === (filtroTipo === 'fijo')) &&
    (!filtroGasto || g.individual === (filtroGasto === 'individual'))

  const filtrados = useMemo(() => gastos.filter(pasaFiltros), [gastos, filtroTipo, filtroGasto])

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

  // Ingresos y disponible: sobre todos los gastos del mes, sin filtros
  const totalMes = useMemo(() => suma(gastos), [gastos, venta])
  const totalIngresos = useMemo(() => suma(ingresos), [ingresos, venta])
  const disponible = totalIngresos - totalMes

  // Fijos del mes anterior cuyo item todavía no tiene ningún gasto este mes (el último de cada item)
  const pendientes = useMemo(() => {
    const anterior = sumarMeses(mes, -1)
    const cargados = new Set(gastos.map((g) => g.item_id))
    const porItem = new Map()
    for (const g of anteriores) {
      if (g.fijo && g.item_id && g.fecha.startsWith(anterior) && !cargados.has(g.item_id)) porItem.set(g.item_id, g)
    }
    return [...porItem.values()].sort((a, b) => (a.items?.nombre ?? '').localeCompare(b.items?.nombre ?? ''))
  }, [anteriores, gastos, mes])

  // Proyección (solo el mes actual): fijos cargados + fijos pendientes + variables al ritmo diario de hasta hoy
  const proyeccion = useMemo(() => {
    if (mes !== mesActual() || gastos.length === 0) return null
    const dia = Number(hoy().slice(8, 10))
    const variables = suma(gastos.filter((g) => !g.fijo))
    return suma(gastos.filter((g) => g.fijo)) + suma(pendientes) + (variables / dia) * diasDelMes(mes)
  }, [mes, gastos, pendientes, venta])

  return (
    <>
      {error && <p className="error">{error}</p>}

      <Ingresos
        key={mes}
        duenio={duenio}
        mes={mes}
        ingresos={ingresos}
        personas={personas}
        cotizacion={cotizacion}
        puedeEscribir={puedeEscribir}
        onPersona={personaPorNombre}
        onCambio={cargarIngresos}
        onError={setError}
      />

      {puedeEscribir && (
        <>
          <button className="nuevo-gasto" onClick={() => abrirNuevo()}>+ Nuevo gasto</button>
          {ingresos.length === 0 && (
            <p className="nota aviso-ingresos">Para cargar gastos de este mes, primero cargá al menos un ingreso del mes.</p>
          )}
        </>
      )}

      {nuevoAbierto && (
        <Modal titulo="Nuevo gasto" onCerrar={cerrarNuevo}>
          {errorGuardar && <p className="error">{errorGuardar}</p>}
          <FormGasto
            categorias={categorias}
            items={items}
            personas={personas}
            cotizacion={cotizacion}
            precarga={precarga}
            onGuardar={guardar}
            onCancelar={cerrarNuevo}
          />
        </Modal>
      )}

      {puedeEscribir && pendientes.length > 0 && <FijosPendientes pendientes={pendientes} onCargar={cargarPendiente} />}

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
            <div className="navegar-mes">
              <button className="secundario" aria-label="Mes anterior" title="Mes anterior" onClick={() => setMes(sumarMeses(mes, -1))}>
                ◀
              </button>
              <input type="month" max={mesActual()} value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
              <button
                className="secundario"
                aria-label="Mes siguiente"
                title="Mes siguiente"
                disabled={mes >= mesActual()}
                onClick={() => setMes(sumarMeses(mes, 1))}
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div className="resumen">
          {ingresos.length > 0 && (
            <div className="balance">
              <span>Ingresos <b>{formatear(totalIngresos)}</b></span>
              <span>Gastos <b>{formatear(totalMes)}</b></span>
              <span>Disponible <b className={disponible < 0 ? 'error' : 'ok'}>{formatear(disponible)}</b></span>
            </div>
          )}
          <div className="total">
            <span>Total del mes</span>
            <strong>{formatear(total)}</strong>
          </div>
          <div className="reparto">
            <span>Fijo <b>{formatear(fijo)}</b> · Variable <b>{formatear(total - fijo)}</b></span>
            <span>Familiar <b>{formatear(total - individual)}</b> · Individual <b>{formatear(individual)}</b></span>
          </div>
          {proyeccion != null && (
            <div className="reparto">
              <span>Proyección a fin de mes <b>{formatear(proyeccion)}</b></span>
              {ingresos.length > 0 && (
                <span>
                  Disponible proyectado{' '}
                  <b className={totalIngresos - proyeccion < 0 ? 'error' : 'ok'}>{formatear(totalIngresos - proyeccion)}</b>
                </span>
              )}
            </div>
          )}
          {porCategoria.length > 0 && <GraficoTorta datos={porCategoria} total={total} />}
        </div>

        {editando && errorGuardar && <p className="error">{errorGuardar}</p>}

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
                  <th>Quién pagó</th>
                  <th>Cargado por</th>
                  <th>Modificado por</th>
                  <th>Comprobante/Factura</th>
                  <th className="acciones">
                    <button className="secundario exportar" onClick={exportarCsv} title="Exporta los gastos que se ven (mes y filtros)">
                      ⬇ Exportar CSV
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((g) =>
                  g.id === editando ? (
                    <FilaEdicion
                      key={g.id}
                      gasto={g}
                      categorias={categorias}
                      items={items}
                      personas={personas}
                      onGuardar={guardar}
                      onCancelar={cancelarEdicion}
                      onVerComprobante={setViendoComprobante}
                    />
                  ) : (
                  <tr key={g.id}>
                    <td>{fechaCorta(g.fecha)}</td>
                    <td>{g.categorias?.nombre ?? '—'}</td>
                    <td>{g.items?.nombre ?? '—'}</td>
                    <td>{g.fijo ? 'Fijo' : 'Variable'} · {g.individual ? 'Individual' : 'Familiar'}</td>
                    <td className="largo">{g.descripcion}</td>
                    <td>{g.medio_pago}</td>
                    <td>{g.moneda}</td>
                    <td className="num">{formatear(g.monto, g.moneda)}</td>
                    <td>{g.personas?.nombre ?? '—'}</td>
                    <td className="largo">{g.creado_por_email ?? '—'}</td>
                    <td
                      className="largo"
                      title={
                        g.modificado_en
                          ? new Date(g.modificado_en).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                          : undefined
                      }
                    >
                      {g.modificado_por_email ?? '—'}
                    </td>
                    <td>
                      {g.comprobante ? (
                        <button className="secundario comprobante" onClick={() => setViendoComprobante(g.comprobante)}>
                          📎 Ver
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    {puedeEscribir ? (
                      <td className="acciones">
                        <button className="secundario" onClick={() => editar(g)}>Editar</button>
                        {g.creado_por === yo && (
                          <button className="peligro" onClick={() => borrar(g)}>Borrar</button>
                        )}
                      </td>
                    ) : (
                      <td></td>
                    )}
                  </tr>
                  )
                )}
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
