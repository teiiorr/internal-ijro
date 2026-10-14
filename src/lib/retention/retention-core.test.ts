import { describe, expect, it } from "vitest";
import {
  RETENTION_CHUNK,
  RETENTION_DAYS,
  retentionCutoff,
  retentionCutoffs,
} from "./retention-core";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("retentionCutoff", () => {
  it("subtracts exactly N days from now", () => {
    const now = new Date("2026-10-14T12:00:00.000Z");
    expect(retentionCutoff(now, 1).toISOString()).toBe("2026-10-13T12:00:00.000Z");
    expect(retentionCutoff(now, 0).toISOString()).toBe(now.toISOString());
  });

  it("handles month/year boundaries", () => {
    const now = new Date("2027-01-05T00:00:00.000Z");
    expect(retentionCutoff(now, 10).toISOString()).toBe("2026-12-26T00:00:00.000Z");
  });

  it("is pure — does not mutate the input date", () => {
    const now = new Date("2026-10-14T12:00:00.000Z");
    const snapshot = now.getTime();
    retentionCutoff(now, 365);
    expect(now.getTime()).toBe(snapshot);
  });
});

describe("retentionCutoffs", () => {
  const now = new Date("2026-10-14T00:00:00.000Z");
  const cutoffs = retentionCutoffs(now);

  it("uses the documented window for each table", () => {
    expect(now.getTime() - cutoffs.activityLog.getTime()).toBe(RETENTION_DAYS.ACTIVITY_LOG * DAY_MS);
    expect(now.getTime() - cutoffs.notificationsRead.getTime()).toBe(
      RETENTION_DAYS.NOTIFICATIONS_READ * DAY_MS
    );
    expect(now.getTime() - cutoffs.reminderLog.getTime()).toBe(RETENTION_DAYS.REMINDER_LOG * DAY_MS);
  });

  it("keeps the activity_log window the longest and notifications the shortest", () => {
    expect(cutoffs.activityLog.getTime()).toBeLessThan(cutoffs.reminderLog.getTime());
    expect(cutoffs.reminderLog.getTime()).toBeLessThan(cutoffs.notificationsRead.getTime());
  });

  it("matches the chosen windows (365 / 90 / 180)", () => {
    expect(RETENTION_DAYS.ACTIVITY_LOG).toBe(365);
    expect(RETENTION_DAYS.NOTIFICATIONS_READ).toBe(90);
    expect(RETENTION_DAYS.REMINDER_LOG).toBe(180);
  });
});

describe("RETENTION_CHUNK", () => {
  it("is a sane positive batch size", () => {
    expect(RETENTION_CHUNK).toBeGreaterThan(0);
    expect(Number.isInteger(RETENTION_CHUNK)).toBe(true);
  });
});
