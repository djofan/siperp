import { pwaRequest } from "./client";

export type PushConfiguration = { enabled: boolean; publicKey: string | null };

export function supportsWebPush(): boolean {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.getRegistration("/bantuan-app/");
  if (!registration?.active) throw new Error("PWA belum siap. Muat ulang aplikasi atau pasang pembaruan terlebih dahulu.");
  return registration;
}

export async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON();
  await pwaRequest("web-push/subscriptions", { method: "POST", body: JSON.stringify({ endpoint, keys }) });
}

export async function enableWebPush(publicKey: string, permission: NotificationPermission): Promise<void> {
  if (permission !== "granted") throw new Error("Izin notifikasi belum diberikan. Aktifkan melalui pengaturan browser/HP lalu coba lagi.");
  const registration = await pushRegistration();
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  const previousKey = subscription?.options.applicationServerKey;
  if (subscription && previousKey && (new Uint8Array(previousKey).length !== bytes.length || new Uint8Array(previousKey).some((value, index) => value !== bytes[index]))) {
    await disableWebPush();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await saveSubscription(subscription);
}

export async function disableWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/bantuan-app/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    // Revoke server registration first; keep a retryable subscription when offline.
    await pwaRequest("web-push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) });
    if (!await subscription.unsubscribe()) throw new Error("Langganan browser belum dapat dinonaktifkan. Coba lagi.");
  }
  for (const notification of await registration?.getNotifications() ?? []) notification.close();
}
