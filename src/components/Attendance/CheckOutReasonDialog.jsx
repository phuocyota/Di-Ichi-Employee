import { useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ATTENDANCE_REASON_MAX } from '../../utils/shiftDeviation.js'
import { Button } from '../Common/Button.jsx'

/** Hộp thoại nhập lý do khi check-out trước giờ kết thúc ca. */
export const CheckOutReasonDialog = ({ shift, busy, onCancel, onConfirm }) => {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  const submit = (event) => {
    event.preventDefault()
    if (trimmed && !busy) onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label={t('Lý do check-out sớm')}>
      <form onSubmit={submit} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{t('Check-out sớm')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {shift.shiftName || t('Ca làm')} · {shift.start} – {shift.end}
            </p>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600" onClick={onCancel} disabled={busy} aria-label={t('Đóng')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-slate-700">{t('Lý do check-out sớm')} <span className="text-rose-600">*</span></span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-orange-100 px-3 py-2 text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              value={reason}
              maxLength={ATTENDANCE_REASON_MAX}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('Nhập lý do bạn kết thúc ca trước giờ')}
              disabled={busy}
              autoFocus
              required
            />
            <span className="block text-right text-xs text-slate-400">{reason.length}/{ATTENDANCE_REASON_MAX}</span>
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
              {t('Hủy')}
            </Button>
            <Button type="submit" disabled={busy || !trimmed}>
              <LogOut size={18} aria-hidden="true" />
              {busy ? t('Đang check-out...') : t('Xác nhận check-out')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
