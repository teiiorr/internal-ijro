import {
  IconLayoutDashboard, IconFolders, IconFolder, IconCalendarClock, IconCoins, IconFiles,
  IconClipboardList, IconMessageCircle, IconBell, IconSettings, IconUser,
} from "@tabler/icons-react";
import type { NavConfig, NavRule } from "./types";

const ALL: NavRule = { kind: "all" };

// Studiya portalida bitta auditoriya — rol qoidalari kerak emas.
export const STUDIO_NAV: NavConfig = {
  portal: "studio",
  tabBar: ["dashboard", "projects", "tasks", "chats"],
  entries: [
    { key: "dashboard", href: "/contractor/dashboard", labelKey: "nav.dashboard", shortLabelKey: "nav.short.dashboard", icon: IconLayoutDashboard, rule: ALL },

    { key: "projects", labelKey: "nav.projects", icon: IconFolders, children: [
      { key: "myProjects", href: "/contractor/projects", labelKey: "nav.myProjects", shortLabelKey: "nav.projects", icon: IconFolder, rule: ALL },
      { key: "deadlines", href: "/contractor/deadlines", labelKey: "nav.deadlines", icon: IconCalendarClock, rule: ALL },
      { key: "payments", href: "/contractor/payments", labelKey: "nav.payments", icon: IconCoins, rule: ALL },
      { key: "documents", href: "/contractor/documents", labelKey: "nav.documents", icon: IconFiles, rule: ALL },
    ] },

    { key: "tasks", href: "/contractor/tasks", labelKey: "nav.tasks", icon: IconClipboardList, rule: ALL },
    { key: "chats", href: "/contractor/chats", labelKey: "nav.chats", icon: IconMessageCircle, rule: ALL, badge: "chatUnread" },
  ],
  paletteExtras: [
    { parentKey: null, item: { key: "profile", href: "/contractor/profile", labelKey: "nav.profile", icon: IconUser, rule: ALL } },
    { parentKey: null, item: { key: "notifications", href: "/contractor/notifications", labelKey: "nav.notifications", icon: IconBell, rule: ALL } },
    { parentKey: null, item: { key: "settings", href: "/contractor/settings", labelKey: "nav.settings", icon: IconSettings, rule: ALL } },
  ],
};

// Tab bar uchun chatlardagi to'liq ekran (pastki panel yashiriladi).
export const STUDIO_FULLSCREEN = /^\/contractor\/chats\/[^/]+/;
export const STAFF_FULLSCREEN = /^\/contractors\/[^/]+\/chat\/[^/]+/;
