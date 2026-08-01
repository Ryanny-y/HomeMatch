import "dotenv/config";
import { mailer } from "../src/shared/mail/mailer";
import { generateOpaqueToken } from "../src/shared/security/token";
import { env } from "../src/shared/config/env";

/**
 * Sends one real verification email, through the same adapter the app uses.
 *
 *   npm run mail:test -w backend -- you@example.com
 *
 * The point is to separate two failures that look identical from inside the
 * signup flow: "our code is broken" and "Resend rejected this recipient".
 * Walking the whole register → inbox path to find out which costs minutes; this
 * costs one command.
 *
 * The token it generates is deliberately *not* stored, so the link in the
 * resulting email will fail verification. That is correct — this proves
 * delivery, not verification. Use a real signup to test the full flow.
 */
async function main(): Promise<void> {
  const to = process.argv[2];

  if (!to || !to.includes("@")) {
    console.error("Usage: npm run mail:test -w backend -- <address>");
    process.exitCode = 1;
    return;
  }

  console.log(`Sending via ${env.MAIL_FROM ?? "(no MAIL_FROM — logging only)"} → ${to}`);

  if (!env.RESEND_API_KEY) {
    console.warn("No RESEND_API_KEY set: the link will be logged, not emailed.");
  }

  /**
   * The guide is printed *before* the send, not after.
   *
   * pino writes through an async transport (pino-pretty in development), so its
   * lines land after anything console.log emits afterwards. A trailing "see the
   * log line above" therefore appears above the very lines it refers to.
   */
  console.log(
    "\nWhat to look for in the log lines that follow:\n" +
      "  'Verification email sent'   → accepted by Resend; check the inbox and spam.\n" +
      "  a 403 diagnostic            → recipient is not the Resend account owner,\n" +
      "                                and no domain is verified yet.\n" +
      "  a 422 diagnostic            → reserved domain (example.com and friends).\n" +
      "\nNote: this link will NOT verify an account — the token is never stored.\n" +
      "Accepted is not delivered. To confirm delivery:\n" +
      "  curl -s https://api.resend.com/emails/<emailId> -H \"Authorization: Bearer $RESEND_API_KEY\"\n" +
      "and check `last_event`.\n",
  );

  await mailer.sendVerificationEmail(to, generateOpaqueToken());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
