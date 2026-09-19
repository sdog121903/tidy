export const USERS = [
  { id: "admin", name: "Admin", badge: "bg-stone-800 text-white" },
  { id: "laura", name: "Laura", badge: "bg-orange-500 text-white" },
  { id: "anna", name: "Anna", badge: "bg-sky-500 text-white" },
  { id: "noemie", name: "Noemie", badge: "bg-emerald-500 text-white" },
] as const;

export type User = (typeof USERS)[number];
export type UserId = User["id"];

/** The people who do the chores (everyone except the admin). */
export const CLEANERS = USERS.filter((u) => u.id !== "admin");

export const USER_COOKIE = "tidy_user";

export function findUser(id: string | null | undefined): User | undefined {
  return USERS.find((u) => u.id === id);
}

export function findCleaner(id: string | null | undefined): User | undefined {
  return CLEANERS.find((u) => u.id === id);
}

export function userName(id: string): string {
  return findUser(id)?.name ?? id;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();

/** Matches a typed name ("laura", "Noémie", "ANNA ") to a user, ignoring case, accents and emoji. */
export function matchName(input: string): User | undefined {
  const typed = normalize(input);
  if (!typed) return undefined;
  return USERS.find((u) => u.id === typed || normalize(u.name) === typed);
}
