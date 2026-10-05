export type NewsItem = {
  id: string;
  category: "exams" | "scholarship" | "admission" | "deadline" | "campus" | "opportunity";
  source: string;
  institution: string;
  title: string;
  body: string;
  date: string;
  importance: "normal" | "high";
  audience: string;
};

export const EDUCATIONAL_NEWS: NewsItem[] = [
  {
    id: "n-exam",
    category: "exams",
    source: "UNILAG Senate",
    institution: "UNILAG",
    title: "Second semester exam timetable is out",
    body: "Faculty boards have published draft timetables. Check clashes before Friday.",
    date: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
    importance: "high",
    audience: "All undergraduates",
  },
  {
    id: "n-nelf",
    category: "scholarship",
    source: "Student Affairs",
    institution: "National",
    title: "NELFUND portal reminder",
    body: "UNIBUD does not approve loans. Official applications stay on nelf.gov.ng.",
    date: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    importance: "high",
    audience: "Eligible students",
  },
  {
    id: "n-intern",
    category: "opportunity",
    source: "Faculty of Engineering",
    institution: "UNN",
    title: "SIWES placement window",
    body: "Submit industrial training forms through the departmental office this month.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    importance: "normal",
    audience: "300 level Engineering",
  },
  {
    id: "n-hall",
    category: "campus",
    source: "Hall Committee",
    institution: "UNILAG",
    title: "Water restoration on New Hall",
    body: "Pumps are back. Report outages to the porter, not the group chat first.",
    date: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    importance: "normal",
    audience: "Residents",
  },
  {
    id: "n-admit",
    category: "admission",
    source: "Admissions",
    institution: "UI",
    title: "Post-UTME screening dates",
    body: "Screening holds next week. Bring original documents. This is not a Square rumour.",
    date: new Date(Date.now() - 12 * 60 * 60_000).toISOString(),
    importance: "high",
    audience: "Prospective students",
  },
];
