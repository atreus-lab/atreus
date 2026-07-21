/**
 * Client helpers for DKIM email ownership verification against the attester backend.
 */

const backendUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export type EmailVerifyStart = {
  emailHash: string;
  challenge: string;
  expiresAt: string;
  verifyTo: string;
  instructions: string[];
  correlationId: string;
};

export type EmailVerifyConfirm = {
  verified: boolean;
  emailHash: string;
  expiresAt: string;
  correlationId: string;
};

export async function startEmailVerification(email: string): Promise<EmailVerifyStart> {
  const resp = await fetch(`${backendUrl()}/api/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Failed to start email verification");
  }
  return data as EmailVerifyStart;
}

export async function confirmEmailVerification(
  email: string,
  rawMessage: string,
): Promise<EmailVerifyConfirm> {
  const resp = await fetch(`${backendUrl()}/api/email/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, rawMessage }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Email verification failed");
  }
  return data as EmailVerifyConfirm;
}

export async function getEmailVerificationStatus(emailHash: string): Promise<boolean> {
  const resp = await fetch(
    `${backendUrl()}/api/email/status?emailHash=${encodeURIComponent(emailHash)}`,
  );
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Failed to check email verification status");
  }
  return Boolean(data.verified);
}
