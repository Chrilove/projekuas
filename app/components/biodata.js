// pages/index.js
import Head from 'next/head'
import 'bootstrap/dist/css/bootstrap.min.css'
import Script from 'next/script'

export default function Home() {
  return (
    <>
      <Head>
        <title>Biodata</title>
        <meta name="description" content="Biodata singkat" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </Head>

      <div className="min-vh-100" style={{
        background: 'linear-gradient(135deg, #e8b4cb 0%, #d8a7ca 50%, #c8a2c8 100%)'
      }}>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {/* Header Section */}
              <div className="text-center mb-5">
                {/* Profile Photo */}
                <div className="mb-4">
                  <img 
                    src="/images/foto.jpg" 
                    alt="Profile Photo"
                    className="rounded-circle shadow-lg"
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'cover',
                      border: '4px solid rgba(255,255,255,0.8)'
                    }}
                  />
                </div>
                
                <h1 className="display-4 fw-bold text-dark mb-3">
                  <span style={{color: '#e8b4cb'}}></span> Biodata Singkat</h1>
              </div>

              {/* Cards Section */}
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="card h-100 shadow-sm border-0" style={{backgroundColor: 'rgba(255,255,255,0.9)'}}>
                    <div className="card-body text-center p-4">
                      <div className="mb-3">
                        <i className="fas fa-user-circle text-primary" style={{fontSize: '3rem'}}></i>
                      </div>
                      <h5 className="card-title fw-bold">Data Personal</h5>
                      <div className="text-start mt-4">
                        <div className="mb-2">
                          <strong>Nama:</strong><br/>
                          <span className="text-muted">Christianty Nur Fhadilah</span>
                        </div>
                        <div className="mb-2">
                          <strong>Tempat Lahir:</strong><br/>
                          <span className="text-muted">Bandung</span>
                        </div>
                        <div className="mb-2">
                          <strong>Tanggal Lahir:</strong><br/>
                          <span className="text-muted">12 Desember 2025</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card h-100 shadow-sm border-0" style={{backgroundColor: 'rgba(255,255,255,0.9)'}}>
                    <div className="card-body text-center p-4">
                      <div className="mb-3">
                        <i className="fas fa-graduation-cap text-success" style={{fontSize: '3rem'}}></i>
                      </div>
                      <h5 className="card-title fw-bold">Pendidikan</h5>
                      <div className="text-start mt-4">
                        <div className="mb-2">
                          <strong>Universitas:</strong><br/>
                          <span className="text-muted">Universitas Masoem</span>
                        </div>
                        <div className="mb-2">
                          <strong>Jurusan:</strong><br/>
                          <span className="text-muted">Komputerisaasi Akuntansi</span>
                        </div>
                        <div className="mb-2">
                          <strong>Tahun Lulus:</strong><br/>
                          <span className="text-muted">2023</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card h-100 shadow-sm border-0" style={{backgroundColor: 'rgba(255,255,255,0.9)'}}>
                    <div className="card-body text-center p-4">
                      <div className="mb-3">
                        <i className="fas fa-address-card text-warning" style={{fontSize: '3rem'}}></i>
                      </div>
                      <h5 className="card-title fw-bold">Kontak</h5>
                      <div className="text-start mt-4">
                        <div className="mb-2">
                          <strong>Email:</strong><br/>
                          <span className="text-muted">chrislove04@gmail.com</span>
                        </div>
                        <div className="mb-2">
                          <strong>Telepon:</strong><br/>
                          <span className="text-muted">+62 895 3308 76559</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js" 
        strategy="afterInteractive" 
      />
    </>
  )
}