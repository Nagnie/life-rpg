import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/** Chữ thường. */
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
/** Số liệu — level, XP, streak. Design dùng riêng một font cho số là có chủ ý. */
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
/** Phím tắt, nhãn kỹ thuật. */
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life RPG",
  description: "Biến mục tiêu thành quest, hoàn thành để mở khoá phần thưởng thật.",
};

/**
 * Đặt data-theme TRƯỚC khi React hydrate, nếu không trang sẽ nháy sang theme
 * sai trong một khung hình đầu tiên.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem("life-rpg-theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrains.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full font-sans text-sm">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
