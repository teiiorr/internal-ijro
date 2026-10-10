import {
  IconLayoutDashboard, IconBriefcase, IconCalendarCheck, IconListCheck, IconChecklist,
  IconLayoutKanban, IconLayoutGrid, IconCash, IconTrophy, IconHeartHandshake,
  IconBuildingBank, IconPresentation, IconCoins, IconGavel, IconUsersGroup, IconSitemap,
  IconUsers, IconBuilding, IconInfoSquareRounded, IconSpeakerphone, IconFileCheck,
  IconShieldCog, IconReportAnalytics, IconHistory, IconShieldCheck, IconBell, IconSettings,
} from "@tabler/icons-react";
import type { Position } from "@/lib/db/schema";
import type { NavConfig, NavRule } from "./types";

const ALL: NavRule = { kind: "all" };
const pos = (...p: Position[]): NavRule => ({ kind: "positions", positions: p });
const STAFF = pos("direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis");
const HR_ROLES = pos("direktor", "orinbosar", "hr");
const ADMIN = pos("direktor", "orinbosar");

export const STAFF_NAV: NavConfig = {
  portal: "staff",
  // Tab bar prioriteti: birinchi 4 ta KO'RINADIGAN + Menyu.
  tabBar: ["dashboard", "myWork", "tasks", "allProjects", "employees"],
  entries: [
    { key: "dashboard", href: "/dashboard", labelKey: "nav.dashboard", shortLabelKey: "nav.short.dashboard", icon: IconLayoutDashboard, rule: ALL },

    { key: "work", labelKey: "nav.group.work", icon: IconBriefcase, children: [
      { key: "myWork", href: "/my-work", labelKey: "nav.myWork", shortLabelKey: "nav.short.myWork", icon: IconCalendarCheck, rule: ALL },
      { key: "tasks", href: "/tasks", labelKey: "nav.tasks", icon: IconListCheck, rule: STAFF },
      { key: "taskControl", href: "/tasks/control", labelKey: "nav.taskControl", icon: IconChecklist, rule: STAFF },
    ] },

    { key: "projects", labelKey: "nav.projects", icon: IconLayoutKanban, children: [
      { key: "allProjects", href: "/projects", labelKey: "nav.allProjects", shortLabelKey: "nav.projects", icon: IconLayoutGrid, rule: ALL,
        views: [{ key: "timeline", href: "/projects/timeline", labelKey: "staffX.portfolioTimeline.title" }] },
      { key: "payments", href: "/projects/payments", labelKey: "nav.payments", icon: IconCash, rule: { kind: "flag", flag: "money" } },
      { key: "tanlov", href: "/tanlov", labelKey: "nav.tanlov", icon: IconTrophy, rule: ALL },
      { key: "studios", href: "/contractors", labelKey: "nav.contractors", icon: IconHeartHandshake, badge: "reviewQueue",
        rule: { kind: "flag", flag: "contractors" },
        views: [{ key: "studioRequests", href: "/contractors/requests", labelKey: "nav.studioRequests" }] },
    ] },

    { key: "councils", labelKey: "nav.group.councils", icon: IconBuildingBank, children: [
      { key: "ekspert", href: "/kengashlar/ekspert", labelKey: "nav.ekspertKengash", icon: IconPresentation, rule: STAFF },
      { key: "smeta", href: "/kengashlar/smeta", labelKey: "nav.smetaKengash", icon: IconCoins, rule: STAFF },
      { key: "councilResolutions", href: "/kengashlar/ijro", labelKey: "nav.councilResolutions", icon: IconGavel, rule: STAFF },
    ] },

    { key: "team", labelKey: "nav.group.team", icon: IconUsersGroup, children: [
      { key: "directory", href: "/tuzilma", labelKey: "nav.directory", icon: IconSitemap, rule: ALL, fallbackMatch: ["/employees"] },
      { key: "employees", href: "/employees", labelKey: "nav.employees", icon: IconUsers, rule: HR_ROLES },
      { key: "departments", href: "/departments", labelKey: "nav.departments", icon: IconBuilding, rule: ADMIN },
    ] },

    { key: "info", labelKey: "nav.group.info", icon: IconInfoSquareRounded, children: [
      { key: "announcements", href: "/elonlar", labelKey: "nav.announcements", icon: IconSpeakerphone, rule: ALL },
      { key: "normativeDocs", href: "/meyoriy-hujjatlar", labelKey: "nav.normativeDocs", icon: IconFileCheck, rule: ALL },
    ] },

    { key: "admin", labelKey: "nav.group.admin", icon: IconShieldCog, children: [
      { key: "reports", href: "/reports/weekly", labelKey: "nav.reports", icon: IconReportAnalytics, rule: { kind: "flag", flag: "reports" },
        views: [{ key: "slippage", href: "/reports/slippage", labelKey: "staffX.deadlineSlippage.title" }] },
      { key: "auditLog", href: "/audit-log", labelKey: "nav.auditLog", icon: IconHistory, rule: pos("direktor", "orinbosar", "hr") },
      { key: "owner", href: "/owner", labelKey: "nav.owner", icon: IconShieldCheck, rule: { kind: "owner" } },
    ] },
  ],
  paletteExtras: [
    { parentKey: null, item: { key: "notifications", href: "/notifications", labelKey: "nav.notifications", icon: IconBell, rule: ALL } },
    { parentKey: null, item: { key: "settings", href: "/settings", labelKey: "nav.settings", icon: IconSettings, rule: ALL } },
  ],
};
