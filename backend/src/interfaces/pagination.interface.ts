export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginationResult {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}
