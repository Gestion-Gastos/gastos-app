// CSV pensado para abrir con doble clic en Excel en español:
// separador ";", decimales con coma y BOM para que se vean bien los acentos.

export const numeroCsv = (n) => (n == null || n === '' ? '' : Number(n).toFixed(2).replace('.', ','))

function campo(valor) {
  const texto = valor == null ? '' : String(valor)
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function descargarCsv(nombreArchivo, encabezados, filas) {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(campo).join(';'))
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
