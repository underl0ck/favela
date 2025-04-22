/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly RESEND_API_KEY: string;
  readonly RESEND_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}