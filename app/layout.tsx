import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Good Exception — A better way becomes the standard',description:'Capture expert know-how, find practices worth investigating, and validate better ways of working.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
