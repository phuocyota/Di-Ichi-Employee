import { api } from './api.js'

const unwrapData = (response) => response.data?.data ?? response.data

export const studentStatusLabels = {
  active: 'Đang học',
  trial: 'Học thử',
  potential: 'Tiềm năng',
  reserved: 'Bảo lưu',
  stopped: 'Nghỉ học',
}

export const studentStatusTones = {
  active: 'green',
  trial: 'amber',
  potential: 'orange',
  reserved: 'slate',
  stopped: 'rose',
}

/** Danh sách học viên của cơ sở (RLS theo chi nhánh trong token); tìm theo mã, tên, SĐT, email, trường. */
export const getStudents = async ({ page = 1, size = 20, search = '', status = '' } = {}, signal) => {
  const result = unwrapData(
    await api.get('/student', {
      params: { page, size, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) },
      signal,
    }),
  ) || {}

  return {
    data: (Array.isArray(result.data) ? result.data : []).filter((student) => !student.deletedAt),
    meta: {
      page: Number(result.page) || page,
      size: Number(result.size) || size,
      total: Number(result.total) || 0,
    },
  }
}
