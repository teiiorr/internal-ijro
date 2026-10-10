"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconCalendarPlus as CalendarPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CouncilMeetingForm } from "./council-meeting-form";

/**
 * "Majlis qoʻshish" — sahifa sarlavhasidagi asosiy amal. Forma doimo ochiq karta
 * oʻrniga dialogda turadi (sahifa boshida faqat kelayotgan majlis koʻrinadi).
 */
export function CouncilMeetingDialog({ kind }: { kind: "ekspert" | "smeta" }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        {t("kengash.createMeeting")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-5 sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg sm:text-xl">{t("kengash.createMeeting")}</DialogTitle>
          </DialogHeader>
          <CouncilMeetingForm kind={kind} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
