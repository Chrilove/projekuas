'use client'
import Link from 'next/link'

export default function VerificationCard() {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Verifikasi Barang Hari Ini</h5>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span>Selesai</span>
          <span className="badge bg-success">12</span>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span>Menunggu</span>
          <span className="badge bg-warning">6</span>
        </div>
        <hr />
        <Link href="/admin/verification" className="btn btn-primary btn-custom w-100">
          Lihat Detail
        </Link>
      </div>
    </div>
  )
}