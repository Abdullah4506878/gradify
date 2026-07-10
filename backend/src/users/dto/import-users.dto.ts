export type FileUserRow = Record<string, unknown>;

/** @deprecated use FileUserRow */
export type CsvUserRow = FileUserRow;

export interface ImportUsersResult {
  added: number;
  updated: number;
  imported: number; // = added + updated; kept for backward compatibility with supervisor import page
  skipped: number;
  errors: string[];
}
