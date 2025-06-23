import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Availgram",
  description: "An Instagram username hunter and availability checker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="footer ">
          <p className="footer-text text-center">
            Made with ❤️ by{" "}
            <a
              href="https://github.com/codehamsters"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link hover:underline"
            >
              CodeHamsters
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
