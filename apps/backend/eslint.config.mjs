import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Konfigurasi ESLint backend — sengaja MINIMAL.
 *
 * Codebase ini belum pernah di-lint, sehingga mengaktifkan seluruh aturan
 * sekaligus akan menghasilkan ratusan temuan dan menenggelamkan masalah nyata.
 * Aturan di sini dipilih yang menangkap BUG, bukan gaya penulisan:
 *
 *   - no-unused-vars          : sisa refactor yang tidak terpakai
 *   - no-undef / no-dupe-*    : kesalahan yang pasti berbahaya
 *   - no-explicit-any / no-non-null-assertion dimatikan karena dipakai wajar
 *     di kode Prisma/Nest yang ada.
 *
 * Aturan gaya diserahkan ke Prettier (format), bukan ESLint.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Banyak dipakai pada boundary Prisma/Nest — bukan sinyal bug.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',

      // Sinyal bug nyata: variabel/argumen yang tidak terpakai.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // Log konsol memang dipakai untuk operasional (bukan library).
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      // Tes boleh memakai any untuk stub.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
