import { randomBytes } from "crypto";

/** Cryptographically strong id: prefix_hex */
export function newId(prefix = "id"): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}
