import { useUserStore } from '@/store/user'

/**
 * Check if current user has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const userStore = useUserStore()
  const info = userStore.userInfo
  if (!info) return false
  // ADMIN role has all permissions
  if (info.role_code === 'ADMIN') return true
  return info.permissions?.[permission] === true
}
