/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {
    "^\\./wasm/shallgraph_wasm\\.js$": "<rootDir>/packages/core/wasm/shallgraph_wasm.js",
    "^\\./wasm-web/shallgraph_wasm\\.js$": "<rootDir>/packages/core/wasm-web/shallgraph_wasm.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@shallgraph/core/html$": "<rootDir>/packages/core/src/html.ts",
    "^@shallgraph/core/engine$": "<rootDir>/packages/core/src/engine.ts",
    "^@shallgraph/core/types$": "<rootDir>/packages/core/src/types.ts",
    "^@shallgraph/core$": "<rootDir>/packages/core/src/index.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.jest.json" },
    ],
  },
};

