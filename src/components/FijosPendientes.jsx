import { formatear } from '../moneda'

// Gastos fijos que se cargaron el mes anterior y todavía no este mes
export default function FijosPendientes({ pendientes, onCargar }) {
  return (
    <section className="tarjeta">
      <h2>Fijos pendientes</h2>
      <p className="nota">Se cargaron el mes anterior y todavía no este mes.</p>
      <ul className="pendientes">
        {pendientes.map((g) => (
          <li key={g.item_id}>
            <span>{g.items?.nombre}</span>
            <span className="num">{formatear(g.monto, g.moneda)}</span>
            <button className="secundario" onClick={() => onCargar(g)}>Cargar</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
