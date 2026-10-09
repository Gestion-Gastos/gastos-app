import { supabase } from './supabaseClient'

const BUCKET = 'comprobantes'

export const ACEPTADOS = '.pdf,image/*,.xls,.xlsx,.csv,.ods,.doc,.docx,.txt'

// Storage no acepta acentos ni algunos símbolos en las rutas
function sanear(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
}

// Ruta: {duenio}/{gasto}/{timestamp}-{nombre}
export async function subirComprobante(duenioId, gastoId, archivo) {
  const ruta = `${duenioId}/${gastoId}/${Date.now()}-${sanear(archivo.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || undefined })
  if (error) throw error
  return ruta
}

export async function borrarComprobante(ruta) {
  if (!ruta) return
  const { error } = await supabase.storage.from(BUCKET).remove([ruta])
  if (error) throw error
}

export function nombreComprobante(ruta) {
  return ruta.split('/').pop().replace(/^\d+-/, '')
}

export function tipoComprobante(ruta) {
  const ext = ruta.split('.').pop().toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'imagen'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'excel'
  if (ext === 'docx') return 'word'
  if (ext === 'txt') return 'texto'
  return 'otro'
}

export async function urlComprobante(ruta, opciones) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300, opciones)
  if (error) throw error
  return data.signedUrl
}

export async function bajarComprobante(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET).download(ruta)
  if (error) throw error
  return data
}
