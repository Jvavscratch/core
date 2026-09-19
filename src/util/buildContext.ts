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
 * 单次构建的中间状态目录。
 *
 * 背景:编译过程有一批**可变**的中间文件 —— `fn.json`(函数登记表)、
 * `classData.json`(类登记表)、`broadcasts.json`、`variables.json`、
 * `lists.json`。CLI 在构建开始时把它们清空,生成器在编译过程中边读边写。
 *
 * 拆分前这批文件躺在 `src/assets/`,而 `cli` 和 `generator` 分别用
 * **各自包内**的 `__dirname` 相对路径去找它们(`../assets` / `../../assets`)。
 * 这带来三个问题:
 *
 * 1. 仓库拆开后两边的相对路径必然指向不同位置,构建直接失败;
 * 2. 写的是**包自身的安装目录** —— 全局安装或只读挂载时直接 EACCES,
 *    而且会污染被 `npm install` 下来的包;
 * 3. 路径固定,所以**并发构建会互相清空对方的状态**,产出错乱的工程。
 *
 * 改为:CLI 在构建开始时 `mkdtempSync` 出一个独立目录并通过
 * {@link setBuildScratchDir} 告知本模块,生成器一律经 {@link scratchFile}
 * 取路径,构建结束在 `finally` 里整体删除。未显式设置时(单独调用生成器,
 * 例如跑测试)惰性创建一个进程级目录,行为仍然正确。
 */

let scratchDir: string | null = null;

/** 指定本次构建的临时目录。由 CLI 在构建开始时调用。 */
export function setBuildScratchDir(dir: string): void {
    scratchDir = dir;
}

/** 当前构建的临时目录;未设置则惰性创建一个进程级目录。 */
export function getBuildScratchDir(): string {
    if (!scratchDir) {
        scratchDir = mkdtempSync(join(tmpdir(), "jvavscratch-build-"));
    }
    return scratchDir;
}

/** 本次构建中间状态文件的绝对路径,如 `scratchFile("fn.json")`。 */
export function scratchFile(name: string): string {
    return join(getBuildScratchDir(), name);
}

/** 清空已记录的临时目录引用(测试用,便于验证惰性创建分支)。 */
export function resetBuildScratchDir(): void {
    scratchDir = null;
}
