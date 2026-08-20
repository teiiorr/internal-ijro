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

export function StudioDetailTabs({
  infoSlot,
  projectsSlot,
  chatSlot,
  docsSlot,
  gallerySlot,
}: {
  infoSlot: React.ReactNode;
  projectsSlot: React.ReactNode;
  chatSlot: React.ReactNode;
  docsSlot: React.ReactNode;
  gallerySlot: React.ReactNode;
}) {
  const t = useTranslations("contractors.detail.tabs");

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="w-full overflow-x-auto flex-nowrap scrollbar-none">
        <TabsTrigger value="info" className="gap-1.5">
          <Info className="size-4" />
          <span className="hidden sm:inline">{t("info")}</span>
        </TabsTrigger>
        <TabsTrigger value="projects" className="gap-1.5">
          <Projects className="size-4" />
          <span className="hidden sm:inline">{t("projects")}</span>
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1.5">
          <Chat className="size-4" />
          <span className="hidden sm:inline">{t("chat")}</span>
        </TabsTrigger>
        <TabsTrigger value="docs" className="gap-1.5">
          <Docs className="size-4" />
          <span className="hidden sm:inline">{t("docs")}</span>
        </TabsTrigger>
        <TabsTrigger value="gallery" className="gap-1.5">
          <Gallery className="size-4" />
          <span className="hidden sm:inline">{t("gallery")}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">{infoSlot}</TabsContent>
      <TabsContent value="projects">{projectsSlot}</TabsContent>
      <TabsContent value="chat">{chatSlot}</TabsContent>
      <TabsContent value="docs">{docsSlot}</TabsContent>
      <TabsContent value="gallery">{gallerySlot}</TabsContent>
    </Tabs>
  );
}
