import type { Metadata, Viewport } from "next";
import { PwaLifecycle } from "@/modules/bantuan/pwa/PwaLifecycle";
export const metadata:Metadata={title:{default:"Bantuan SIP",template:"%s · Bantuan SIP"},description:"Aplikasi petugas Bantuan Solidaritas Insan Peduli",manifest:"/bantuan-app/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"default",title:"Bantuan SIP"},icons:{icon:"/bantuan-app/icon-192.png",apple:"/bantuan-app/icon-192.png"},robots:{index:false,follow:false}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#ffffff"};
export default function Layout({children}:{children:React.ReactNode}) {return <><PwaLifecycle/>{children}</>;}
