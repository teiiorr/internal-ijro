import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Registers Montserrat variable TTFs for @react-pdf/renderer.
 * Idempotent — first call registers, subsequent calls no-op.
 * Use { fontFamily: "Montserrat" } and fontWeight: 400|500|600|700 in styles.
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
  registered = true;
}
