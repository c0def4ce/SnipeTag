import { api } from "./api";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function getPushSupport() {
  if (typeof navigator === "undefined") return { supported: false, permission: "unsupported" as const };
  return {
    supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    permission: Notification.permission,
  };
}

export async function enablePush(): Promise<void> {
  const config = await api<{ vapidPublicKey?: string }>("/api/config", {}, false);
  if (!config.vapidPublicKey) throw new Error("Web Push is not configured on this deployment.");

  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was denied.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey).buffer as ArrayBuffer,
  });
  await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription }) });
}

export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  await api("/api/push/subscribe", { method: "DELETE" });
}
