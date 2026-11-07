/** Institution → course catalogue. Syllabus belongs to the course, not a campus map. */

export type AcademicCourse = {
  code: string;
  title: string;
  faculty: string;
  department: string;
  programme: string;
  level: string;
  semester: "1" | "2";
  lecturer: string;
  lecturerHandle: string;
  description: string;
  topics: string[];
  objectives: string[];
  materials: string[];
  assessments: { kind: string; title: string; due: string }[];
  exam?: { date: string; note: string };
  communityId?: string;
  boardSessionId?: string;
};

export const FACULTIES = ["Engineering", "Science", "Arts", "Law", "Social Sciences"] as const;
export const LEVELS = ["100", "200", "300", "400", "500"] as const;

export const PROGRAMMES: Record<string, string[]> = {
  Engineering: ["Computer Engineering", "Electrical Engineering", "Civil Engineering"],
  Science: ["Computer Science", "Mathematics", "Physics"],
  Arts: ["English", "History"],
  Law: ["Law"],
  "Social Sciences": ["Economics", "Mass Communication"],
};

export const COURSE_CATALOGUE: AcademicCourse[] = [
  {
    code: "CSC 301",
    title: "Data Structures",
    faculty: "Science",
    department: "Computer Science",
    programme: "Computer Science",
    level: "300",
    semester: "1",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    description: "How data is organised so programmes can search, insert and remember efficiently.",
    topics: ["Arrays and lists", "Stacks and queues", "Trees", "Recursion", "Hashing"],
    objectives: ["Explain recursion with a call stack", "Choose a structure for a real problem", "Analyse simple time cost"],
    materials: ["Week notes", "Past tutorial sheet"],
    assessments: [
      { kind: "Assignment", title: "Recursion worksheet", due: "in 9 days" },
      { kind: "Test", title: "CA 1", due: "in 3 weeks" },
    ],
    exam: { date: "2026-12-08", note: "Morning paper · 2 hours" },
    communityId: "csc301-class",
    boardSessionId: "csc301-live",
  },
  {
    code: "MTH 101",
    title: "Calculus I",
    faculty: "Science",
    department: "Mathematics",
    programme: "Computer Science",
    level: "100",
    semester: "1",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    description: "Limits, continuity and the first derivative — slowly, with pictures in words.",
    topics: ["Limits", "Continuity", "Derivatives", "Applications"],
    objectives: ["Compute a simple limit", "Say what continuity means", "Use a derivative as a rate"],
    materials: ["Lecture 3 recording"],
    assessments: [{ kind: "Quiz", title: "Limits quiz", due: "in 5 days" }],
    exam: { date: "2026-12-04", note: "Faculty hall" },
    boardSessionId: "mth101-rec",
  },
  {
    code: "CPE 203",
    title: "Programming",
    faculty: "Engineering",
    department: "Computer Engineering",
    programme: "Computer Engineering",
    level: "200",
    semester: "1",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    description: "Write small programmes that actually run. Read errors without panic.",
    topics: ["Variables", "Control flow", "Functions", "Debugging"],
    objectives: ["Write a function", "Trace a loop", "Fix a compiler error"],
    materials: ["Lab sheet 1"],
    assessments: [{ kind: "Project", title: "Mini calculator", due: "in 4 weeks" }],
    exam: { date: "2026-12-11", note: "Practical + theory" },
  },
  {
    code: "ENG 205",
    title: "Engineering Drawing",
    faculty: "Engineering",
    department: "Computer Engineering",
    programme: "Computer Engineering",
    level: "200",
    semester: "1",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    description: "Orthographic projection and the language of engineering drawings.",
    topics: ["Line types", "Orthographic views", "Dimensioning"],
    objectives: ["Produce three views of a simple object"],
    materials: ["Studio plate"],
    assessments: [{ kind: "Studio", title: "Plate 2", due: "next studio" }],
    exam: { date: "2026-12-14", note: "Studio exam" },
    boardSessionId: "eng205-ended",
  },
  {
    code: "GST 201",
    title: "Use of English",
    faculty: "Arts",
    department: "English",
    programme: "Computer Science",
    level: "200",
    semester: "1",
    lecturer: "Prof. Adewale",
    lecturerHandle: "adewale",
    description: "Clear academic writing for every faculty.",
    topics: ["Paragraphs", "Citation", "Argument"],
    objectives: ["Write a coherent paragraph", "Cite without copying"],
    materials: ["Revision audio"],
    assessments: [{ kind: "Essay", title: "300-word argument", due: "in 12 days" }],
    exam: { date: "2026-12-02", note: "CBT" },
    boardSessionId: "gst201-proc",
  },
  {
    code: "LAW 204",
    title: "Constitutional Law",
    faculty: "Law",
    department: "Law",
    programme: "Law",
    level: "200",
    semester: "1",
    lecturer: "Prof. Adewale",
    lecturerHandle: "adewale",
    description: "Federalism and the Nigerian constitution, taught as a live conversation.",
    topics: ["Federalism", "Separation of powers", "Rights"],
    objectives: ["Map a federal dispute onto the constitution"],
    materials: ["Tutorial brief"],
    assessments: [{ kind: "Tutorial", title: "Case note", due: "in 8 days" }],
    exam: { date: "2026-12-09", note: "Closed book" },
    boardSessionId: "law204-soon",
  },
];

export function coursesFor(opts: { faculty?: string; programme?: string; level?: string; semester?: string }) {
  return COURSE_CATALOGUE.filter((c) => {
    if (opts.faculty && c.faculty !== opts.faculty) return false;
    if (opts.programme && c.programme !== opts.programme && c.faculty !== opts.faculty) {
      /* programmes share some GST/service courses */
    }
    if (opts.level && c.level !== opts.level) return false;
    if (opts.semester && c.semester !== opts.semester) return false;
    return true;
  });
}

export function courseByCode(code: string) {
  return COURSE_CATALOGUE.find((c) => c.code.toLowerCase() === code.toLowerCase());
}

export function boardIdFor(code: string) {
  return code.toLowerCase().replace(/\s+/g, "");
}

/** Compact syllabus block for Bud. Never invent missing fields. */
export function formatSyllabus(course: AcademicCourse) {
  const bits = [
    `${course.code} ${course.title}.`,
    `Lecturer: ${course.lecturer}.`,
    course.description,
    `Topics: ${course.topics.join("; ")}.`,
    `Objectives: ${course.objectives.join("; ")}.`,
  ];
  if (course.materials.length) bits.push(`Materials: ${course.materials.join("; ")}.`);
  if (course.assessments.length) {
    bits.push(
      `Assessments: ${course.assessments.map((a) => `${a.kind} “${a.title}” (${a.due})`).join("; ")}.`,
    );
  }
  if (course.exam) bits.push(`Exam: ${course.exam.date} — ${course.exam.note}.`);
  return bits.join(" ");
}

/** Pick the syllabus that matches what they just asked. Fall back to enrolled courses. */
export function syllabusForPrompt(prompt: string, enrolledCodes: string[]) {
  const mentioned = COURSE_CATALOGUE.filter((c) => {
    const code = c.code.replace(/\s+/g, "\\s*");
    return new RegExp(`\\b${code}\\b`, "i").test(prompt) || new RegExp(c.title, "i").test(prompt);
  });
  const fromAsk = mentioned.length
    ? mentioned
    : enrolledCodes.map(courseByCode).filter((c): c is AcademicCourse => Boolean(c));
  return fromAsk.slice(0, 3);
}
