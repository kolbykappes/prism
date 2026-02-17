import { cookies } from "next/headers";

const ADMIN_PASSWORD = "abc123";
const COOKIE_NAME = "admin_session";
const COOKIE_VALUE = "authenticated";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === COOKIE_VALUE;
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { COOKIE_NAME, COOKIE_VALUE };
