// Nombres de personas (se cargan en los ingresos y se eligen en "Quién pagó"):
// solo letras (con acentos y ñ), con un espacio entre palabras.
// La base aplica la misma regla y no deja repetir nombres sin importar mayúsculas.
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/

// Para el input: descarta todo lo que no sea letra o espacio mientras se tipea
export const filtrarLetras = (texto) => texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '')

export const normalizarNombre = (texto) => texto.trim().replace(/\s+/g, ' ')

const clave = (nombre) => nombre.toLocaleLowerCase('es')

// Devuelve el error, o null si el nombre es válido
export function validarNombre(nombre) {
  if (!nombre) return 'Escribí un nombre.'
  if (!SOLO_LETRAS.test(nombre)) return 'Solo se permiten letras en el nombre.'
  return null
}

// La persona ya cargada con ese nombre (sin importar mayúsculas), o null
export const buscarPersona = (nombre, personas) => personas.find((p) => clave(p.nombre) === clave(nombre)) ?? null
