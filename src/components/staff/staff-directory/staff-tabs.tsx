"use client";
import { useState } from "react";
import { IconAddressBook, IconSitemap } from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StaffTab = "tuzilma" | "malumotnoma";

/**
 * /tuzilma sahifasidagi ikki tab. Tanlangan tab ?tab= parametrida saqlanadi
 * (history.replaceState — server qayta render qilinmaydi, havolani ulashish mumkin).
 */
export function StaffTabs({
  initialTab,
  treeLabel,
  directoryLabel,
  tree,
  directory,
}: {
  initialTab: StaffTab;
  treeLabel: string;
  directoryLabel: string;
  tree: React.ReactNode;
  directory: React.ReactNode;
}) {
  const [tab, setTab] = useState<StaffTab>(initialTab);

  function onChange(v: string) {
    const next: StaffTab = v === "malumotnoma" ? "malumotnoma" : "tuzilma";
    setTab(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* URL yangilanmasa ham tab ishlayveradi */
    }
  }

  return (
    <Tabs value={tab} onValueChange={onChange}>
      <TabsList className="w-full sm:w-auto print:hidden">
        <TabsTrigger value="tuzilma" className="flex-1 gap-1.5 sm:flex-none">
          <IconSitemap className="size-4" aria-hidden />
          {treeLabel}
        </TabsTrigger>
        <TabsTrigger value="malumotnoma" className="flex-1 gap-1.5 sm:flex-none">
          <IconAddressBook className="size-4" aria-hidden />
          {directoryLabel}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tuzilma" className="mt-5">
        {tree}
      </TabsContent>
      <TabsContent value="malumotnoma" className="mt-5">
        {directory}
      </TabsContent>
    </Tabs>
  );
}
