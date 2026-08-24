module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(lucide-react|react-router-dom|@remix-run|@tiptap)/)",
  ],
  testMatch: ["<rootDir>/src/**/*.test.{js,jsx}"],
  clearMocks: true,
  testTimeout: 15000,
};
