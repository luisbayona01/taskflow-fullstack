/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API REST de TaskFlow (backend Laravel). */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
