/**
 * Single source of truth for the Savvy Swim phone number.
 *
 * POOL = 7665 on a phone keypad, so 817-663-POOL and 817-663-7665 are the
 * same line. Marketing surfaces use the vanity spelling; legal, SMS and
 * structured data use plain digits.
 */
export const PHONE_E164 = "+18176637665";
export const PHONE_HREF = `tel:${PHONE_E164}`;
/** Plain digits — legal pages, SMS footers, emails, schema.org. */
export const PHONE_PLAIN = "(817) 663-7665";
/** Vanity spelling — buttons, headers, hero, footers on marketing pages. */
export const PHONE_VANITY = "817-663-POOL";
/** First-mention form so nobody has to guess the digits. */
export const PHONE_VANITY_WITH_DIGITS = "817-663-POOL (7665)";
/** schema.org / structured data format. */
export const PHONE_SCHEMA = "+1-817-663-7665";
