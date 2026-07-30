type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: "missing_api_key" | "error"; error?: string };

/**
 * Thin Resend client. No-ops (logs) when RESEND_API_KEY is missing.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() || "noreply@example.com";

  if (!apiKey) {
    console.info("[resend] RESEND_API_KEY missing — skip send", {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false, reason: "missing_api_key" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });

    if (error) {
      console.error("[resend] send failed", error);
      return { sent: false, reason: "error", error: error.message };
    }

    return { sent: true, id: data?.id ?? "unknown" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend] send threw", message);
    return { sent: false, reason: "error", error: message };
  }
}
