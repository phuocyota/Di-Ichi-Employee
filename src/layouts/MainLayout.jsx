import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Header } from '../components/Layout/Header.jsx'
import { Sidebar } from '../components/Layout/Sidebar.jsx'
import { AUTH_UNAUTHORIZED_EVENT } from '../services/api.js'
import { useUpdatesConnection } from '../services/realtime.js'

export const MainLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  // Một kết nối Socket.IO /updates cho mọi trang đã đăng nhập.
  useUpdatesConnection()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Token bị thu hồi (đổi mật khẩu, đổi quyền/trạng thái tài khoản) thì không giữ màn hình với phiên đã chết.
  useEffect(() => {
    const expired = () => {
      toast.error(t('Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.'), { id: 'session-expired' })
      navigate('/login', { replace: true })
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, expired)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, expired)
  }, [navigate, t])

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="px-4 py-5 lg:px-6">
          <motion.div className="mx-auto max-w-7xl space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
