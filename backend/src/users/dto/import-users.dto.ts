export interface FileUserRow {
  name?: string;
  email: string;
  role?: string;
  rollNumber?: string;
  universityId?: string;
}

/** @deprecated use FileUserRow */
export type CsvUserRow = FileUserRow;

export interface ImportUsersResult {
  imported: number;
  skipped: number;
  errors: string[];
}
