import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PermissionLevels = {
  Admin: 3,
  Supervisor: 2,
  "Project Lead": 2,
  "Technical Lead": 2,
  Annotators: 1,
} as const;

export type UserRole = keyof typeof PermissionLevels;

export function hasPermission(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  console.log(userRole);

  return requiredRoles.includes(userRole);
  // return requiredRoles.some(
  //   (role) => PermissionLevels[userRole] >= PermissionLevels[role]
  // );
}
