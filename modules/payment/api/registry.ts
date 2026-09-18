import type { PaymentTransaction } from "@/generated/prisma/client";

type ConfirmationHandler = (trx: PaymentTransaction) => Promise<void>;

const handlers: Record<string, ConfirmationHandler> = {};

export function registerConfirmationHandler(
  moduleSource: string,
  handler: ConfirmationHandler
) {
  handlers[moduleSource] = handler;
}

export async function notifySourceModule(trx: PaymentTransaction) {
  const handler = handlers[trx.moduleSource];
  if (!handler) {
    // Modules deriving totals from transactions need no callback.
    return;
  }
  await handler(trx);
}
