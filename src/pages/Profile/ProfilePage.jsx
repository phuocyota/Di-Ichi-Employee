import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Common/Button.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { ProfileHeaderCard } from '../../components/Profile/ProfileHeaderCard.jsx'
import { ProfileStatsGrid } from '../../components/Profile/ProfileStatsGrid.jsx'
import { ProfileWorkPanel } from '../../components/Profile/ProfileWorkPanel.jsx'
import { getProfileOverview } from '../../services/profileApi.js'
import { useResourceUpdates } from '../../services/realtime.js'

const getErrorMessage = (error, t) => {
  if (error.response?.status === 401) return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  const backendMessage = error.response?.data?.error?.message || error.response?.data?.message
  if (backendMessage) return Array.isArray(backendMessage) ? backendMessage.map((item) => t(item)).join(' ') : t(backendMessage)
  if (!error.response) return t('Không thể kết nối máy chủ. Vui lòng thử lại.')
  return t('Không tải được hồ sơ. Vui lòng thử lại.')
}

export const ProfilePage = () => {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      setData(await getProfileOverview(signal))
    } catch (cause) {
      if (signal?.aborted) return
      setError(getErrorMessage(cause, t))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  // Tải lại ngầm khi hồ sơ, ứng viên, lịch hẹn hoặc ca làm thay đổi.
  useResourceUpdates(
    async () => setData(await getProfileOverview()),
    ['staff', 'user-account', 'branch', 'department', 'position', 'specialty', 'potential-candidates', 'appointments', 'work-shifts', 'student'],
    !loading,
  )

  if (!data) {
    return (
      <Card className="rounded-lg">
        {loading ? (
          <p className="text-sm font-semibold text-slate-500">{t('Đang tải hồ sơ...')}</p>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-semibold text-rose-700" role="alert">{error}</p>
            <Button variant="secondary" type="button" onClick={() => load()}><RefreshCw size={16} /> {t('Thử lại')}</Button>
          </div>
        )}
      </Card>
    )
  }

  const { profile, summary, appointments, candidates, todayShifts } = data
  const valueOf = (value) => (value === null || value === undefined ? '—' : value)
  const stats = [
    { label: t('Ứng viên đang theo dõi'), value: valueOf(summary?.lead) },
    { label: t('Học viên đang học'), value: valueOf(summary?.studying) },
    { label: t('Lịch hẹn sắp tới'), value: valueOf(appointments?.meta.total) },
    { label: t('Ca làm hôm nay'), value: valueOf(todayShifts?.length) },
  ]

  return (
    <div className="space-y-5">
      <ProfileHeaderCard profile={profile} />
      <ProfileStatsGrid stats={stats} />
      <ProfileWorkPanel profile={profile} appointments={appointments?.data ?? null} candidates={candidates?.data ?? null} />
    </div>
  )
}
