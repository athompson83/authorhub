import type { BookRole } from './roles';

export type BookPermission =
  | 'manuscript:read'
  | 'manuscript:write'
  | 'comments:write'
  | 'sources:manage'
  | 'publication:manage'
  | 'members:manage';

const rolePermissions: Record<BookRole, ReadonlySet<BookPermission>> = {
  owner: new Set([
    'manuscript:read',
    'manuscript:write',
    'comments:write',
    'sources:manage',
    'publication:manage',
    'members:manage',
  ]),
  author: new Set([
    'manuscript:read',
    'manuscript:write',
    'comments:write',
    'sources:manage',
  ]),
  editor: new Set(['manuscript:read', 'manuscript:write', 'comments:write']),
  reviewer: new Set(['manuscript:read', 'comments:write']),
  researcher: new Set(['manuscript:read', 'comments:write', 'sources:manage']),
  viewer: new Set(['manuscript:read']),
};

export function can(role: BookRole, permission: BookPermission): boolean {
  return rolePermissions[role].has(permission);
}
