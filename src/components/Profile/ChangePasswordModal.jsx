import { useState } from 'react'
import { Eye, EyeOff, KeyRound, LockKeyhole, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../Common/Button.jsx'
import { changeStaffPassword } from '../../services/authApi.js'
import { clearAuthSession } from '../../services/authSession.js'

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' }
// Backend dùng bcrypt nên giới hạn 72 byte UTF-8, không phải 72 ký tự.
const byteLength = (value) => new TextEncoder().encode(value).length

const validate = (form) => {
  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) return 'Vui lòng nhập đầy đủ thông tin.'
  if (form.newPassword.length < 8) return 'Mật khẩu mới cần ít nhất 8 ký tự'
  if (byteLength(form.newPassword) > 72) return 'Mật khẩu mới quá dài (tối đa 72 byte).'
  if (form.newPassword === form.currentPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại'
  if (form.newPassword !== form.confirmPassword) return 'Xác nhận mật khẩu không khớp.'
  return ''
}

const getErrorMessage = (error, t) => {
  if (error.response?.status === 401) return t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  const backendMessage = error.response?.data?.error?.message || error.response?.data?.message
  if (backendMessage) return Array.isArray(backendMessage) ? backendMessage.map((item) => t(item)).join(' ') : t(backendMessage)
  if (!error.response) return t('Không thể kết nối máy chủ. Vui lòng thử lại.')
  return t('Không đổi được mật khẩu. Vui lòng thử lại.')
}

const PasswordField = ({ label, value, onChange, visible, onToggle, autoComplete }) => {
  const { t } = useTranslation()

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{t(label)}</span>
      <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
        <LockKeyhole size={18} className="text-orange-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
          onClick={onToggle}
          aria-label={visible ? t('Ẩn mật khẩu') : t('Hiện mật khẩu')}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

export const ChangePasswordModal = ({ open, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const update = (field) => (value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const close = () => {
    if (submitting) return
    setForm(emptyForm)
    setError('')
    setVisible(false)
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const message = validate(form)
    if (message) {
      setError(t(message))
      return
    }
    setSubmitting(true)
    try {
      await changeStaffPassword(form)
      // tokenVersion đã tăng nên token hiện tại không còn dùng được: đăng xuất và quay về màn đăng nhập.
      clearAuthSession()
      toast.success(t('Đã đổi mật khẩu thành công'), {
        description: t('Vui lòng đăng nhập lại bằng mật khẩu mới.'),
      })
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(getErrorMessage(cause, t))
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/25 p-4">
      <button className="absolute inset-0 cursor-default" type="button" onClick={close} aria-label={t('Đóng')} />
      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-orange-100 bg-white shadow-2xl shadow-slate-950/20" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-orange-600">{t('Bảo mật tài khoản')}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{t('Đổi mật khẩu')}</h2>
          </div>
          <Button className="shrink-0" variant="ghost" type="button" onClick={close} aria-label={t('Đóng')}>
            <X size={18} />
          </Button>
        </div>
        <form className="space-y-4 p-5" onSubmit={handleSubmit} noValidate>
          <PasswordField label="Mật khẩu hiện tại" value={form.currentPassword} onChange={update('currentPassword')} visible={visible} onToggle={() => setVisible((current) => !current)} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới" value={form.newPassword} onChange={update('newPassword')} visible={visible} onToggle={() => setVisible((current) => !current)} autoComplete="new-password" />
          <PasswordField label="Xác nhận mật khẩu mới" value={form.confirmPassword} onChange={update('confirmPassword')} visible={visible} onToggle={() => setVisible((current) => !current)} autoComplete="new-password" />
          <p className="text-xs font-semibold text-slate-500">{t('Mật khẩu mới từ 8 ký tự. Sau khi đổi, mọi thiết bị sẽ bị đăng xuất.')}</p>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={close} disabled={submitting}>{t('Hủy')}</Button>
            <Button type="submit" disabled={submitting}>
              <KeyRound size={18} /> {submitting ? t('Đang lưu...') : t('Đổi mật khẩu')}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  )
}
