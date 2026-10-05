import type {
  Community,
  DirectoryPerson,
  DiscoveryItem,
  FeedPost,
  Listing,
  ListingCategory,
  University,
} from "./types";

export const UNIVERSITIES: University[] = [
  { id: "unilag", name: "University of Lagos", shortName: "UNILAG", city: "Lagos" },
  { id: "ui", name: "University of Ibadan", shortName: "UI", city: "Ibadan" },
  { id: "unn", name: "University of Nigeria", shortName: "UNN", city: "Nsukka" },
  { id: "abu", name: "Ahmadu Bello University", shortName: "ABU", city: "Zaria" },
  { id: "oau", name: "Obafemi Awolowo University", shortName: "OAU", city: "Ile-Ife" },
  { id: "uniben", name: "University of Benin", shortName: "UNIBEN", city: "Benin City" },
  { id: "lasu", name: "Lagos State University", shortName: "LASU", city: "Lagos" },
  { id: "futa", name: "Federal University of Technology Akure", shortName: "FUTA", city: "Akure" },
  { id: "uniport", name: "University of Port Harcourt", shortName: "UNIPORT", city: "Port Harcourt" },
  { id: "covenant", name: "Covenant University", shortName: "Covenant", city: "Ota" },
  { id: "uon", name: "University of Nairobi", shortName: "UoN", city: "Nairobi" },
  { id: "wits", name: "University of the Witwatersrand", shortName: "Wits", city: "Johannesburg" },
];

/**
 * Reality First: no invented students. This holds only REAL registered accounts,
 * hydrated from the backend directory (student_profiles) by `registerDirectory`
 * whenever the campus catalog loads. It is empty until then.
 */
export const PEOPLE: DirectoryPerson[] = [];

export const CATEGORIES: { id: ListingCategory; label: string; blurb: string }[] = [
  { id: "accommodation", label: "Stay", blurb: "Hostels, rooms, roommates" },
  { id: "food", label: "Food", blurb: "Plates, snacks, meal plans" },
  { id: "fashion", label: "Fashion", blurb: "Thrift, custom, campus fits" },
  { id: "electronics", label: "Tech", blurb: "Phones, laptops, gear" },
  { id: "books", label: "Books", blurb: "Texts, past questions, tools" },
  { id: "beauty", label: "Beauty", blurb: "Hair, barber, care" },
  { id: "transport", label: "Rides", blurb: "Campus moves and lifts" },
  { id: "events", label: "Events", blurb: "Tickets, nights, portraits" },
  { id: "services", label: "Services", blurb: "Skills students already have" },
  { id: "other", label: "Other", blurb: "Everything else on campus" },
];

/** Reality First: listings come only from the backend (real sellers). */
export const LISTINGS: Listing[] = [];

export const COMMUNITIES: Community[] = [
  {
    id: "unilag-campus",
    name: "UNILAG Campus",
    kind: "University",
    universityId: "unilag",
    description: "The open square for Akoka. Halls, food, and what is actually happening.",
    cover: "/covers/campus-night.jpg",
    members: 0,
  },
  {
    id: "unn-eng",
    name: "UNN Engineering",
    kind: "Faculty",
    universityId: "unn",
    description: "Builders, night classes, and the long walk from the hostel.",
    members: 0,
  },
  {
    id: "hostel-life",
    name: "Hostel Life",
    kind: "Residence",
    description: "Light, water, roommates, and the art of surviving a block.",
    members: 0,
  },
  {
    id: "campus-biz",
    name: "Campus Entrepreneurs",
    kind: "Interest",
    description: "Students who sell, build, and keep the receipts.",
    members: 0,
  },
  {
    id: "afrobeats",
    name: "Afrobeats & Campus DJ",
    kind: "Music",
    description: "Playlists, hall week, and who is actually playing this weekend.",
    cover: "/covers/campus-night.jpg",
    members: 0,
  },
  {
    id: "five-aside",
    name: "Five-a-side",
    kind: "Sports",
    description: "Pitch times, boots, and who is bringing the ball.",
    members: 0,
  },
  {
    id: "tech-builders",
    name: "Tech & Builders",
    kind: "Career",
    description: "Shipped projects, internships, and tools that do not waste your data.",
    members: 0,
  },
  {
    id: "quiet-nights",
    name: "Quiet Nights",
    kind: "Interest",
    description: "People who read late and still want company, not noise.",
    members: 0,
  },
  {
    id: "the-gist",
    name: "The Gist",
    kind: "Interest",
    description: "What's actually being said. Music, football, hall week, and campus talk that doesn't need a group chat.",
    members: 0,
  },
  {
    id: "csc301-class",
    name: "CSC 301 Class",
    kind: "Class",
    universityId: "unilag",
    description: "Official cohort space: announcements, resources, class chat. Not a hangout Square.",
    members: 0,
  },
  {
    id: "night-study",
    name: "Night calculus group",
    kind: "Study",
    universityId: "unilag",
    description: "Students studying together. Not the official class. Bring questions, not the assignment dump.",
    members: 0,
  },
];

/** Reality First: Square posts come only from the backend. */
export const POSTS: FeedPost[] = [];

/** Reality First: discovery records come only from the backend. */
export const DISCOVERY: DiscoveryItem[] = [];

export const SAMPLE_COURSES = [
  { code: "MTH 201", title: "Mathematics" },
  { code: "PHY 201", title: "Physics" },
  { code: "CPE 203", title: "Programming" },
  { code: "ENG 205", title: "Engineering Drawing" },
  { code: "GST 201", title: "Communication" },
];

/** Replace the in-memory directory with the real accounts the backend returned. */
export function registerDirectory(people: DirectoryPerson[]) {
  PEOPLE.length = 0;
  PEOPLE.push(...people);
}

export function personByHandle(handle: string): DirectoryPerson | undefined {
  return PEOPLE.find((p) => p.handle === handle);
}

export function listingById(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}

export function uniById(id: string): University | undefined {
  return UNIVERSITIES.find((u) => u.id === id);
}

export function communityById(id: string): Community | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}

