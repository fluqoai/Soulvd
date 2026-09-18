export type ConnectionRequest = {
  id: string;
  phone: string;
  status: string;
  number_kind: string;
  onboarding_url: string | null;
  link_expires_at: string | null;
  note: string | null;
};
export function connectionStage(
  request: ConnectionRequest | null,
  connected: boolean,
  ready: boolean,
  now: number,
) {
  if (connected) return "connected";
  if (!request || request.status === "rejected") return "choose";
  if (request.status === "connected") return "disconnected";
  if (request.status === "review") return "review";
  if (request.status === "awaiting_customer") {
    if (!ready) return "preparing";
    return request.onboarding_url &&
      request.link_expires_at &&
      Date.parse(request.link_expires_at) > now
      ? "authorize"
      : "expired";
  }
  if (request.number_kind !== "business_app") return "assisted";
  return ready ? "waiting" : "preparing";
}
export function setupProgress(
  connected: boolean,
  active: boolean,
  firstReply: boolean,
) {
  // A customer acknowledgement, submitted payment, or demo never completes these.
  const completed = [true, connected, active, firstReply];
  return { completed, count: completed.filter(Boolean).length };
}
export function onboardingPhone(value: string) {
  const digits = value
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[\s()\-]/g, "");
  if (/^05\d{8}$/.test(digits)) return "+966" + digits.slice(1);
  if (/^5\d{8}$/.test(digits)) return "+966" + digits;
  if (/^00\d{7,15}$/.test(digits)) return "+" + digits.slice(2);
  if (/^\+?[1-9]\d{6,14}$/.test(digits))
    return digits.startsWith("+") ? digits : "+" + digits;
  return null;
}
