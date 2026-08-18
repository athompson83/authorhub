export type Id = string;
export type IsoTimestamp = string;

export interface BookRecord {
  id: Id;
  organizationId: Id;
  title: string;
  subtitle: string | null;
  audience: string | null;
  purpose: string | null;
  targetWordCount: number | null;
  status: 'active' | 'archived';
  createdBy: Id;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ManuscriptNodeRecord {
  id: Id;
  bookId: Id;
  parentId: Id | null;
  kind:
    | 'front_matter'
    | 'part'
    | 'chapter'
    | 'section'
    | 'back_matter';
  title: string;
  position: number;
  content: unknown;
  contentVersion: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
