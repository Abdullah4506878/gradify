export interface CsvUserRow {
  name?: string;
  email: string;
  role?: string;
  universityId?: string;
}

export interface ImportUsersResult {
  imported: number;
  skipped: number;
  errors: string[];
}
