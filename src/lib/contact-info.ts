/**
 * Single source of truth for the Savvy Swim phone number.
 *
 * POOL = 7665 on a phone keypad, so 817-663-7665 and 817-663-7665 are the
 * same line. Marketing surfaces use the vanity spelling; legal, SMS and
 * structured data use plain digits.
 */
export const PHONE_E164 = "+18176637665";
export const PHONE_HREF = `tel:${PHONE_E164}`;
/** Plain digits, legal pages, SMS footers, emails, schema.org. */
export const PHONE_PLAIN = "(817) 663-7665";
/** Vanity spelling, buttons, headers, hero, footers on marketing pages. */
export const PHONE_VANITY = "817-663-7665";
/** First-mention form so nobody has to guess the digits. */
export const PHONE_VANITY_WITH_DIGITS = "817-663-7665";
/** schema.org / structured data format. */
export const PHONE_SCHEMA = "+1-817-663-7665";

/** Official Instagram business profile. */
export const INSTAGRAM_HANDLE = "hi.savvyswim";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

/** Google Business review link. Used after a customer reviews us on-site. */
export const GOOGLE_REVIEW_URL = "https://g.page/r/savvyswim/review";

/**
 * Public Google Business Profile link. Resolved from the owner's share link,
 * which redirects to this knowledge-graph id for the Savvy Swim listing.
 * The site hides the "View us on Google" link if this is ever emptied.
 */
export const GOOGLE_PROFILE_URL = "https://www.google.com/search?kgmid=/g/11zh9g57x4";
