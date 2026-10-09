import { formatear } from '../moneda'

// Cada categoría este mes contra el mes anterior y el promedio de los 3 anteriores (todo en pesos)
// filas: [{ nombre, actual, anterior, promedio }]
export default function Comparacion({ filas }) {
  return (
    <div className="comparacion tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th className="num">Este mes</th>
            <th className="num">Mes anterior</th>
            <th className="num">Promedio 3 meses</th>
            <th className="num">Variación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const variacion = f.promedio > 0 ? ((f.actual - f.promedio) / f.promedio) * 100 : null
            const clase = variacion == null ? '' : variacion > 10 ? 'error' : variacion < 0 ? 'ok' : ''
            return (
              <tr key={f.nombre}>
                <td>{f.nombre}</td>
                <td className="num">{formatear(f.actual)}</td>
                <td className="num">{formatear(f.anterior)}</td>
                <td className="num">{formatear(f.promedio)}</td>
                <td className={`num ${clase}`}>
                  {variacion == null ? '—' : `${variacion > 0 ? '+' : ''}${Math.round(variacion)} %`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
