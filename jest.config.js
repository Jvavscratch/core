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
  // Map straight to the sibling package's source so the tests can run without
  // building `types` first.
  moduleNameMapper: {
    "^@jvavscratch/([^/]+)$": "<rootDir>/../$1/src/index.ts",
  },
  transform: {
    ...tsJestTransformCfg,
  },
};
