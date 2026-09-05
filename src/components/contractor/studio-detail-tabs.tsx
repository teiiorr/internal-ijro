"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import {
  IconInfoCircle as Info,
  IconFolder as Projects,
  IconMessageCircle as Chat,
  IconFile as Docs,
  IconPhoto as Gallery,
} from "@tabler/icons-react";

function Count({ n, unread }: { n?: number; unread?: boolean }) {
  if (!n) return null;
  return (
    <span className={`ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${unread ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--surface-3)] text-[var(--muted)]"}`}>
      {n}
    </span>
  );
}

export function StudioDetailTabs({
  infoSlot,
  projectsSlot,
  chatSlot,
  docsSlot,
  gallerySlot,
  counts,
}: {
  infoSlot: React.ReactNode;
  projectsSlot: React.ReactNode;
  chatSlot: React.ReactNode;
  docsSlot: React.ReactNode;
  gallerySlot: React.ReactNode;
  counts?: { projects?: number; chat?: number; docs?: number; gallery?: number };
}) {
  const t = useTranslations("contractors.detail.tabs");
  const c = counts ?? {};

  return (
    <Tabs defaultValue="projects" className="w-full">
      <TabsList className="w-full flex-nowrap overflow-x-auto scrollbar-none no-scrollbar">
        <TabsTrigger value="projects" className="flex-1 gap-1.5 px-3 text-sm sm:px-4" aria-label={t("projects")}>
          <Projects className="size-5 sm:size-4" /><span className="hidden sm:inline">{t("projects")}</span><Count n={c.projects} />
        </TabsTrigger>
        <TabsTrigger value="chat" className="flex-1 gap-1.5 px-3 text-sm sm:px-4" aria-label={t("chat")}>
          <Chat className="size-5 sm:size-4" /><span className="hidden sm:inline">{t("chat")}</span><Count n={c.chat} unread />
        </TabsTrigger>
        <TabsTrigger value="docs" className="flex-1 gap-1.5 px-3 text-sm sm:px-4" aria-label={t("docs")}>
          <Docs className="size-5 sm:size-4" /><span className="hidden sm:inline">{t("docs")}</span><Count n={c.docs} />
        </TabsTrigger>
        <TabsTrigger value="gallery" className="flex-1 gap-1.5 px-3 text-sm sm:px-4" aria-label={t("gallery")}>
          <Gallery className="size-5 sm:size-4" /><span className="hidden sm:inline">{t("gallery")}</span><Count n={c.gallery} />
        </TabsTrigger>
        <TabsTrigger value="info" className="flex-1 gap-1.5 px-3 text-sm sm:px-4" aria-label={t("info")}>
          <Info className="size-5 sm:size-4" /><span className="hidden sm:inline">{t("info")}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="projects">{projectsSlot}</TabsContent>
      <TabsContent value="chat">{chatSlot}</TabsContent>
      <TabsContent value="docs">{docsSlot}</TabsContent>
      <TabsContent value="gallery">{gallerySlot}</TabsContent>
      <TabsContent value="info">{infoSlot}</TabsContent>
    </Tabs>
  );
}
