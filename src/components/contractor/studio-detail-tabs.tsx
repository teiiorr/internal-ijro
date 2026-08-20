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
      <TabsList className="w-full overflow-x-auto flex-nowrap scrollbar-none no-scrollbar">
        <TabsTrigger value="info" className="gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs sm:text-sm">
          <Info className="size-3.5 sm:size-4" />
          {t("info")}
        </TabsTrigger>
        <TabsTrigger value="projects" className="gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs sm:text-sm">
          <Projects className="size-3.5 sm:size-4" />
          {t("projects")}
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs sm:text-sm">
          <Chat className="size-3.5 sm:size-4" />
          {t("chat")}
        </TabsTrigger>
        <TabsTrigger value="docs" className="gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs sm:text-sm">
          <Docs className="size-3.5 sm:size-4" />
          {t("docs")}
        </TabsTrigger>
        <TabsTrigger value="gallery" className="gap-1 sm:gap-1.5 px-2.5 sm:px-4 text-xs sm:text-sm">
          <Gallery className="size-3.5 sm:size-4" />
          {t("gallery")}
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
