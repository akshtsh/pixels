import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Photo Editor',
    description: 'Professional Lightroom-style photo editing application',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                {children}
                {/* @ts-ignore */}
                <script type="module" dangerouslySetInnerHTML={{
                    __html: `
                  import { env, AutoModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
                  window.transformers = { env, AutoModel, AutoProcessor, RawImage };
                  env.allowLocalModels = false;
                  env.useBrowserCache = true;
                `
                }} />
            </body>
        </html>
    );
}
