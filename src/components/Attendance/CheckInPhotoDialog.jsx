import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageUp, LogIn, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ATTENDANCE_REASON_MAX } from '../../utils/shiftDeviation.js'
import { Button } from '../Common/Button.jsx'

// Ảnh được nén JPEG cạnh dài tối đa 1280 px trước khi gửi (server giới hạn 5 MB).
const MAX_SIDE = 1280
const QUALITY = 0.8

const drawToJpeg = (source, width, height) => {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('CAPTURE_FAILED'))), 'image/jpeg', QUALITY)
  })
}

const fileToJpeg = async (file) => {
  const bitmap = await createImageBitmap(file)
  try {
    return await drawToJpeg(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close?.()
  }
}

const cameraErrorMessage = (error, t) => {
  if (!navigator.mediaDevices?.getUserMedia) return t('Trình duyệt không hỗ trợ camera hoặc trang chưa chạy trên HTTPS.')
  if (error?.name === 'NotAllowedError') return t('Bạn đã chặn quyền camera. Hãy cho phép camera trong trình duyệt hoặc chọn ảnh từ máy.')
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return t('Không tìm thấy camera trên thiết bị.')
  return t('Không mở được camera. Vui lòng thử lại hoặc chọn ảnh từ máy.')
}

/**
 * Chụp ảnh check-in: ưu tiên camera trước (getUserMedia), xem lại rồi xác nhận.
 * Khi không dùng được camera thì cho chọn ảnh từ máy (`capture="user"` mở camera trên điện thoại).
 * `requireReason`: check-in muộn theo giờ máy chủ, bắt buộc nhập lý do trước khi xác nhận.
 */
export const CheckInPhotoDialog = ({ shift, busy, requireReason = false, onCancel, onConfirm }) => {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [ready, setReady] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [reason, setReason] = useState('')
  const missingReason = requireReason && !reason.trim()
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : ''), [photo])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('UNSUPPORTED')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setReady(true)
    } catch (error) {
      stopCamera()
      setCameraError(cameraErrorMessage(error, t))
    }
  }, [stopCamera, t])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  const capture = async () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    try {
      setPhoto(await drawToJpeg(video, video.videoWidth, video.videoHeight))
      stopCamera()
    } catch {
      setCameraError(t('Không chụp được ảnh. Vui lòng thử lại.'))
    }
  }

  const pickFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setPhoto(await fileToJpeg(file))
      stopCamera()
    } catch {
      setCameraError(t('Không đọc được ảnh đã chọn. Vui lòng chọn ảnh JPEG hoặc PNG.'))
    }
  }

  const restartCamera = () => {
    setCameraError('')
    startCamera()
  }

  const retake = () => {
    setPhoto(null)
    restartCamera()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label={t('Chụp ảnh check-in')}>
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{t('Chụp ảnh check-in')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {shift.shiftName || t('Ca làm')} · {shift.start} – {shift.end}
            </p>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600" onClick={onCancel} disabled={busy} aria-label={t('Đóng')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900">
            {/* Luôn giữ <video> trong DOM để "Chụp lại" gắn được stream mới ngay. */}
            <video ref={videoRef} className={`h-full w-full -scale-x-100 object-cover ${photo ? 'hidden' : ''}`} playsInline muted autoPlay />
            {photo && previewUrl && <img className="h-full w-full object-cover" src={previewUrl} alt={t('Ảnh check-in vừa chụp')} />}
            {!photo && !ready && !cameraError && (
              <p className="absolute inset-0 grid place-items-center text-sm text-white/80">{t('Đang mở camera...')}</p>
            )}
          </div>

          {cameraError && (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {cameraError}
            </p>
          )}

          {/* Luôn hiện ô lý do; chỉ bắt buộc khi check-in muộn theo giờ máy chủ. */}
          <label className="block space-y-2 text-sm">
              <span className="font-semibold text-slate-700">
                {t('Lý do check-in muộn')}{' '}
                {requireReason ? <span className="text-rose-600">*</span> : <span className="font-normal text-slate-400">({t('bắt buộc khi đi muộn')})</span>}
              </span>
              <textarea
                className="min-h-20 w-full rounded-xl border border-orange-100 px-3 py-2 text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={reason}
                maxLength={ATTENDANCE_REASON_MAX}
                onChange={(event) => setReason(event.target.value)}
                placeholder={requireReason ? t('Bạn đang check-in sau giờ bắt đầu ca, vui lòng nhập lý do') : t('Nhập lý do nếu bạn đến muộn')}
                disabled={busy}
                required={requireReason}
              />
              <span className="block text-right text-xs text-slate-400">{reason.length}/{ATTENDANCE_REASON_MAX}</span>
          </label>

          <input ref={fileInputRef} className="hidden" type="file" accept="image/*" capture="user" onChange={pickFile} />

          <div className="flex flex-wrap justify-end gap-2">
            {photo ? (
              <>
                <Button variant="secondary" disabled={busy} onClick={retake}>
                  <RotateCcw size={18} aria-hidden="true" />
                  {t('Chụp lại')}
                </Button>
                <Button disabled={busy || missingReason} onClick={() => onConfirm(photo, reason.trim())}>
                  <LogIn size={18} aria-hidden="true" />
                  {busy ? t('Đang check-in...') : t('Xác nhận check-in')}
                </Button>
              </>
            ) : (
              <>
                {cameraError && (
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <ImageUp size={18} aria-hidden="true" />
                    {t('Chọn ảnh')}
                  </Button>
                )}
                {cameraError ? (
                  <Button variant="secondary" onClick={restartCamera}>
                    <RotateCcw size={18} aria-hidden="true" />
                    {t('Thử lại camera')}
                  </Button>
                ) : (
                  <Button disabled={!ready} onClick={capture}>
                    <Camera size={18} aria-hidden="true" />
                    {t('Chụp ảnh')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
