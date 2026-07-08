import client from './client'

export interface RoleItem {
  id: number
  code: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
  is_system: number
  user_count?: number
  created_at: string | null
  updated_at: string | null
}

export interface PermissionDefine {
  key: string
  name: string
  category: string
  category_name: string
}

export interface PermissionCategory {
  key: string
  name: string
  permissions: PermissionDefine[]
}

export async function getRoles() {
  return client.get('/roles')
}

export async function getPermissions() {
  return client.get('/permissions')
}

export async function getRole(id: number) {
  return client.get(`/roles/${id}`)
}

export async function createRole(data: {
  code: string
  name: string
  description?: string
  permissions: Record<string, boolean>
}) {
  return client.post('/roles', data)
}

export async function updateRole(id: number, data: {
  name?: string
  description?: string
  permissions?: Record<string, boolean>
}) {
  return client.put(`/roles/${id}`, data)
}

export async function deleteRole(id: number) {
  return client.delete(`/roles/${id}`)
}
