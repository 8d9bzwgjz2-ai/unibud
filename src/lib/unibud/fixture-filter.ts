import { COMMUNITIES, LISTINGS, PEOPLE, POSTS } from "./catalog";

/** Hardcoded campus fixtures. They stay in the module for tests, and must not be shown as live product data. */
export const fixturePostIds = new Set(POSTS.map((post) => post.id));
export const fixtureHandles = new Set(PEOPLE.map((person) => person.handle));
export const fixtureListingIds = new Set(LISTINGS.map((listing) => listing.id));
export const fixtureCommunityIds = new Set(COMMUNITIES.map((community) => community.id));
