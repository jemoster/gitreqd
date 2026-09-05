/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^\\./wasm/gitreqd_wasm\\.js$": "<rootDir>/packages/core/wasm/gitreqd_wasm.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@gitreqd/core$": "<rootDir>/packages/core/src/index.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.jest.json" },
    ],
  },
};

