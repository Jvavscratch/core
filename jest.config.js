const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset({
  tsconfig: {
    isolatedModules: true,
  },
}).transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // 直接映射到兄弟包的源码，这样跑测试前不必先 build 一遍 types。
  moduleNameMapper: {
    "^@jvavscratch/([^/]+)$": "<rootDir>/../$1/src/index.ts",
  },
  transform: {
    ...tsJestTransformCfg,
  },
};
