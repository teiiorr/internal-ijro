"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Joriy URL uçun oynaning scroll holatini eslab qoladi va foydalanuvçi qaytib
 * kelganda uni tiklaydi — masalan, loyihalar röyxatini suradi, bir loyihani
 * oçadi, söng qaytadi (brauzerning "orqaga" tugmasi, Android'ning apparat
 * "orqaga" tugmasi yoki ilova içidagi "orqaga" havolasi orqali).
 *
 * Kalit sifatida jonli URL işlatiladi (path + query, window.location'dan
 * öqiladi), şu bois har bir filtrlangan/tab körinişi öz holatini saqlaydi;
 * sessionStorage bilan çegaralangani uçun tab yopilganda holat tozalanadi.
 * Hech narsa render qilmaydi. Faqat usePathname'dan foydalanadi
 * (useSearchParams'siz), şuning uçun unga Suspense chegarasi kerak emas.
 *
 * Röyxat mount paytida barqaror balandlikka ega bölişiga tayanadi (loyiha
 * gridi belgilangan aspect-ratio kartalardan foydalanadi), şuning uçun
 * saqlangan offset rasmlar yuklanişidan oldin ham töğri böladi.
 */
export function ScrollMemory() {
  const pathname = usePathname(); // route özgarganda effektni qayta işga tuşiramiz

  useEffect(() => {
    const keyOf = () => `scroll:${window.location.pathname}${window.location.search}`;

    // Tiklaş — (serverda render qilingan) kontent joylaşuvi uçun ikki freym kutamiz.
    const saved = sessionStorage.getItem(keyOf());
    if (saved) {
      const y = parseInt(saved, 10);
      if (y > 0) {
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }

    // Scroll paytida saqlaymiz, har freymga bitta yozuvga çeklab.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(keyOf(), String(Math.round(window.scrollY)));
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      // Boshqa sahifaga ötişda oxirgi marta saqlaymiz, şunda loyiha oçilganda aniq nuqta saqlanadi.
      sessionStorage.setItem(keyOf(), String(Math.round(window.scrollY)));
    };
  }, [pathname]);

  return null;
}
