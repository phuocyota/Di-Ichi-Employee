import axios from 'axios'
import { clearAuthSession, getAccessToken } from './authSession.js'

/** Phát khi backend trả 401 (token hết hạn, đổi mật khẩu, đổi quyền...): MainLayout đăng xuất và về màn đăng nhập. */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 ở màn đăng nhập là sai mật khẩu, không phải phiên hết hiệu lực.
    const isLoginRequest = error.config?.url?.includes('/auth/staff/login')
    if (error.response?.status === 401 && !isLoginRequest && getAccessToken()) {
      clearAuthSession()
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)
