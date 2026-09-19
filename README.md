# @jvavscratch/core

The compilation environment: everything that turns a Babel AST into Scratch
blocks, plus the dispatch tables that decide *which* generator handles a node.

## What's in it

- `parseProgram()` — walks a program body and links the blocks each statement
  generator returns into one chain, via `next`/`parent` pointers.
- `evaluate()` — the value-side dispatcher, for nodes that produce a reporter
  block or a static value.
- `transformSyntax()` — rewrites constructs Scratch cannot express (`**`,
  ternaries, and so on) before generation.
- `BlockCluster` — the accumulator. A `{[uuid]: Block}` dictionary plus
  `addBlocks()`. Nothing is keyed by name, so execution order lives entirely in
  the pointers.
- `createBlock()`, `createMutation()` — block construction; procedures and
  list/broadcast blocks need the mutation form.
- `isSpiky()`, `isSpikyType()` — which opcodes and library functions return
  booleans. Scratch only allows a boolean, another logical operator, or a binary
  comparison in a boolean slot.
- `JvavscratchError`, `Warn` — the error types the CLI renders.
- The **generator registry** (`registerStatement`, `registerType`,
  `registerLibrary`) and the build scratch directory (`setBuildScratchDir`,
  `scratchFile`).

### Why the registry exists

`core` has to dispatch to generators, but it sits *below* `generator` in the
dependency chain, so it cannot import them. Generation is therefore pushed from
the other side: importing `@jvavscratch/generator` registers all 42
implementations here, and `core` only ever looks generators up by name.

The same path is used for third-party compilers extensions, which is why a
package's `statement_implements` / `type_implements` take precedence over the
built-ins — a package can replace how an entire AST node type is handled.

> Because registration is a side effect of importing the package, import it from
> its **main entry**. Importing a subpath such as `@jvavscratch/generator/optimise`
> will not register anything, and a build will then generate almost nothing.

### Build scratch files

Each build gets its own directory (created with `mkdtempSync` under the system
temp dir) rather than writing into a fixed path inside the package. Generators
reach their intermediate files (`fn.json`, `classData.json`, `variables.json`,
`lists.json`, `broadcasts.json`) through `scratchFile()`. This keeps concurrent
builds from clearing each other's state and avoids writing into the package's own
install directory, which fails under a global install or a read-only mount.

## Install

This package is not published to npm. Depend on it straight from GitHub:

```json
{ "dependencies": { "@jvavscratch/core": "github:Jvavscratch/core" } }
```

If you want to *use* jvavscratch rather than build against its internals, install
the CLI instead:

```bash
npm install -g github:Jvavscratch/cli
```

## Usage

```ts
import { parseProgram, BlockCluster, setBuildScratchDir } from '@jvavscratch/core';
import '@jvavscratch/generator'; // side effect: registers every generator

const cluster = new BlockCluster();
const result = parseProgram(cluster, ast, buildData);
```

`buildData` carries `listIndexBase`, `customBlockReturn`, `isAsync`, `isFunction`,
`functionName` and `packages` through every generator.

## Documentation

<https://jvavscratch.github.io/docs/modules/core>

## License

MPL-2.0
