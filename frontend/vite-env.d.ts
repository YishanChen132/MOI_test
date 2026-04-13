// 這個檔案負責補上 Vite 環境變數的型別宣告。
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
