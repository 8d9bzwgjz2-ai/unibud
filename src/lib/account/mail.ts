/** Transactional mail. No provider is configured unless RESEND_API_KEY is present. */

export async function deliverMail(input: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return "unavailable" as const;
  const from = process.env.UNIBUD_MAIL_FROM?.trim() || "UNIBUD <onboarding@resend.dev>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
    });
    return response.ok ? ("sent" as const) : ("unavailable" as const);
  } catch {
    return "unavailable" as const;
  }
}
