import { scryptSync, timingSafeEqual } from "crypto";

export function hashPin(pin: string, salt: string) {
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function pinOk(pin: string, stored: string) {
  const [salt, h] = stored.split(":");
  const a = Buffer.from(hashPin(pin, salt).split(":")[1], "hex");
  const b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
