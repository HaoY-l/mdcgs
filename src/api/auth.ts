import client from './client'

export interface LoginParams {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  real_name: string | null
  email: string | null
  avatar: string | null
  role_id: number | null
  role_name: string | null
  role_code: string | null
  permissions: Record<string, boolean>
  status: number
  must_change_password?: number
}

export async function login(params: LoginParams) {
  const res = await client.post('/auth/login', params)
  if (res.data) {
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
  }
  return res
}

export async function logout() {
  return client.post('/auth/logout')
}

export async function refreshToken(refresh_token: string) {
  return client.post('/auth/refresh', { refresh_token })
}

export async function changePassword(old_password: string, new_password: string) {
  return client.post('/auth/password/change', { old_password, new_password })
}

export async function getMe(): Promise<UserInfo> {
  const res = await client.get('/auth/me')
  return res.data
}

export async function ldapLogin(params: LoginParams) {
  const res = await client.post('/auth/ldap-login', params)
  if (res.data) {
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
  }
  return res
}
