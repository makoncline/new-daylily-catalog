import { faker } from "@faker-js/faker";
import { createHash } from "node:crypto";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const URL = /\b(?:https?:\/\/|www\.)[^\s"'<>()\\]+/gi;
const PUBLIC_HOST =
  /^(?:https?:\/\/)?(?:www\.)?daylilycatalog\.com(?:[/?#]|$)/i;
const HIDDEN = "HIDDEN";

/** @param {string} key */
function seedFor(key) {
  faker.seed(createHash("sha256").update(key).digest().readUInt32BE(0));
}

/** @param {number} min @param {number} max */
const int = (min, max) => faker.number.int({ min, max });
const year = () => String(int(2008, 2025));
const town = () =>
  faker.helpers.arrayElement([
    "Franklin, TN",
    "Athens, GA",
    "Lexington, KY",
    "Greenville, SC",
    "Asheville, NC",
    "Tupelo, MS",
    "Conway, AR",
    "Joplin, MO",
    "Ames, IA",
    "Lancaster, PA",
    "Frederick, MD",
    "Salem, OR",
    "Tyler, TX",
    "Ocala, FL",
    "Dothan, AL",
    "Bloomington, IN",
    "Mankato, MN",
    "Eau Claire, WI",
    "Kalamazoo, MI",
    "Findlay, OH",
  ]);

function gardenName() {
  return `${faker.person.lastName()} ${faker.helpers.arrayElement([
    "Gardens",
    "Daylilies",
    "Daylily Farm",
    "Garden Nursery",
    "Perennials",
  ])}`;
}

function bedLocation() {
  return faker.helpers.arrayElement([
    `Bed ${int(1, 12)}, row ${int(1, 8)}`,
    `Pot ${int(1, 240)} by the greenhouse`,
    `${faker.helpers.arrayElement(["North", "South", "East", "West"])} border near the ${faker.helpers.arrayElement(["shed", "fence", "drive", "pond"])}`,
  ]);
}

function privateNote() {
  return faker.helpers
    .arrayElements(
      [
        `Bought from ${gardenName()} in ${year()}.`,
        `${bedLocation()}.`,
        `Divided ${faker.helpers.arrayElement(["spring", "fall"])} ${year()}; ${int(2, 9)} fans.`,
        `Traded with ${faker.person.firstName()} at the ${town().split(",")[0]} club sale.`,
        `Paid $${int(8, 60)}.`,
        `Rebloomed in ${year()}.`,
        `Keep for crosses with seedling ${faker.string.alpha({ length: 2, casing: "upper" })}-${int(10, 99)}.`,
      ],
      { min: 1, max: 2 },
    )
    .join(" ");
}

function listingDescription() {
  const color = faker.helpers.arrayElement([
    "Rose pink",
    "Lemon yellow",
    "Deep red",
    "Lavender",
    "Melon",
    "Near white",
    "Purple",
    "Gold",
  ]);
  const eye = faker.helpers.arrayElement([
    "a green throat",
    "a dark purple eye",
    "a picotee edge",
    "a chalky watermark",
    "a gold edge",
  ]);
  return `${color} bloom with ${eye}. ${int(4, 7)}" flowers on ${int(18, 36)}" scapes. ${faker.helpers.arrayElement(["Early", "Midseason", "Late"])} ${faker.helpers.arrayElement(["rebloomer", "bloomer"])}.`;
}

/** @param {string} title */
function profileDescription(title) {
  return `${title} grows daylilies in ${town()}. ${faker.helpers.arrayElement(["Visitors welcome by appointment.", "Garden open in July.", "Shipping in spring and fall.", "Local pickup only."])}`;
}

/** @param {string} text */
function editorJsContent(text) {
  return JSON.stringify({
    time: 0,
    blocks: [
      { id: faker.string.alphanumeric(10), type: "paragraph", data: { text } },
    ],
    version: "2.31.0",
  });
}

/** @param {string} value */
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Replace contact details in public text with fake values.
 * @param {string | null} text
 */
export function scrubContactDetails(text) {
  if (!text) return text;
  return text
    .replace(URL, (match) =>
      PUBLIC_HOST.test(match)
        ? match
        : `https://example.com/${faker.lorem.slug(2)}`,
    )
    .replace(EMAIL, () =>
      faker.internet.email({ provider: "example.com" }).toLowerCase(),
    )
    .replace(PHONE, () => `555-01${int(10, 99)}`);
}

/**
 * @typedef {{ id: string; userId: string; status: string | null; description: string | null; privateNote: string | null }} ListingRow
 * @typedef {{ id: string; userId: string; title: string | null; description: string | null; content: string | null; location: string | null }} ProfileRow
 * @typedef {{ id: string; userId: string; status: string | null; description: string | null }} ListRow
 */

/**
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {string} sql
 * @returns {unknown[]}
 */
const rows = (db, sql) => db.prepare(sql).all();

/**
 * Replace private values with deterministic fake values. IDs and relations do not change.
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {{ proUserIds: Set<string> }} options
 */
export function scrubRealisticDataSnapshot(db, { proUserIds }) {
  /** @param {string} userId */
  const isPublicSeller = (userId) => proUserIds.has(userId);
  const counts = { privateNotes: 0, profiles: 0, listings: 0, lists: 0 };

  const listings = /** @type {ListingRow[]} */ (
    rows(db, "SELECT id, userId, status, description, privateNote FROM Listing")
  );
  const updateListing = db.prepare(
    "UPDATE Listing SET description = ?, privateNote = ? WHERE id = ?",
  );
  for (const listing of listings) {
    seedFor(`listing:${listing.id}`);
    const isPublic =
      isPublicSeller(listing.userId) && listing.status !== HIDDEN;
    const description = !listing.description
      ? listing.description
      : isPublic
        ? scrubContactDetails(listing.description)
        : listingDescription();
    const note = listing.privateNote ? privateNote() : listing.privateNote;
    if (note) counts.privateNotes++;
    if (description !== listing.description) counts.listings++;
    updateListing.run(description, note, listing.id);
  }

  const profiles = /** @type {ProfileRow[]} */ (
    rows(
      db,
      "SELECT id, userId, title, description, content, location FROM UserProfile",
    )
  );
  const updateProfile = db.prepare(
    "UPDATE UserProfile SET title = ?, slug = ?, description = ?, content = ?, location = ? WHERE id = ?",
  );
  const keepProfile = db.prepare(
    "UPDATE UserProfile SET description = ?, content = ?, location = ? WHERE id = ?",
  );
  for (const profile of profiles) {
    seedFor(`profile:${profile.id}`);
    const location = profile.location ? town() : profile.location;
    if (isPublicSeller(profile.userId)) {
      keepProfile.run(
        scrubContactDetails(profile.description),
        scrubContactDetails(profile.content),
        location,
        profile.id,
      );
      continue;
    }
    const title = gardenName();
    const description = profileDescription(title);
    updateProfile.run(
      profile.title ? title : profile.title,
      `${slugify(title)}-${createHash("sha256").update(String(profile.id)).digest("hex").slice(0, 6)}`,
      profile.description ? description : profile.description,
      profile.content ? editorJsContent(description) : profile.content,
      location,
      profile.id,
    );
    counts.profiles++;
  }

  const lists = /** @type {ListRow[]} */ (
    rows(db, "SELECT id, userId, status, description FROM List")
  );
  const updateList = db.prepare("UPDATE List SET description = ? WHERE id = ?");
  for (const list of lists) {
    if (!list.description) continue;
    seedFor(`list:${list.id}`);
    const isPublic = isPublicSeller(list.userId) && list.status !== HIDDEN;
    updateList.run(
      isPublic
        ? scrubContactDetails(list.description)
        : faker.helpers.arrayElement([
            `Plants for the ${year()} sale.`,
            "Favorites from the garden.",
            `Ready to ship this ${faker.helpers.arrayElement(["spring", "fall"])}.`,
          ]),
      list.id,
    );
    counts.lists++;
  }

  assertNoContactDetails(db);
  return counts;
}

/** @param {import("node:sqlite").DatabaseSync} db */
function assertNoContactDetails(db) {
  const columns = [
    ["Listing", "description"],
    ["Listing", "privateNote"],
    ["UserProfile", "description"],
    ["UserProfile", "content"],
    ["List", "description"],
  ];
  for (const [table, column] of columns) {
    for (const row of db
      .prepare(
        `SELECT ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL`,
      )
      .all()) {
      const value = String(row.value);
      const emails = value.match(EMAIL) ?? [];
      if (emails.some((email) => !email.toLowerCase().endsWith("@example.com")))
        throw new Error(`A real email address remains in ${table}.${column}.`);
    }
  }
}
