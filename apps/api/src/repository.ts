import type {
  Investigation,
  InvestigationEvent,
} from "../../../packages/contracts/src/index.js";
export interface StoredRun extends Investigation {
  ownerId: string | null;
  events: InvestigationEvent[];
}
export interface Repository {
  charge(): Promise<boolean>;
  list(): Promise<StoredRun[]>;
  listExpired(before: string, limit: number): Promise<string[]>;
  put(run: StoredRun): Promise<void>;
  remove(id: string): Promise<void>;
  upload(id: string, page: string, bytes: Buffer): Promise<void>;
  download(id: string, page: string): Promise<Buffer>;
}
