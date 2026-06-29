import client from './client'

export interface UserItem {
  id: number
  username: string
  real_name: string | null
  email: string | null
  role_id: number | null
  role_name: string | null
  status: number
  valid_from: string | null
  valid_until: string | null
  created_at: string | null
}

export async function getUsers(params: Record<string, any>) {
  return client.get('/users', { params })
}

export async function createUser(data: Record<string, any>) {
  return client.post('/users', data)
}

export async function updateUser(id: number, data: Record<string, any>) {
  return client.put(`/users/${id}`, data)
}

export async function deleteUser(id: number) {
  return client.delete(`/users/${id}`)
}

export async function toggleUserStatus(id: number, status: number) {
  return client.put(`/users/${id}/status`, { status })
}

export async function resetUserPassword(id: number, new_password: string) {
  return client.put(`/users/${id}/password`, { new_password })
}

export async function getRoles() {
  return client.get('/roles')
}
