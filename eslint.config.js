const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["scripts/**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];
