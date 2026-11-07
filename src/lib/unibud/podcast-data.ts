export type EduPodcast = {
  id: string;
  title: string;
  lecturer: string;
  lecturerHandle: string;
  course: string;
  subject: string;
  topic: string;
  episode: number;
  duration: string;
  publishedAt: string;
  programme: string;
  classId?: string;
};

export const EDU_PODCASTS: EduPodcast[] = [
  {
    id: "pod-csc301-1",
    title: "Recursion without the panic",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    course: "CSC 301",
    subject: "Data Structures",
    topic: "Recursion and call stacks",
    episode: 4,
    duration: "28 min",
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
    programme: "Computer Science",
    classId: "csc301-class",
  },
  {
    id: "pod-mth101-2",
    title: "Limits, said slowly",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    course: "MTH 101",
    subject: "Calculus I",
    topic: "Limits and continuity",
    episode: 2,
    duration: "22 min",
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString(),
    programme: "Mathematics",
  },
  {
    id: "pod-law204-1",
    title: "Federalism in one sitting",
    lecturer: "Prof. Adewale",
    lecturerHandle: "adewale",
    course: "LAW 204",
    subject: "Constitutional Law",
    topic: "Federalism",
    episode: 1,
    duration: "35 min",
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60_000).toISOString(),
    programme: "Law",
  },
];
