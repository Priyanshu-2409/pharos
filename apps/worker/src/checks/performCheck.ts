import axios, { AxiosError } from "axios";
import type { CheckResult } from "@pharos/db";

// Response time threshold above which a successful check is marked DEGRADED
const DEGRADED_THRESHOLD_MS = 3000;

export type CheckOutcome = {
  result: CheckResult;
  statusCode: number | null;
  responseTimeMs: number;
  errorMessage: string | null;
};

export type CheckInput = {
  url: string;
  method: string;
  timeoutMs: number;
  expectedStatus: number;
};

export async function performCheck(input: CheckInput): Promise<CheckOutcome> {
  const start = Date.now();

  try {
    const response = await axios.request({
      url: input.url,
      method: input.method,
      timeout: input.timeoutMs,
      // Don't throw on 4xx/5xx — we want to observe them as check results
      validateStatus: () => true,
    });

    const responseTimeMs = Date.now() - start;

    // Wrong status = DOWN, right status but slow = DEGRADED, right status & fast = UP
    if (response.status !== input.expectedStatus) {
      return {
        result: "DOWN",
        statusCode: response.status,
        responseTimeMs,
        errorMessage: `Expected status ${input.expectedStatus}, got ${response.status}`,
      };
    }

    if (responseTimeMs > DEGRADED_THRESHOLD_MS) {
      return {
        result: "DEGRADED",
        statusCode: response.status,
        responseTimeMs,
        errorMessage: `Slow response: ${responseTimeMs}ms`,
      };
    }

    return {
      result: "UP",
      statusCode: response.status,
      responseTimeMs,
      errorMessage: null,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - start;

    const axiosErr = err as AxiosError;
    const message = axiosErr.code === "ECONNABORTED"
      ? `Timeout after ${input.timeoutMs}ms`
      : axiosErr.code ?? axiosErr.message ?? "Unknown error";

    return {
      result: "DOWN",
      statusCode: null,
      responseTimeMs,
      errorMessage: message,
    };
  }
}