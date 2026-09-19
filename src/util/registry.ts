/*******************************************************************
* Copyright         : 2024 saaawdust
* File Name         : registry.ts
* Description       : Generator dispatch registry
*
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 09/19/2026  NeuronPulse     Added
/******************************************************************/

/**
 * The generator registry.
 *
 * Why this table exists: `core` is responsible for dispatching AST nodes to a
 * concrete generator, but the dependency direction is
 * `types ← core ← utils ← generator ← cli`, so `core` **cannot** statically
 * depend on `generator`. The original implementation built a path by string
 * concatenation and called `require(join(__dirname, "../generator/" +
 * node.type))`; once the repository was split up, that relative path was bound
 * to point nowhere.
 *
 * The relationship is now inverted: the built-in generators register themselves
 * here when `@jvavscratch/generator` is imported, and `core` merely looks them
 * up by name. As a side benefit, built-in generators and third-party runtime
 * packages now travel **the same** registration path, and the old class of
 * silent failure caused by gluing a `.ts` extension onto a path is gone for
 * good -- the compiled artifact is `.js`, so `existsSync("Foo.ts")` was always
 * false and entire node types were skipped without a word (see
 * `ExpressionStatement` / `CallExpression` / `types/CallExpression`).
 *
 * Precedence is unchanged: a third-party runtime package's
 * `statement_implements` / `type_implements` are consulted **first** (they may
 * override the built-ins), and only on a miss does the lookup fall through to
 * this table.
 */

/** Statement generator: `(blockCluster, node, buildData) => generatedData` */
export type StatementGenerator = (blockCluster: any, node: any, buildData: any) => any;

/** Value generator: `(blockCluster, node, parentId, buildData) => typeData` */
export type TypeGenerator = (blockCluster: any, node: any, parentId: string, buildData: any) => any;

/** Library function table: `{ fnName: implementation }`, e.g. `{ move: (…) => …, turnRight: (…) => … }` */
export type LibraryTable = { [fnName: string]: (...args: any[]) => any };

const statements = new Map<string, StatementGenerator>();
const types = new Map<string, TypeGenerator>();
const blockLibraries = new Map<string, LibraryTable>();
const valueLibraries = new Map<string, LibraryTable>();

/** Registers a statement generator. The name is the AST node type (e.g. `IfStatement`). */
export function registerStatement(name: string, fn: StatementGenerator): void {
    statements.set(name, fn);
}

/** Looks up a statement generator; returns `undefined` when none is registered. */
export function getStatement(name: string): StatementGenerator | undefined {
    return statements.get(name);
}

/** Registers a value generator. The name is the AST node type (e.g. `NumericLiteral`). */
export function registerType(name: string, fn: TypeGenerator): void {
    types.set(name, fn);
}

/** Looks up a value generator; returns `undefined` when none is registered. */
export function getType(name: string): TypeGenerator | undefined {
    return types.get(name);
}

/**
 * Registers a library function table.
 *
 * @param kind `"block"` goes through `CallExpressionSub/` (as a statement);
 *             `"value"` goes through `types/CallExpressionSub/` (as a value)
 * @param name The library name, matching the name of the instance produced by
 *             `new` / the namespace name
 */
export function registerLibrary(kind: "block" | "value", name: string, table: LibraryTable): void {
    (kind === "block" ? blockLibraries : valueLibraries).set(name, table);
}

/** Looks up a library function table; returns `undefined` when none is registered. */
export function getLibrary(kind: "block" | "value", name: string): LibraryTable | undefined {
    return (kind === "block" ? blockLibraries : valueLibraries).get(name);
}

/** Number of registrations in each table, for self-checks / test assertions. */
export function registeredCounts() {
    return {
        statements: statements.size,
        types: types.size,
        blockLibraries: blockLibraries.size,
        valueLibraries: valueLibraries.size,
    };
}

/** Clears the registry. For tests only. */
export function clearRegistry(): void {
    statements.clear();
    types.clear();
    blockLibraries.clear();
    valueLibraries.clear();
}
