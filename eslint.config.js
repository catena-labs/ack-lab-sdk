import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import globals from "globals"

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  ...tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    {
      languageOptions: {
        globals: {
          ...globals.node
        }
      },
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_"
          }
        ]
      }
    }
  )
]
