export const MONEDAS = ['$', 'U$D']

const numero = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatear = (monto, moneda = '$') => `${moneda} ${numero.format(monto)}`

// Dólar oficial, valor de venta
export async function obtenerCotizacion() {
  const r = await fetch('https://dolarapi.com/v1/dolares/oficial')
  if (!r.ok) throw new Error('No se pudo obtener la cotización del dólar')
  const { venta, fechaActualizacion } = await r.json()
  return { venta, fecha: fechaActualizacion }
}

// Un gasto en U$D se convierte con la cotización que se guardó al cargarlo
export const enPesos = (g, cotizacionActual) =>
  g.moneda === 'U$D' ? Number(g.monto) * (g.cotizacion ?? cotizacionActual ?? 0) : Number(g.monto)
