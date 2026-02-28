import { describe, it, expect } from "vitest";
import {
  createQueue,
  submitAction,
  processNext,
  queueStats,
  compactQueue,
  QueueEntryStatus,
} from "./queue.js";

describe("createQueue", () => {
  it("creates an empty queue with defaults", () => {
    const q = createQueue();
    expect(q.entries).toEqual([]);
    expect(q.nextSequence).toBe(0);
    expect(q.maxDepth).toBe(100);
  });

  it("accepts custom maxDepth", () => {
    const q = createQueue({ maxDepth: 10 });
    expect(q.maxDepth).toBe(10);
  });
});

describe("submitAction", () => {
  it("assigns monotonic sequence numbers", () => {
    let q = createQueue();
    const r1 = submitAction(q, { agentId: "a1", type: "SUBMIT_ADVISORY", payload: {} });
    q = r1.queue;
    const r2 = submitAction(q, { agentId: "a1", type: "SUBMIT_ADVISORY", payload: {} });
    expect(r1.entry.sequence).toBe(0);
    expect(r2.entry.sequence).toBe(1);
  });

  it("creates pending entries", () => {
    const q = createQueue();
    const { entry } = submitAction(q, { agentId: "a1", type: "SUBMIT_ADVISORY", payload: {} });
    expect(entry.status).toBe(QueueEntryStatus.PENDING);
    expect(entry.agentId).toBe("a1");
    expect(entry.submittedAt).toBeTruthy();
  });

  it("rejects stale revisions via optimistic locking", () => {
    const q = createQueue();
    const revisions = { "artifact-1": 5 };
    const { entry } = submitAction(q, {
      agentId: "a1",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      expectedRevision: 3,
      payload: {},
    }, revisions);
    expect(entry.status).toBe(QueueEntryStatus.REJECTED);
  });

  it("accepts matching revisions", () => {
    const q = createQueue();
    const revisions = { "artifact-1": 5 };
    const { entry } = submitAction(q, {
      agentId: "a1",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      expectedRevision: 5,
      payload: {},
    }, revisions);
    expect(entry.status).toBe(QueueEntryStatus.PENDING);
  });

  it("supersedes earlier pending entries from the same agent for the same artifact", () => {
    let q = createQueue();
    const r1 = submitAction(q, {
      agentId: "a1",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      payload: { draft: "v1" },
    });
    q = r1.queue;
    const r2 = submitAction(q, {
      agentId: "a1",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      payload: { draft: "v2" },
    });

    // First entry should be superseded
    const first = r2.queue.entries.find((e) => e.sequence === 0);
    expect(first.status).toBe(QueueEntryStatus.SUPERSEDED);
    // Second entry should be pending
    expect(r2.entry.status).toBe(QueueEntryStatus.PENDING);
  });

  it("does not supersede entries from different agents", () => {
    let q = createQueue();
    const r1 = submitAction(q, {
      agentId: "a1",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      payload: {},
    });
    q = r1.queue;
    const r2 = submitAction(q, {
      agentId: "a2",
      type: "SUBMIT_ADVISORY",
      targetArtifactId: "artifact-1",
      payload: {},
    });

    const first = r2.queue.entries.find((e) => e.sequence === 0);
    expect(first.status).toBe(QueueEntryStatus.PENDING);
  });

  it("signals back-pressure when queue is full", () => {
    let q = createQueue({ maxDepth: 2 });
    submitAction(q, { agentId: "a1", type: "TEST", payload: {} });
    q = submitAction(q, { agentId: "a1", type: "TEST", payload: {} }).queue;
    q = submitAction(q, { agentId: "a2", type: "TEST", payload: {} }).queue;
    const r3 = submitAction(q, { agentId: "a3", type: "TEST", payload: {} });
    expect(r3.backPressure).toBe(true);
  });
});

describe("processNext", () => {
  it("returns null entry when queue is empty", () => {
    const q = createQueue();
    const { entry } = processNext(q);
    expect(entry).toBeNull();
  });

  it("processes the first pending entry", () => {
    let q = createQueue();
    q = submitAction(q, { agentId: "a1", type: "TEST", payload: {} }).queue;
    q = submitAction(q, { agentId: "a2", type: "TEST", payload: {} }).queue;

    const { queue: updated, entry } = processNext(q);
    expect(entry.sequence).toBe(0);
    expect(entry.status).toBe(QueueEntryStatus.ACCEPTED);
    expect(entry.resolvedAt).toBeTruthy();

    // Second call processes the next entry
    const { entry: entry2 } = processNext(updated);
    expect(entry2.sequence).toBe(1);
  });
});

describe("queueStats", () => {
  it("counts entries by status", () => {
    let q = createQueue();
    q = submitAction(q, { agentId: "a1", type: "TEST", payload: {} }).queue;
    q = submitAction(q, { agentId: "a2", type: "TEST", payload: {} }).queue;
    q = processNext(q).queue;

    const stats = queueStats(q);
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.accepted).toBe(1);
  });
});

describe("compactQueue", () => {
  it("retains only the most recent resolved entries", () => {
    let q = createQueue();
    // Submit and process 5 entries
    for (let i = 0; i < 5; i++) {
      q = submitAction(q, { agentId: `a${i}`, type: "TEST", payload: {} }).queue;
    }
    for (let i = 0; i < 5; i++) {
      q = processNext(q).queue;
    }
    // Add 1 pending
    q = submitAction(q, { agentId: "a5", type: "TEST", payload: {} }).queue;

    // Compact to max 3 resolved
    const compacted = compactQueue(q, 3);
    expect(compacted.entries.length).toBe(4); // 3 resolved + 1 pending
    const stats = queueStats(compacted);
    expect(stats.accepted).toBe(3);
    expect(stats.pending).toBe(1);
  });
});
