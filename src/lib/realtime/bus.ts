import "server-only";
import { EventEmitter } from "node:events";

/**
 * Jarayon ichidagi (in-process) pub/sub — real vaqtli bildirishnomalar uchun.
 * SSE ulanishlari foydalanuvchi bo'yicha obuna bo'ladi; notify() yangi
 * bildirishnoma yaratganda tegishli foydalanuvchiga signal yuboradi.
 *
 * Bitta instansli deploy uchun yetarli (joriy prod shunday). Ko'p instansda
 * gorizontal kengaytirish uchun keyinchalik Redis pub/sub bilan almashtiriladi.
 * HMR/qayta importda bitta emitter saqlanishi uchun globalThis'da kesh qilinadi.
 */
const g = globalThis as unknown as { __notifyBus?: EventEmitter };
const bus = g.__notifyBus ?? (g.__notifyBus = new EventEmitter());
// Har bir ochiq SSE ulanishi bitta listener qo'shadi — limitni olib tashlaymiz.
bus.setMaxListeners(0);

const key = (userId: string) => `u:${userId}`;

export function publishNotification(userId: string): void {
  bus.emit(key(userId));
}

export function subscribeNotifications(userId: string, cb: () => void): () => void {
  const evt = key(userId);
  bus.on(evt, cb);
  return () => bus.off(evt, cb);
}
