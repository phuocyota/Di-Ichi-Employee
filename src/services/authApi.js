import { api } from './api.js'

export const loginStaff = async ({ email, password }) => {
  const response = await api.post('/auth/staff/login', { email, password })
  return response.data?.data ?? response.data
}

/** Đổi mật khẩu nhân viên; backend thu hồi mọi phiên đăng nhập nên cần đăng nhập lại sau khi thành công. */
export const changeStaffPassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post('/auth/staff/change-password', { currentPassword, newPassword })
  return response.data?.data ?? response.data
}
