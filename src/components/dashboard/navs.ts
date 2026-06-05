import type { DashNavItem } from "./DashboardLayout";

export const PARTNER_NAV: DashNavItem[] = [
  { to: "/partner", label: "Overview", end: true },
  { to: "/partner/quests", label: "Quests" },
  { to: "/partner/analytics", label: "Analytics" },
  { to: "/partner/rewards", label: "Rewards" },
  { to: "/partner/qr-codes", label: "QR Codes" },
];

export const ADMIN_NAV: DashNavItem[] = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/quests", label: "Quests" },
  { to: "/admin/partners", label: "Partners" },
  { to: "/admin/community-notes", label: "Notes" },
  { to: "/admin/rewards", label: "Rewards" },
  { to: "/admin/analytics", label: "Analytics" },
];
