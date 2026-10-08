import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Gastos from './components/Gastos'
import ElegirPassword from './components/ElegirPassword'

const PERMISOS = { lectura: 'solo lectura', escritura: 'lectura y escritura' }

export default function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  // Invitaciones que me hicieron otros usuarios, y de quién son los gastos que estoy viendo
  const [recibidos, setRecibidos] = useState([])
  const [viendo, setViendo] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const email = session?.user.email?.toLowerCase()

  useEffect(() => {
    setViendo('')
    setRecibidos([])
    if (!email) return
    supabase
      .from('compartidos')
      .select('duenio_id, duenio_email, permiso')
      .eq('email', email)
      .order('duenio_email')
      .then(({ data }) => setRecibidos(data ?? []))
  }, [userId, email])

  if (cargando) return <p className="centro">Cargando…</p>

  const compartido = recibidos.find((r) => r.duenio_id === viendo)
  const duenio = compartido
    ? { id: compartido.duenio_id, email: compartido.duenio_email, permiso: compartido.permiso }
    : { id: userId, propio: true }

  let contenido = <Login />
  if (session?.user.user_metadata?.falta_password) contenido = <ElegirPassword />
  else if (session) contenido = <Gastos key={duenio.id} duenio={duenio} yo={userId} />

  return (
    <div className="contenedor">
      <header className="cabecera">
        <h1 className="titulo">
          <img src={`${import.meta.env.BASE_URL}icono.svg`} alt="" className="logo" />
          Gestión de Gastos
        </h1>
        {session && (
          <div className="usuario">
            <span>{session.user.email}</span>
            <button className="secundario" onClick={() => supabase.auth.signOut()}>
              Salir
            </button>
          </div>
        )}
      </header>
      {session && recibidos.length > 0 && !session.user.user_metadata?.falta_password && (
        <label className="viendo">
          Ver
          <select value={viendo} onChange={(e) => setViendo(e.target.value)}>
            <option value="">Mis gastos</option>
            {recibidos.map((r) => (
              <option key={r.duenio_id} value={r.duenio_id}>
                Gastos de {r.duenio_email} ({PERMISOS[r.permiso]})
              </option>
            ))}
          </select>
        </label>
      )}
      {contenido}
    </div>
  )
}
