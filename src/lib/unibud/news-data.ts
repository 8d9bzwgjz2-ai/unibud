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

/**
 * Reality First: no news provider is connected, so there are no news items.
 * The News page shows an honest "not connected" state instead.
 */
export const EDUCATIONAL_NEWS: NewsItem[] = [];
