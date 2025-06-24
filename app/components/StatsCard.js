export default function StatsCard({ icon, title, value, variant = '' }) {
    return (
      <div className={`card stat-card ${variant}`}>
        <div className="card-body text-center">
          <i className={`${icon} fa-2x mb-2`}></i>
          <h5 className="card-title">{title}</h5>
          <h3 className="mb-0">{value}</h3>
        </div>
      </div>
    )
  }