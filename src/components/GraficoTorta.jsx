import { useState } from 'react'

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const porcentaje = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 })

// Más de 6 porciones no se distinguen: las 5 mayores y el resto juntas en gris
const MAX_PORCIONES = 5
const RADIO = 74 // centro del anillo (externo 90, interno 58)
const GROSOR = 32
const CIRCUNFERENCIA = 2 * Math.PI * RADIO
const SEPARACION = 2

// datos: [[nombre, monto], ...] ordenado de mayor a menor
export default function GraficoTorta({ datos, total }) {
  const [activa, setActiva] = useState(null)

  const porciones = datos.slice(0, MAX_PORCIONES).map(([nombre, monto], i) => ({
    nombre,
    monto,
    color: `var(--serie-${i + 1})`,
  }))
  const resto = datos.slice(MAX_PORCIONES).reduce((s, [, monto]) => s + monto, 0)
  if (resto > 0) porciones.push({ nombre: 'Resto', monto: resto, color: 'var(--serie-resto)' })

  let acumulado = 0
  const arcos = porciones.map((p) => {
    const largo = (p.monto / total) * CIRCUNFERENCIA
    const arco = { ...p, largo, inicio: acumulado }
    acumulado += largo
    return arco
  })

  const detalle = (p) => `${p.nombre}: ${pesos.format(p.monto)} (${porcentaje.format(p.monto / total)})`

  return (
    <div className="torta" onMouseLeave={() => setActiva(null)}>
      <svg viewBox="0 0 200 200" role="img" aria-label="Gastos del mes por categoría">
        <g transform="rotate(-90 100 100)">
          {arcos.map((a) => {
            const visible = arcos.length > 1 ? Math.max(a.largo - SEPARACION, 0.5) : a.largo
            return (
              <circle
                key={a.nombre}
                className={activa && activa !== a.nombre ? 'atenuada' : undefined}
                cx="100"
                cy="100"
                r={RADIO}
                fill="none"
                stroke={a.color}
                strokeWidth={activa === a.nombre ? GROSOR + 6 : GROSOR}
                strokeDasharray={`${visible} ${CIRCUNFERENCIA - visible}`}
                strokeDashoffset={-a.inicio}
                onMouseEnter={() => setActiva(a.nombre)}
                onClick={() => setActiva(a.nombre)}
              >
                <title>{detalle(a)}</title>
              </circle>
            )
          })}
        </g>
        <text x="100" y="94" textAnchor="middle" className="torta-etiqueta">Total</text>
        <text x="100" y="116" textAnchor="middle" className="torta-total">{pesos.format(total)}</text>
      </svg>

      <ul className="torta-leyenda">
        {arcos.map((a) => (
          <li
            key={a.nombre}
            className={activa === a.nombre ? 'activa' : undefined}
            onMouseEnter={() => setActiva(a.nombre)}
          >
            <span className="punto" style={{ background: a.color }} />
            <span className="nombre">{a.nombre}</span>
            <span className="num">{pesos.format(a.monto)}</span>
            <span className="pct">{porcentaje.format(a.monto / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
