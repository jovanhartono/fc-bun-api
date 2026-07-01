import { describe, expect, it } from "bun:test";
import {
  generateCrockfordCode,
  mintCampaignCodes,
} from "@/modules/campaigns/campaign.repository";
import type { OrderTx } from "@/modules/orders/order.repository";

const CROCKFORD = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

describe("generateCrockfordCode", () => {
  it("returns an 8-character code", () => {
    expect(generateCrockfordCode()).toHaveLength(8);
  });

  it("only emits Crockford base32 characters (excludes 0/O/1/I/L)", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateCrockfordCode()).toMatch(CROCKFORD);
    }
  });

  it("has enough entropy to avoid collisions across a large sample", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      codes.add(generateCrockfordCode());
    }
    // 30^8 (~6.5e11) code space: 2000 draws colliding is astronomically
    // unlikely. A constant/low-entropy generator would collapse this far below.
    expect(codes.size).toBeGreaterThan(1990);
  });
});

type InsertBehavior = "ok" | "dup" | "boom";

// A fake OrderTx whose insert().values() resolves or rejects per the scripted
// behaviors, recording how many rows each attempt tried to insert.
function makeTx(behaviors: InsertBehavior[]) {
  const attempts: number[] = [];
  let call = 0;
  const tx = {
    insert: () => ({
      values: (rows: unknown[]) => {
        attempts.push(Array.isArray(rows) ? rows.length : 0);
        const behavior = behaviors[call] ?? "ok";
        call += 1;
        if (behavior === "dup") {
          return Promise.reject({ code: "23505" });
        }
        if (behavior === "boom") {
          return Promise.reject({ code: "42P01" });
        }
        return Promise.resolve();
      },
    }),
  };
  return { tx: tx as unknown as OrderTx, attempts };
}

const captureRejection = async (
  promise: Promise<unknown>
): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected promise to reject, but it resolved");
};

describe("mintCampaignCodes", () => {
  it("inserts the whole batch in one attempt on success", async () => {
    const { tx, attempts } = makeTx(["ok"]);
    await mintCampaignCodes(tx, 1, 5);
    expect(attempts).toEqual([5]);
  });

  it("retries a fresh batch on a 23505 unique-violation, then succeeds", async () => {
    const { tx, attempts } = makeTx(["dup", "dup", "ok"]);
    await mintCampaignCodes(tx, 1, 3);
    expect(attempts).toHaveLength(3);
  });

  it("gives up after exceeding the collision-retry ceiling", async () => {
    const { tx, attempts } = makeTx(
      Array.from({ length: 20 }, () => "dup" as const)
    );
    const error = await captureRejection(mintCampaignCodes(tx, 1, 2));
    expect((error as Error).message).toBe(
      "Too many code collisions during minting"
    );
    // 11 insert attempts (attempts 0..10) before the ceiling guard trips.
    expect(attempts).toHaveLength(11);
  });

  it("rethrows a non-collision database error without retrying", async () => {
    const { tx, attempts } = makeTx(["boom"]);
    const error = await captureRejection(mintCampaignCodes(tx, 1, 4));
    expect((error as { code?: string }).code).toBe("42P01");
    expect(attempts).toHaveLength(1);
  });
});
