export type AppRole = "MANAGER" | "EMPLOYEE";

export function isManager(role?: string | null): boolean {
  return role === "MANAGER";
}

export function isEmployee(role?: string | null): boolean {
  return role === "EMPLOYEE";
}
