import { getTechnicianUser } from "@/modules/teknisi/api/access";
import { ticketScope } from "@/modules/teknisi/api/policy";
import { prisma } from "@/lib/prisma";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getTechnicianUser();if(!user)return new Response(null,{status:401});
  const {id}=await params;
  const photo=await prisma.teknisiPhoto.findFirst({where:{id,ticket:ticketScope(user)}});
  if(!photo)return new Response(null,{status:404});
  return new Response(new Uint8Array(photo.data),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
