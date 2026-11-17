import type { AidDetail } from "@/contracts/modules/bantuan";
const reportKinds=new Set(["handover","certificate","receipt","education_other","handover_supporting"]);
export function handoverDocuments(documents:AidDetail["documents"]){return documents.filter(doc=>reportKinds.has(doc.kind));}
