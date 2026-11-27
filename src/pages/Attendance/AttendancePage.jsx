import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckInPhotoDialog } from '../../components/Attendance/CheckInPhotoDialog.jsx'
import { CheckOutReasonDialog } from '../../components/Attendance/CheckOutReasonDialog.jsx'
import { ShiftCheckCard } from '../../components/Attendance/ShiftCheckCard.jsx'
import { Button } from '../../components/Common/Button.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { useResourceUpdates } from '../../services/realtime.js'
import { checkInShift, checkOutShift, getMyTodayShifts } from '../../services/workShiftApi.js'
import { isEarlyCheckOut, isLateCheckIn, isMissingReasonError } from '../../utils/shiftDeviation.js'

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
  // Check-in muộn phải nhập lý do (tính khi mở hộp thoại, hoặc do máy chủ báo thiếu).
  const [checkInReasonRequired, setCheckInReasonRequired] = useState(false)
  // Ca đang mở hộp thoại check-out (luôn có ô lý do, bắt buộc khi về sớm).
  const [checkOutShiftItem, setCheckOutShiftItem] = useState(null)
  const [checkOutReasonRequired, setCheckOutReasonRequired] = useState(false)
  // Lệch giữa đồng hồ máy chủ và máy nhân viên, để biết muộn/sớm theo giờ máy chủ.
  const clockOffsetRef = useRef(0)

  const receive = useCallback((payload) => {
    const serverMs = Date.parse(payload?.serverTime)
    if (Number.isFinite(serverMs)) clockOffsetRef.current = serverMs - Date.now()
    setData(payload)
  }, [])
  const serverNow = () => Date.now() + clockOffsetRef.current

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      receive(await getMyTodayShifts())
    } catch (cause) {
      setError(getApiErrorMessage(cause, t))
    } finally {
      setLoading(false)
    }
  }, [receive, t])

  useEffect(() => {
    const controller = new AbortController()
    getMyTodayShifts(controller.signal)
      .then(receive)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(cause, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [receive, t])

  // Quản trị viên phân ca/điều chỉnh công thì tải lại ngầm; tạm dừng khi đang check-in/check-out.
  useResourceUpdates(
    async () => receive(await getMyTodayShifts()),
    ['work-shifts', 'attendance-record'],
    !busyId && !photoShift && !checkOutShiftItem,
  )

  // Trả về true khi thành công, 'reason' khi máy chủ báo thiếu lý do, false với lỗi khác.
  const run = async (shift, action, message, reasonType) => {
    setBusyId(shift.id)
    try {
      receive(await action(shift.id))
      toast.success(message)
      return true
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, t))
      if (reasonType && isMissingReasonError(cause, reasonType)) return 'reason'
      // Tải lại để hiển thị trạng thái mới nhất (ví dụ quản trị viên vừa điều chỉnh công).
      load()
      return false
    } finally {
      setBusyId('')
    }
  }

  const openCheckIn = (shift) => {
    setCheckInReasonRequired(isLateCheckIn(shift, serverNow()))
    setPhotoShift(shift)
  }

  // Gửi check-in kèm ảnh; thành công thì đóng hộp thoại, lỗi thì giữ lại để chụp/gửi lại.
  const confirmCheckIn = async (photo, reason) => {
    const shift = photoShift
    if (!shift) return
    const done = await run(shift, (id) => checkInShift(id, photo, reason), t('Đã check-in'), 'check-in')
    if (done === true) setPhotoShift(null)
    if (done === 'reason') setCheckInReasonRequired(true)
  }

  // Luôn mở hộp thoại xác nhận check-out; về sớm thì lý do bắt buộc.
  const startCheckOut = (shift) => {
    setCheckOutReasonRequired(isEarlyCheckOut(shift, serverNow()))
    setCheckOutShiftItem(shift)
  }

  const confirmCheckOut = async (reason) => {
    const shift = checkOutShiftItem
    if (!shift) return
    const done = await run(shift, (id) => checkOutShift(id, reason), t('Đã check-out'), 'check-out')
    if (done === true) setCheckOutShiftItem(null)
    if (done === 'reason') setCheckOutReasonRequired(true)
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
          onCheckIn={openCheckIn}
          onCheckOut={startCheckOut}
        />
      ))}
      {photoShift && (
        <CheckInPhotoDialog
          shift={photoShift}
          busy={busyId === photoShift.id}
          requireReason={checkInReasonRequired}
          onCancel={() => setPhotoShift(null)}
          onConfirm={confirmCheckIn}
        />
      )}
      {checkOutShiftItem && (
        <CheckOutReasonDialog
          shift={checkOutShiftItem}
          busy={busyId === checkOutShiftItem.id}
          requireReason={checkOutReasonRequired}
          onCancel={() => setCheckOutShiftItem(null)}
          onConfirm={confirmCheckOut}
        />
      )}
    </div>
  )
}
