import { useState } from 'react'
import { supabase } from '../supabaseClient'
import IconoGoogle from './IconoGoogle'

export default function Login() {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setMensaje(null)
    const { error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            // el mail de confirmación vuelve a donde te registraste (local o GitHub Pages)
            options: { emailRedirectTo: window.location.origin + window.location.pathname },
          })
    setEnviando(false)
    if (error) return setMensaje({ tipo: 'error', texto: error.message })
    if (modo === 'registro') {
      setMensaje({
        tipo: 'ok',
        texto: 'Cuenta creada. Revisá tu correo para confirmarla y después ingresá.',
      })
      setModo('entrar')
    }
  }

  async function conGoogle() {
    setMensaje(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // vuelve a donde estabas (local o GitHub Pages)
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    if (error) setMensaje({ tipo: 'error', texto: error.message })
  }

  return (
    <form className="tarjeta login" onSubmit={enviar}>
      <h2>{modo === 'entrar' ? 'Ingresar' : 'Crear cuenta'}</h2>
      <button type="button" className="secundario google" onClick={conGoogle}>
        <IconoGoogle />
        Continuar con Google
      </button>
      <p className="separador">o con tu mail</p>
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button disabled={enviando}>{modo === 'entrar' ? 'Ingresar' : 'Registrarme'}</button>
      {mensaje && <p className={mensaje.tipo}>{mensaje.texto}</p>}
      <button
        type="button"
        className="link"
        onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}
      >
        {modo === 'entrar' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  )
}
