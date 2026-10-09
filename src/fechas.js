const dos = (n) => String(n).padStart(2, '0')

export function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

export function mesActual() {
  return hoy().slice(0, 7)
}

export function diasDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

export function rangoDelMes(mes) {
  return { desde: `${mes}-01`, hasta: `${mes}-${dos(diasDelMes(mes))}` }
}

// 'AAAA-MM' corrido n meses (n negativo = hacia atrás)
export function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`
}

// El mismo día de una fecha pero en otro mes (si el mes es más corto, el último día)
export function fechaEnMes(fecha, mes) {
  const dia = Math.min(Number(fecha.slice(8, 10)), diasDelMes(mes))
  return `${mes}-${dos(dia)}`
}

// Para cargar algo en el mes que se está viendo: hoy si es el mes actual, si no el día 1
export function fechaPorDefecto(mes) {
  return mes === mesActual() ? hoy() : `${mes}-01`
}

export const fechaCorta = (fecha) => fecha.split('-').reverse().join('/')
