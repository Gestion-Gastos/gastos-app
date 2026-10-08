import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const PERMISOS = { lectura: 'Solo lectura', escritura: 'Lectura y escritura' }

export default function Compartir() {
  const [compartidos, setCompartidos] = useState([])
  const [email, setEmail] = useState('')
  const [permiso, setPermiso] = useState('lectura')
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('compartidos')
      .select('id, email, permiso')
      .eq('duenio_id', user.id)
      .order('email')
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    setCompartidos(data)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function invitar(e) {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const { data, error } = await supabase.functions.invoke('invitar', {
      body: { email, permiso, redireccion: window.location.origin + window.location.pathname },
    })
    setEnviando(false)
    if (error) {
      const detalle = await error.context?.json?.().catch(() => null)
      return setMensaje({ tipo: 'error', texto: detalle?.error ?? error.message })
    }
    setMensaje({
      tipo: 'ok',
      texto:
        data.estado === 'ya_registrado'
          ? `${email} ya tiene cuenta: va a ver tus gastos la próxima vez que entre.`
          : `Le mandamos la invitación a ${email}.`,
    })
    setEmail('')
    cargar()
  }

  async function cambiarPermiso(id, nuevo) {
    const { error } = await supabase.from('compartidos').update({ permiso: nuevo }).eq('id', id)
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    cargar()
  }

  async function quitar(c) {
    if (!confirm(`¿Dejar de compartir tus gastos con ${c.email}?`)) return
    const { error } = await supabase.from('compartidos').delete().eq('id', c.id)
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    cargar()
  }

  return (
    <section className="tarjeta">
      <h2>Compartir mis gastos</h2>
      <form className="grilla" onSubmit={invitar}>
        <label>
          Mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Permiso
          <select value={permiso} onChange={(e) => setPermiso(e.target.value)}>
            {Object.entries(PERMISOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <div className="botones">
          <button disabled={enviando}>{enviando ? 'Invitando…' : 'Invitar'}</button>
        </div>
      </form>
      {mensaje && <p className={mensaje.tipo}>{mensaje.texto}</p>}

      {compartidos.length > 0 && (
        <ul className="compartidos">
          {compartidos.map((c) => (
            <li key={c.id}>
              <span>{c.email}</span>
              <select value={c.permiso} onChange={(e) => cambiarPermiso(c.id, e.target.value)}>
                {Object.entries(PERMISOS).map(([valor, texto]) => (
                  <option key={valor} value={valor}>{texto}</option>
                ))}
              </select>
              <button className="peligro" onClick={() => quitar(c)}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
