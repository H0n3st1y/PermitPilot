import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
export const metadata:Metadata={title:"PermitPilot — Know the path. Track the progress.",description:"Interactive demonstration permit roadmaps for residents and small businesses.",manifest:"/manifest.webmanifest"};
export const viewport:Viewport={themeColor:"#173b57",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<ServiceWorkerRegister/></body></html>}
