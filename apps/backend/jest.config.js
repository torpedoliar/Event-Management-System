/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Tes integrasi memakai SATU database uji. Menjalankan berkas tes secara
  // paralel akan membuat tes saling menghapus data satu sama lain.
  maxWorkers: 1,
  testTimeout: 60000,
  clearMocks: true,
  verbose: true,
};
