import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Gastos from './components/Gastos'

export default function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (cargando) return <p className="centro">Cargando…</p>

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
      {session ? <Gastos /> : <Login />}
    </div>
  )
}
