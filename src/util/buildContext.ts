/*******************************************************************
* Copyright         : 2024 saaawdust
* File Name         : buildContext.ts
* Description       : Per-build scratch directory for compiler state
*
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 09/19/2026  NeuronPulse     Added
/******************************************************************/

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * The intermediate state directory for a single build.
 *
 * Background: compilation keeps a set of **mutable** intermediate files --
 * `fn.json` (the function registry), `classData.json` (the class registry),
 * `broadcasts.json`, `variables.json` and `lists.json`. The CLI empties them at
 * the start of a build, and generators read from and write to them as
 * compilation proceeds.
 *
 * Before the split, these files lived in `src/assets/`, and `cli` and
 * `generator` each located them through a relative path off their **own**
 * package's `__dirname` (`../assets` / `../../assets`). That caused three
 * problems:
 *
 * 1. Once the repository was split, the two sides' relative paths were bound to
 *    point at different locations and the build failed outright;
 * 2. The files were written into the **package's own installation directory**
 *    -- an immediate EACCES under a global install or a read-only mount, and it
 *    also polluted whatever `npm install` had unpacked;
 * 3. The path was fixed, so **concurrent builds wiped out each other's state**
 *    and produced garbled projects.
 *
 * The fix: at the start of a build the CLI `mkdtempSync`s a dedicated directory
 * and hands it to this module through {@link setBuildScratchDir}; generators
 * always resolve their paths via {@link scratchFile}, and the directory is
 * removed in one go from a `finally` when the build ends. When nothing has been
 * set explicitly (invoking a generator on its own, as a test would), a
 * process-wide directory is created lazily and the behaviour is still correct.
 */

let scratchDir: string | null = null;

/** Sets the scratch directory for this build. Called by the CLI when a build starts. */
export function setBuildScratchDir(dir: string): void {
    scratchDir = dir;
}

/** The scratch directory for the current build; created lazily as a process-wide directory when unset. */
export function getBuildScratchDir(): string {
    if (!scratchDir) {
        scratchDir = mkdtempSync(join(tmpdir(), "jvavscratch-build-"));
    }
    return scratchDir;
}

/** Absolute path of an intermediate state file for this build, e.g. `scratchFile("fn.json")`. */
export function scratchFile(name: string): string {
    return join(getBuildScratchDir(), name);
}

/** Clears the recorded scratch directory reference (for tests, so the lazy-creation branch can be exercised). */
export function resetBuildScratchDir(): void {
    scratchDir = null;
}
