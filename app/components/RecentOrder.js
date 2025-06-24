export default function RecentOrders() {
    const orders = [
      {
        id: '#001',
        reseller: 'Sari Beauty Store',
        product: 'Serum Vitamin C (x10)',
        total: 'Rp 750.000',
        status: 'pending'
      },
      {
        id: '#002',
        reseller: 'Cantik Cosmetics',
        product: 'Foundation Set (x5)',
        total: 'Rp 1.250.000',
        status: 'approved'
      },
      {
        id: '#003',
        reseller: 'Glow Beauty Shop',
        product: 'Moisturizer (x8)',
        total: 'Rp 640.000',
        status: 'shipped'
      }
    ]
  
    const getStatusBadge = (status) => {
      const statusMap = {
        pending: 'status-pending',
        approved: 'status-approved',
        shipped: 'status-shipped'
      }
      const statusText = {
        pending: 'Pending',
        approved: 'Disetujui',
        shipped: 'Dikirim'
      }
      return (
        <span className={`status-badge ${statusMap[status]}`}>
          {statusText[status]}
        </span>
      )
    }
  
    return (
      <div className="table-container">
        <h5 className="mb-3">Pesanan Terbaru</h5>
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reseller</th>
                <th>Produk</th>
                <th>Total</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.reseller}</td>
                  <td>{order.product}</td>
                  <td>{order.total}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary btn-custom">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }