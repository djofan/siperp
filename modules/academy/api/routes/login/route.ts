import { participantLogin } from "@/modules/core/participant-login";
export async function POST(request: Request) { return participantLogin(request, "academy"); }
