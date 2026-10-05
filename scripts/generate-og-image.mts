/**
 * Renders the social-preview card and the Apple touch icon with headless Chrome.
 *
 * `tools/og/og-image.html` and `tools/og/apple-touch-icon.html` are the sources
 * of truth for the two images. Run `npm run generate:og` after editing either
 * one, and `npm run generate:og:check` to verify the committed PNGs exist and
 * are correctly sized. The check only reads PNG headers, so it stays runnable
 * in CI without a browser installed.
 *
 * Chrome is probed at the usual macOS/Linux/Windows locations; set CHROME_PATH
 * to point at another binary.
 *
 * Chrome writes the screenshot but does not always exit afterwards, so this
 * waits for a stable PNG on disk and then kills the browser process group.
 */
import { spawn, type ChildProcess } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Generous ceiling: a healthy render lands in about two seconds. */
const renderTimeoutMilliseconds = 30_000;

const renderPollIntervalMilliseconds = 100;

const repositoryRoot = path.join(import.meta.dirname, "..");

const templateDirectory = path.join(repositoryRoot, "tools", "og");

const publicDirectory = path.join(repositoryRoot, "public");

/** PNG signature bytes: 137 80 78 71 13 10 26 10. */
const pngSignature: ReadonlyArray<number> = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const pngHeaderByteLength = 24;

type ImageSize = {
  readonly width: number;
  readonly height: number;
};

type RenderTarget = {
  /** File name shown in output, relative to `public/`. */
  readonly name: string;
  readonly templatePath: string;
  readonly outputPath: string;
  readonly width: number;
  readonly height: number;
};

const renderTargets: ReadonlyArray<RenderTarget> = [
  {
    name: "og-image.png",
    templatePath: path.join(templateDirectory, "og-image.html"),
    outputPath: path.join(publicDirectory, "og-image.png"),
    width: 1200,
    height: 630,
  },
  {
    name: "apple-touch-icon.png",
    templatePath: path.join(templateDirectory, "apple-touch-icon.html"),
    outputPath: path.join(publicDirectory, "apple-touch-icon.png"),
    width: 180,
    height: 180,
  },
];

const chromeCandidates: ReadonlyArray<string> = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function findChrome(): string | null {
  const override = process.env.CHROME_PATH;

  if (override !== undefined && override.length > 0) {
    if (existsSync(override)) return override;

    console.error(`CHROME_PATH points at "${override}", but nothing exists there.`);

    return null;
  }

  for (const candidate of chromeCandidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/** PNG IHDR dimensions are big-endian 32-bit unsigned integers. */
function readBigEndianUint32(header: string, offset: number): number {
  return (
    header.charCodeAt(offset) * 0x1000000 +
    header.charCodeAt(offset + 1) * 0x10000 +
    header.charCodeAt(offset + 2) * 0x100 +
    header.charCodeAt(offset + 3)
  );
}

/**
 * Reads width and height from the PNG IHDR chunk; returns null when the file is
 * not a PNG.
 *
 * The header is read as a latin1 string rather than a Buffer because
 * `@cloudflare/workers-types` sits in this project's `types` array and shadows the
 * global Buffer with a reduced interface that omits the byte readers. Latin1 maps
 * each byte to exactly one character, so `charCodeAt` yields the byte value.
 */
function readPngSize(filePath: string): ImageSize | null {
  const header = readFileSync(filePath, "latin1").slice(0, pngHeaderByteLength);

  if (header.length < pngHeaderByteLength) return null;

  const hasPngSignature = pngSignature.every((byte, index) => header.charCodeAt(index) === byte);

  if (!hasPngSignature) return null;

  return { width: readBigEndianUint32(header, 16), height: readBigEndianUint32(header, 20) };
}

function relativePath(filePath: string): string {
  return path.relative(repositoryRoot, filePath);
}

/** Verifies one committed PNG exists and matches the size its template renders at. */
function checkTarget(target: RenderTarget): number {
  if (!existsSync(target.outputPath)) {
    console.error(`Missing ${relativePath(target.outputPath)}. Run: npm run generate:og`);

    return 1;
  }

  const size = readPngSize(target.outputPath);

  if (size === null) {
    console.error(`${relativePath(target.outputPath)} is not a valid PNG.`);

    return 1;
  }

  if (size.width !== target.width || size.height !== target.height) {
    console.error(
      `${target.name}: expected ${target.width}x${target.height} but found ${size.width}x${size.height}.`,
    );

    return 1;
  }

  console.log(`${target.name} is ${size.width}x${size.height}.`);

  return 0;
}

function checkAllTargets(): number {
  for (const target of renderTargets) {
    const exitCode = checkTarget(target);

    if (exitCode !== 0) return exitCode;
  }

  return 0;
}

/**
 * Waits for the screenshot to appear, then for its size to stop changing.
 * Chrome writes the PNG in a single pass, so a repeated size means it is complete.
 */
async function waitForStableScreenshot(
  filePath: string,
  chromeProcess: ChildProcess,
  deadlineMilliseconds: number,
  previousSize: number,
): Promise<boolean> {
  if (Date.now() >= deadlineMilliseconds) return false;

  // Chrome only exits on its own when it fails early; the deadline covers the rest.
  if (chromeProcess.exitCode !== null || chromeProcess.signalCode !== null) return false;

  let nextPreviousSize = previousSize;

  if (existsSync(filePath)) {
    const size = statSync(filePath).size;

    if (size > 0 && size === previousSize) return true;

    nextPreviousSize = size;
  }

  await delay(renderPollIntervalMilliseconds);

  return waitForStableScreenshot(filePath, chromeProcess, deadlineMilliseconds, nextPreviousSize);
}

/** Chrome spawns helper processes, so take down the whole group we created. */
function terminateProcessTree(chromeProcess: ChildProcess): void {
  if (chromeProcess.pid === undefined) return;

  try {
    process.kill(-chromeProcess.pid, "SIGKILL");
  } catch {
    /* the group is already gone */
  }

  try {
    chromeProcess.kill("SIGKILL");
  } catch {
    /* the process is already gone */
  }
}

function printChromeLogTail(logPath: string): void {
  const lines = readFileSync(logPath, "utf8").split("\n");
  const tail = lines.slice(-14);

  console.error("Chrome output:");

  for (const line of tail) {
    if (line.trim() === "") continue;

    console.error(`  ${line}`);
  }
}

async function renderTarget(target: RenderTarget, chrome: string): Promise<number> {
  if (!existsSync(target.templatePath)) {
    console.error(`Missing template ${relativePath(target.templatePath)}.`);

    return 1;
  }

  // A throwaway profile keeps the render out of the user's real browser session.
  const workDirectory = mkdtempSync(path.join(tmpdir(), "rarify-image-"));
  const userDataDirectory = path.join(workDirectory, "profile");
  const logPath = path.join(workDirectory, "chrome.log");

  mkdirSync(userDataDirectory);

  const logFileDescriptor = openSync(logPath, "w");

  rmSync(target.outputPath, { force: true });

  const chromeProcess = spawn(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-device-scale-factor=1",
      `--user-data-dir=${userDataDirectory}`,
      `--window-size=${target.width},${target.height}`,
      // Waits for the Google Fonts stylesheet so the card never renders in a fallback face.
      "--virtual-time-budget=8000",
      `--screenshot=${target.outputPath}`,
      pathToFileURL(target.templatePath).href,
    ],
    // detached makes the child a process-group leader, so helpers die with it.
    { detached: true, stdio: ["ignore", "ignore", logFileDescriptor] },
  );

  let rendered = false;

  try {
    rendered = await waitForStableScreenshot(
      target.outputPath,
      chromeProcess,
      Date.now() + renderTimeoutMilliseconds,
      -1,
    );

    if (!rendered) {
      console.error(`Chrome did not produce ${target.name} in time.`);
      printChromeLogTail(logPath);
    }
  } finally {
    terminateProcessTree(chromeProcess);
    closeSync(logFileDescriptor);
    rmSync(workDirectory, { recursive: true, force: true });
  }

  if (!rendered) return 1;

  return checkTarget(target);
}

/** Renders each target in turn, stopping at the first failure. */
async function renderTargetsFrom(index: number, chrome: string): Promise<number> {
  if (index >= renderTargets.length) return 0;

  const exitCode = await renderTarget(renderTargets[index], chrome);

  if (exitCode !== 0) return exitCode;

  return renderTargetsFrom(index + 1, chrome);
}

async function renderAllTargets(): Promise<number> {
  const chrome = findChrome();

  if (chrome === null) {
    console.error("No Chrome or Chromium found. Set CHROME_PATH to a browser binary and retry.");

    return 1;
  }

  return renderTargetsFrom(0, chrome);
}

process.exitCode = process.argv.includes("--check") ? checkAllTargets() : await renderAllTargets();
