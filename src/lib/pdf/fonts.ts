import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * @react-pdf/renderer uçun Montserrat variable TTF'larini röyxatdan ötkazadi.
 * Idempotent — birinçi çaqiruv röyxatga oladi, keyingilari heç narsa qilmaydi.
 * Uslublarda { fontFamily: "Montserrat" } va fontWeight: 400|500|600|700 dan foydalaning.
 */
export function registerMontserrat() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: path.join(dir, "Montserrat.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Montserrat.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Montserrat.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Montserrat.ttf"), fontWeight: 700 },
      { src: path.join(dir, "Montserrat-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(dir, "Montserrat-Italic.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Times New Roman",
    fonts: [
      { src: path.join(dir, "TimesNewRoman.ttf"), fontWeight: 400 },
      { src: path.join(dir, "TimesNewRoman-Bold.ttf"), fontWeight: 700 },
      { src: path.join(dir, "TimesNewRoman-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(dir, "TimesNewRoman-BoldItalic.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });
  registered = true;
}
