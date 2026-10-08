import { useState } from 'react'
import { supabase } from '../supabaseClient'

// El invitado entra por el link del mail sin contraseña: acá elige una
export default function ElegirPassword() {
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password, data: { falta_password: false } })
    setEnviando(false)
    if (error) setMensaje(error.message)
  }

  return (
    <form className="tarjeta login" onSubmit={enviar}>
      <h2>Elegí tu contraseña</h2>
      <p className="nota">Te invitaron a ver unos gastos. Elegí una contraseña para entrar las próximas veces.</p>
      <label>
        Contraseña
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {mensaje && <p className="error">{mensaje}</p>}
      <button disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar y entrar'}</button>
    </form>
  )
}
