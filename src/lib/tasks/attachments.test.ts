import { describe, expect, it } from "vitest";
import {
  canAddTaskAttachments,
  canDeleteTaskAttachment,
  canViewTaskAttachments,
  isUuid,
  parseTaskAttachmentUrl,
  taskAttachmentDir,
} from "./attachments";

const CREATOR = "11111111-1111-4111-8111-111111111111";
const ASSIGNEE = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const STUDIO = "44444444-4444-4444-8444-444444444444";
const TASK = "55555555-5555-4555-8555-555555555555";
const task = { createdByUserId: CREATOR, assigneeIds: [ASSIGNEE, STUDIO] };

describe("task attachment rules", () => {
  it("lets the creator, internal assignees and leaders add files", () => {
    expect(canAddTaskAttachments({ id: CREATOR, position: "mutaxassis" }, task)).toBe(true);
    expect(canAddTaskAttachments({ id: ASSIGNEE, position: "mutaxassis" }, task)).toBe(true);
    expect(canAddTaskAttachments({ id: OTHER, position: "direktor" }, task)).toBe(true);
    expect(canAddTaskAttachments({ id: OTHER, position: "orinbosar" }, task)).toBe(true);
    expect(canAddTaskAttachments({ id: OTHER, position: "mutaxassis" }, task)).toBe(false);
    expect(canAddTaskAttachments({ id: STUDIO, position: "kontragent" }, task)).toBe(false);
  });

  it("lets the uploader, the creator and leaders delete, never a studio", () => {
    expect(canDeleteTaskAttachment({ id: ASSIGNEE, position: "mutaxassis" }, task, ASSIGNEE)).toBe(true);
    expect(canDeleteTaskAttachment({ id: ASSIGNEE, position: "mutaxassis" }, task, CREATOR)).toBe(false);
    expect(canDeleteTaskAttachment({ id: CREATOR, position: "mutaxassis" }, task, ASSIGNEE)).toBe(true);
    expect(canDeleteTaskAttachment({ id: OTHER, position: "direktor" }, task, ASSIGNEE)).toBe(true);
    expect(canDeleteTaskAttachment({ id: OTHER, position: "mutaxassis" }, task, null)).toBe(false);
    expect(canDeleteTaskAttachment({ id: STUDIO, position: "kontragent" }, task, STUDIO)).toBe(false);
  });

  it("shows files to staff and only to the studio the task is assigned to", () => {
    expect(canViewTaskAttachments({ id: OTHER, position: "mutaxassis" }, task)).toBe(true);
    expect(canViewTaskAttachments({ id: STUDIO, position: "kontragent" }, task)).toBe(true);
    expect(canViewTaskAttachments({ id: OTHER, position: "kontragent" }, task)).toBe(false);
  });

  it("parses only well-formed stored URLs", () => {
    expect(parseTaskAttachmentUrl(`/api/files/task-attachments/${TASK}/abc.pdf`)).toEqual({ taskId: TASK, fileName: "abc.pdf" });
    expect(parseTaskAttachmentUrl(`/api/files/task-attachments/${TASK}/../x`)).toBeNull();
    expect(parseTaskAttachmentUrl(`/api/files/task-attachments/not-a-task/abc.pdf`)).toBeNull();
    expect(parseTaskAttachmentUrl(`/api/files/internal-docs/abc.pdf`)).toBeNull();
    expect(parseTaskAttachmentUrl(null)).toBeNull();
    expect(taskAttachmentDir(TASK)).toBe(`task-attachments/${TASK}`);
  });

  it("validates uuids", () => {
    expect(isUuid(TASK)).toBe(true);
    expect(isUuid("x")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
