import { Inter } from 'next/font/google'
import { AuthProvider } from './components/AuthProvider'
import { Toaster } from 'react-hot-toast' // ✅ Tambahkan ini
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BeautyOrder - Admin Dashboard',
  description: 'Sistem Pemesanan Kecantikan',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" /> {/* ✅ Tambahkan ini */}
        </AuthProvider>

        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  )
}
