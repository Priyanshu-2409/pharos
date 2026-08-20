
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTS_FROM_EMAIL = process.env.ALERTS_FROM_EMAIL ?? "onboarding@resend.dev";
const ALERTS_FROM_NAME = process.env.ALERTS_FROM_NAME ?? "Pharos";

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required for the worker to send alerts");
}

const resend = new Resend(RESEND_API_KEY);

export type IncidentEmailContext = {
  to: string;
  monitorName: string;
  monitorUrl: string;
  errorMessage: string | null;
  startedAt: Date;
};

export type IncidentResolvedEmailContext = {
  to: string;
  monitorName: string;
  monitorUrl: string;
  startedAt: Date;
  resolvedAt: Date;
};

export type SendResult =
  | { success: true }
  | { success: false; errorMessage: string };

function formatDuration(startedAt: Date, resolvedAt: Date): string {
  const seconds = Math.floor((resolvedAt.getTime() - startedAt.getTime()) / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export async function sendIncidentOpenedEmail(ctx: IncidentEmailContext): Promise<SendResult> {
  try {
    const { error } = await resend.emails.send({
      from: `${ALERTS_FROM_NAME} <${ALERTS_FROM_EMAIL}>`,
      to: [ctx.to],
      subject: `[Pharos] ${ctx.monitorName} is down`,
      text:
        `${ctx.monitorName} started failing at ${ctx.startedAt.toISOString()}.\n\n` +
        `URL: ${ctx.monitorUrl}\n` +
        `Last error: ${ctx.errorMessage ?? "Unknown"}\n\n` +
        `— Pharos`,
    });

    if (error) {
      return { success: false, errorMessage: error.message ?? "Unknown Resend error" };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function sendIncidentResolvedEmail(ctx: IncidentResolvedEmailContext): Promise<SendResult> {
  try {
    const duration = formatDuration(ctx.startedAt, ctx.resolvedAt);

    const { error } = await resend.emails.send({
      from: `${ALERTS_FROM_NAME} <${ALERTS_FROM_EMAIL}>`,
      to: [ctx.to],
      subject: `[Pharos] ${ctx.monitorName} is back up`,
      text:
        `${ctx.monitorName} recovered at ${ctx.resolvedAt.toISOString()} ` +
        `after ${duration} of downtime.\n\n` +
        `URL: ${ctx.monitorUrl}\n\n` +
        `— Pharos`,
    });

    if (error) {
      return { success: false, errorMessage: error.message ?? "Unknown Resend error" };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}