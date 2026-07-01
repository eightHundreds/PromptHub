import { describe, expect, it } from "vitest";

import { emptySnapshot, normalizeSnapshot, saveSnapshot } from "../src/sync";

describe("sync snapshot helpers", () => {
  it("creates an empty snapshot with cloudflare backup version", () => {
    const snapshot = emptySnapshot();

    expect(snapshot.version).toBe("web-cloudflare-backup-v1");
    expect(snapshot.prompts).toEqual([]);
    expect(snapshot.promptVersions).toEqual([]);
    expect(snapshot.versions).toEqual([]);
    expect(snapshot.skills).toEqual([]);
  });

  it("normalizes versions and promptVersions symmetrically", () => {
    const version = {
      id: "v1",
      promptId: "p1",
      version: 1,
      systemPrompt: null,
      systemPromptEn: null,
      userPrompt: "hello",
      userPromptEn: null,
      variables: [],
      aiResponse: null,
      note: null,
      createdAt: "2026-05-29T00:00:00.000Z",
    };

    const normalized = normalizeSnapshot({
      exportedAt: "2026-05-29T00:00:00.000Z",
      prompts: [],
      versions: [version],
      folders: [],
      skills: [],
      skillVersions: [],
    });

    expect(normalized.versions).toEqual([version]);
    expect(normalized.promptVersions).toEqual([version]);
  });

  it("preserves Plugin Store source configuration in the D1 payload", async () => {
    const plugins = {
      customStoreSources: [
        {
          id: "plugin-source-1",
          name: "Plugin Store",
          type: "marketplace-json" as const,
          url: "https://example.com/plugins.json",
          enabled: true,
        },
      ],
      selectedSourceId: "plugin-source-1",
    };

    const normalized = normalizeSnapshot({
      storeSources: { plugins },
      projectSkillInventories: [
        {
          projectId: "project-1",
          skills: [
            { name: "Linked Skill", linkedSkillId: "skill-1" },
            { name: "Local Skill" },
          ],
        },
      ],
    });
    let boundValues: unknown[] = [];
    const db = {
      prepare: () => ({
        bind: (...values: unknown[]) => {
          boundValues = values;
          return { run: async () => ({}) };
        },
      }),
    } as unknown as D1Database;

    await saveSnapshot(db, "user-1", normalized);
    const storedSnapshot = JSON.parse(String(boundValues[1]));

    expect(normalized.storeSources?.plugins).toEqual(plugins);
    expect(storedSnapshot.storeSources.plugins).toEqual(plugins);
    expect(storedSnapshot.projectSkillInventories).toEqual([
      {
        projectId: "project-1",
        skills: [
          { name: "Linked Skill", linkedSkillId: "skill-1" },
          { name: "Local Skill" },
        ],
      },
    ]);
  });

  it("omits malformed store source configuration", () => {
    const normalized = normalizeSnapshot({ storeSources: "invalid" });

    expect(normalized.storeSources).toBeUndefined();
  });
});
