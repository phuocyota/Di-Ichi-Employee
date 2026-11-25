import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckInPhotoDialog } from '../../components/Attendance/CheckInPhotoDialog.jsx'
import { ShiftCheckCard } from '../../components/Attendance/ShiftCheckCard.jsx'
import { Button } from '../../components/Common/Button.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { useResourceUpdates } from '../../services/realtime.js'
import { checkInShift, checkOutShift, getMyTodayShifts } from '../../services/workShiftApi.js'

const getApiErrorMessage = (error, t) => {
  if (error.response?.status === 401) return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  if (error.response?.status === 403) {
    const message = error.response?.data?.message
    if (message && message !== 'Bạn không có quyền truy cập') return t(message)
    return t('Tài khoản chưa được cấp quyền chấm công. Vui lòng liên hệ quản trị viên.')
  }
  const backendMessage = error.response?.data?.error?.message || error.response?.data?.message
  if (backendMessage) return Array.isArray(backendMessage) ? backendMessage.map((item) => t(item)).join(' ') : t(backendMessage)
  if (!error.response) return t('Không thể kết nối máy chủ. Vui lòng thử lại.')
  return t('Không thể chấm công. Vui lòng thử lại.')
}

const formatDate = (value) => (value ? value.split('-').reverse().join('/') : '')

export const AttendancePage = () => {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  // Ca đang mở hộp thoại chụp ảnh check-in.
  const [photoShift, setPhotoShift] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getMyTodayShifts())
    } catch (cause) {
      setError(getApiErrorMessage(cause, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    getMyTodayShifts(controller.signal)
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(cause, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [t])

  // Quản trị viên phân ca/điều chỉnh công thì tải lại ngầm; tạm dừng khi đang check-in/check-out.
  useResourceUpdates(async () => setData(await getMyTodayShifts()), ['work-shifts', 'attendance-record'], !busyId && !photoShift)

  const run = async (shift, action, message) => {
    setBusyId(shift.id)
    try {
      setData(await action(shift.id))
      toast.success(message)
      return true
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, t))
      // Tải lại để hiển thị trạng thái mới nhất (ví dụ quản trị viên vừa điều chỉnh công).
      load()
      return false
    } finally {
      setBusyId('')
    }
  }

  // Gửi check-in kèm ảnh; thành công thì đóng hộp thoại, lỗi thì giữ lại để chụp/gửi lại.
  const confirmCheckIn = async (photo) => {
    const shift = photoShift
    if (!shift) return
    const done = await run(shift, (id) => checkInShift(id, photo), t('Đã check-in'))
    if (done) setPhotoShift(null)
  }

  const shifts = data?.assignments || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-orange-600">Di-Ichi Employee Portal</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{t('Chấm công')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {data ? t('Ca làm hôm nay ({{date}}) của {{name}}. Giờ chấm công lấy theo máy chủ.', { date: formatDate(data.date), name: data.staff?.name }) : t('Check-in khi đến và check-out khi kết thúc ca làm hôm nay.')}
          </p>
        </div>
        <Button variant="secondary" disabled={loading || Boolean(busyId)} onClick={() => load()}>
          <RefreshCw size={18} aria-hidden="true" />
          {t('Tải lại')}
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {loading && !data && (
        <Card>
          <p role="status" className="text-sm text-slate-600">{t('Đang tải ca làm hôm nay...')}</p>
        </Card>
      )}
      {data && shifts.length === 0 && (
        <Card>
          <p className="text-sm text-slate-600">{t('Hôm nay bạn không có ca làm được phân.')}</p>
        </Card>
      )}
      {shifts.map((shift) => (
        <ShiftCheckCard
          key={shift.id}
          shift={shift}
          busy={Boolean(busyId) || loading}
          onCheckIn={(item) => setPhotoShift(item)}
          onCheckOut={(item) => run(item, checkOutShift, t('Đã check-out'))}
        />
      ))}
      {photoShift && (
        <CheckInPhotoDialog
          shift={photoShift}
          busy={busyId === photoShift.id}
          onCancel={() => setPhotoShift(null)}
          onConfirm={confirmCheckIn}
        />
      )}
    </div>
  )
}
