/**
 * Reads emails captured by the local Supabase mail catcher (Mailpit, port 54324).
 * Used only by end-to-end tests.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MessageSummary = { ID: string; To: { Address: string }[]; Created: string };

export async function waitForLink(
  to: string,
  { pattern = /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/, timeoutMs = 20_000 } = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (response.ok) {
      const { messages = [] } = (await response.json()) as { messages?: MessageSummary[] };
      const latest = messages
        .filter((message) => message.To.some((recipient) => recipient.Address.toLowerCase() === to.toLowerCase()))
        .sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created))[0];

      if (latest) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
        const body = (await detail.json()) as { HTML?: string; Text?: string };
        const match = `${body.HTML ?? ""}\n${body.Text ?? ""}`.match(pattern);
        if (match) return match[0].replaceAll("&amp;", "&");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No email with a sign-in link reached ${to} within ${timeoutMs} ms`);
}
