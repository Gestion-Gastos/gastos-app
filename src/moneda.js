export const MONEDAS = ['$', 'U$D']

const numero = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatear = (monto, moneda = '$') => `${moneda} ${numero.format(monto)}`
