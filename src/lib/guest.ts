export const guestCookieName = "guest_id";
export const guestCookieMaxAge = 60 * 60 * 24 * 365;

const guestIdPattern =
  /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createGuestId() {
  return `guest-${crypto.randomUUID()}`;
}

export function isGuestId(value: string | undefined): value is string {
  return typeof value === "string" && guestIdPattern.test(value);
}
