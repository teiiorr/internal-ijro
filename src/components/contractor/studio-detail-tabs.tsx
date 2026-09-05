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
        <TabsTrigger value="projects" className="gap-1.5 px-3 text-sm sm:px-4">
          <Projects className="size-4" />{t("projects")}<Count n={c.projects} />
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1.5 px-3 text-sm sm:px-4">
          <Chat className="size-4" />{t("chat")}<Count n={c.chat} unread />
        </TabsTrigger>
        <TabsTrigger value="docs" className="gap-1.5 px-3 text-sm sm:px-4">
          <Docs className="size-4" />{t("docs")}<Count n={c.docs} />
        </TabsTrigger>
        <TabsTrigger value="gallery" className="gap-1.5 px-3 text-sm sm:px-4">
          <Gallery className="size-4" />{t("gallery")}<Count n={c.gallery} />
        </TabsTrigger>
        <TabsTrigger value="info" className="gap-1.5 px-3 text-sm sm:px-4">
          <Info className="size-4" />{t("info")}
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
