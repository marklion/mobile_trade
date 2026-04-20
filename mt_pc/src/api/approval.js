import request from '@/utils/request'

export function getPendingTodoCount() {
  return request({
    url: '/approval/get_pending_todo_count',
    method: 'post'
  })
}
