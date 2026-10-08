// Comparte los gastos del usuario que llama con otro mail y le manda la invitación.
// Recibe { email, permiso, redireccion } y devuelve { estado: 'invitado' | 'ya_registrado' }.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function responder(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const authorization = req.headers.get('Authorization') ?? ''

  // Cliente con la sesión del dueño: RLS garantiza que solo comparte lo suyo
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user } } = await comoUsuario.auth.getUser()
  if (!user) return responder({ error: 'Tenés que iniciar sesión.' }, 401)

  const { email: emailCrudo, permiso, redireccion } = await req.json().catch(() => ({}))
  const email = String(emailCrudo ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder({ error: 'El mail no es válido.' }, 400)
  if (!['lectura', 'escritura'].includes(permiso)) return responder({ error: 'Permiso inválido.' }, 400)
  if (email === user.email?.toLowerCase()) return responder({ error: 'No podés compartir con vos mismo.' }, 400)

  const { error: errorCompartir } = await comoUsuario
    .from('compartidos')
    .upsert({ duenio_id: user.id, email, permiso }, { onConflict: 'duenio_id,email' })
  if (errorCompartir) return responder({ error: errorCompartir.message }, 400)

  // Con la service role se manda el mail de invitación (solo si todavía no tiene cuenta)
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redireccion,
    data: { falta_password: true },
  })
  if (!errorInvitar) return responder({ estado: 'invitado' })
  if (errorInvitar.code === 'email_exists' || /already been registered/i.test(errorInvitar.message)) {
    return responder({ estado: 'ya_registrado' })
  }
  return responder({ error: errorInvitar.message }, 500)
})
