export const organizationRoles = ['owner', 'admin', 'member'] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const bookRoles = [
  'owner',
  'author',
  'editor',
  'reviewer',
  'researcher',
  'viewer',
] as const;
export type BookRole = (typeof bookRoles)[number];
