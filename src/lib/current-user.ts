import "server-only";
import { cookies } from "next/headers";
import { USER_COOKIE, findUser } from "./users";

export async function getCurrentUser() {
  return findUser((await cookies()).get(USER_COOKIE)?.value);
}
