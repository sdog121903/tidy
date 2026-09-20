import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./i18n";
import { USER_COOKIE, findUser } from "./users";

export async function getCurrentUser() {
  return findUser((await cookies()).get(USER_COOKIE)?.value);
}

/** The language chosen on this device (Settings), English by default. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}
