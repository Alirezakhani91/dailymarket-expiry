export const ROLES = {
  STORE_OPERATOR: "store_operator",
  REGION_MANAGER: "region_manager",
  EXECUTIVE_MANAGER: "executive_manager",
  SYSTEM_ADMIN: "system_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
