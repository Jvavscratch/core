/*******************************************************************
* Copyright         : 2024 saaawdust
* File Name         : registry.ts
* Description       : 生成器派发注册表
*
* Revision History  :
* Date        Author          Comments
* ------------------------------------------------------------------
* 09/19/2026  NeuronPulse     Added
/******************************************************************/

/**
 * 生成器注册表。
 *
 * 为什么需要这张表:`core` 负责把 AST 派发给具体生成器,但依赖方向是
 * `types ← core ← utils ← generator ← cli`,所以 `core` **不能**静态依赖
 * `generator`。原先的实现是按路径拼字符串去 `require(join(__dirname,
 * "../generator/" + node.type))`,仓库拆开后这个相对路径必然指空。
 *
 * 现在改成反转:内置生成器由 `@jvavscratch/generator` 在导入时自行注册进
 * 这里,`core` 只按名字查表。附带好处是内置生成器与第三方运行时包从此走
 * **同一条**注册通路,并且彻底消除了原先那类「按 `.ts` 拼路径」的静默失败
 * —— 编译产物是 `.js`,`existsSync("Foo.ts")` 恒为 false,于是整类节点被
 * 无声跳过(见 `ExpressionStatement` / `CallExpression` / `types/CallExpression`)。
 *
 * 优先级保持不变:第三方运行时包的 `statement_implements` /
 * `type_implements` **先**查(可覆盖内置),查不到再落到本表。
 */

/** 语句生成器:`(blockCluster, node, buildData) => generatedData` */
export type StatementGenerator = (blockCluster: any, node: any, buildData: any) => any;

/** 值生成器:`(blockCluster, node, parentId, buildData) => typeData` */
export type TypeGenerator = (blockCluster: any, node: any, parentId: string, buildData: any) => any;

/** 库函数表:`{ 函数名: 实现 }`,如 `{ move: (…) => …, turnRight: (…) => … }` */
export type LibraryTable = { [fnName: string]: (...args: any[]) => any };

const statements = new Map<string, StatementGenerator>();
const types = new Map<string, TypeGenerator>();
const blockLibraries = new Map<string, LibraryTable>();
const valueLibraries = new Map<string, LibraryTable>();

/** 注册一个语句生成器,名字用 AST 节点类型(如 `IfStatement`)。 */
export function registerStatement(name: string, fn: StatementGenerator): void {
    statements.set(name, fn);
}

/** 取语句生成器,未注册返回 `undefined`。 */
export function getStatement(name: string): StatementGenerator | undefined {
    return statements.get(name);
}

/** 注册一个值生成器,名字用 AST 节点类型(如 `NumericLiteral`)。 */
export function registerType(name: string, fn: TypeGenerator): void {
    types.set(name, fn);
}

/** 取值生成器,未注册返回 `undefined`。 */
export function getType(name: string): TypeGenerator | undefined {
    return types.get(name);
}

/**
 * 注册一个库函数表。
 *
 * @param kind `"block"` 走 `CallExpressionSub/`(作为语句),`"value"` 走
 *             `types/CallExpressionSub/`(作为取值)
 * @param name 库名,对应 `new` 出来的实例名 / 命名空间名
 */
export function registerLibrary(kind: "block" | "value", name: string, table: LibraryTable): void {
    (kind === "block" ? blockLibraries : valueLibraries).set(name, table);
}

/** 取库函数表,未注册返回 `undefined`。 */
export function getLibrary(kind: "block" | "value", name: string): LibraryTable | undefined {
    return (kind === "block" ? blockLibraries : valueLibraries).get(name);
}

/** 各表已注册数量,供自检 / 测试断言用。 */
export function registeredCounts() {
    return {
        statements: statements.size,
        types: types.size,
        blockLibraries: blockLibraries.size,
        valueLibraries: valueLibraries.size,
    };
}

/** 清空注册表。仅供测试使用。 */
export function clearRegistry(): void {
    statements.clear();
    types.clear();
    blockLibraries.clear();
    valueLibraries.clear();
}
