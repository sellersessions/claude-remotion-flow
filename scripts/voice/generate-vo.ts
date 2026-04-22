/**
 * generate-vo.ts — ElevenLabs voiceover generator for the Remotion pipeline.
 *
 * Usage:
 *   node --strip-types scripts/voice/generate-vo.ts <config.json> [--dry-run]
 *
 * Reads a scene config JSON, calls ElevenLabs v1 TTS for each scene, and
 * writes MP3 files to <output_dir>/<scene.id>.mp3 relative to cwd.
 *
 * --dry-run  prints planned requests without spending any credits.
 */

import { createRequire } from "module";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface Scene {
  id: string;
  text: string;
  /** Shallow-merged on top of default_voice_settings */
  voice_settings?: Partial<VoiceSettings>;
}

interface VoConfig {
  voice_id: string;
  model_id: string;
  output_dir: string;
  default_voice_settings: VoiceSettings;
  scenes: Scene[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load .env from the project root (two dirs up from scripts/voice/) */
function loadEnv(): void {
  const require = createRequire(import.meta.url);
  // dotenv is a transitive dep — resolve from repo node_modules
  const dotenvPath = require.resolve("dotenv");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require(dotenvPath) as { config: (opts: { path: string }) => void };
  const envFile = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../.env",
  );
  dotenv.config({ path: envFile });
}

function assertConfig(cfg: unknown): asserts cfg is VoConfig {
  if (!cfg || typeof cfg !== "object") {
    throw new Error("Config must be a JSON object.");
  }
  const c = cfg as Record<string, unknown>;
  if (!c.voice_id || typeof c.voice_id !== "string") {
    throw new Error('Config missing required string field: "voice_id"');
  }
  if (!Array.isArray(c.scenes) || c.scenes.length === 0) {
    throw new Error('Config missing required non-empty array: "scenes"');
  }
  for (const [i, s] of (c.scenes as unknown[]).entries()) {
    if (!s || typeof s !== "object") throw new Error(`scenes[${i}] must be an object`);
    const scene = s as Record<string, unknown>;
    if (!scene.id || typeof scene.id !== "string")
      throw new Error(`scenes[${i}] missing "id"`);
    if (!scene.text || typeof scene.text !== "string")
      throw new Error(`scenes[${i}] missing "text"`);
  }
}

function mergeVoiceSettings(
  defaults: VoiceSettings,
  overrides?: Partial<VoiceSettings>,
): VoiceSettings {
  return { ...defaults, ...overrides };
}

function fmtSettings(vs: VoiceSettings): string {
  return (
    `stability=${vs.stability.toFixed(2)}, ` +
    `similarity=${vs.similarity_boost.toFixed(2)}, ` +
    `style=${vs.style.toFixed(2)}`
  );
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

async function generateScene(
  scene: Scene,
  cfg: VoConfig,
  apiKey: string,
  outputDir: string,
): Promise<void> {
  const voiceSettings = mergeVoiceSettings(
    cfg.default_voice_settings,
    scene.voice_settings,
  );

  const outPath = path.join(outputDir, `${scene.id}.mp3`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice_id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: scene.text,
        model_id: cfg.model_id,
        voice_settings: voiceSettings,
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "(unreadable)");
    console.error(
      `[${scene.id}] ERROR ${response.status} ${response.statusText}: ${errBody}`,
    );
    return;
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outPath, audioBuffer);

  console.log(
    `[${scene.id}] ${audioBuffer.byteLength.toLocaleString()} bytes → ${outPath} (${fmtSettings(voiceSettings)})`,
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const configArg = args.find((a) => !a.startsWith("--"));

  if (!configArg) {
    console.error(
      "Usage: node --strip-types generate-vo.ts <config.json> [--dry-run]",
    );
    process.exit(1);
  }

  const configPath = path.resolve(process.cwd(), configArg);
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }

  let cfg: unknown;
  try {
    const raw = await import(configPath, { assert: { type: "json" } });
    cfg = raw.default ?? raw;
  } catch {
    // Fallback for Node versions that don't support JSON import assertions
    const { readFile } = await import("fs/promises");
    cfg = JSON.parse(await readFile(configPath, "utf8"));
  }

  try {
    assertConfig(cfg);
  } catch (err) {
    console.error(`Config validation failed: ${(err as Error).message}`);
    process.exit(1);
  }

  const totalChars = cfg.scenes.reduce((sum, s) => sum + s.text.length, 0);
  console.log(
    `TOTAL CHARACTERS: ${totalChars.toLocaleString()} (≈ ${totalChars.toLocaleString()} credits)`,
  );
  console.log(`Scenes: ${cfg.scenes.length} | Voice: ${cfg.voice_id} | Model: ${cfg.model_id}`);
  console.log(`Output dir: ${cfg.output_dir}`);
  console.log("");

  if (dryRun) {
    console.log("--- DRY RUN — no API calls will be made ---");
    for (const scene of cfg.scenes) {
      const vs = mergeVoiceSettings(cfg.default_voice_settings, scene.voice_settings);
      console.log(
        `[${scene.id}] ${scene.text.length} chars | ${fmtSettings(vs)}`,
      );
      console.log(`  text: "${scene.text.slice(0, 80)}${scene.text.length > 80 ? "…" : ""}"`);
    }
    console.log("\nDry run complete. Pass config without --dry-run to generate.");
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error(
      "ELEVENLABS_API_KEY is not set.\n" +
        "Add it to claude-remotion-flow/.env:\n" +
        "  ELEVENLABS_API_KEY=sk_...",
    );
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), cfg.output_dir);
  await mkdir(outputDir, { recursive: true });

  for (const scene of cfg.scenes) {
    await generateScene(scene, cfg, apiKey, outputDir);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
