export type NavItem = { href: string; label: string; icon: string; kbd: string; key: string };

/** Ký tự hình học thay cho icon set — design cố ý không dùng illustration. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "◈", kbd: "G D", key: "d" },
  { href: "/quests", label: "Quests", icon: "◆", kbd: "G Q", key: "q" },
  { href: "/goals", label: "Goals", icon: "◎", kbd: "G G", key: "g" },
  { href: "/rewards", label: "Rewards", icon: "★", kbd: "G R", key: "r" },
  { href: "/profile", label: "Profile", icon: "◉", kbd: "G P", key: "p" },
];

export const SCREEN_META: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard", sub: "Your day, priced in XP" },
  "/quests": { title: "Quests", sub: "Daily habits and one-off missions" },
  "/goals": { title: "Goals", sub: "The long arcs your quests ladder up to" },
  "/rewards": { title: "Rewards", sub: "Real things, priced in quests" },
  "/profile": { title: "Profile", sub: "Your record so far" },
};
