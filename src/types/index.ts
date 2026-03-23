export type BlogStatus = 'draft' | 'published' | 'scheduled';

export interface Blog {
  id: string;
  shortCode: string;
  title: string;
  content: string;
  isGood: boolean;
  likesCount: number;
  dislikesCount: number;
  imageUrl: string | null;
  authorId: string | null;
  authorName: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogsConnection {
  edges: Array<{ cursor: string; node: Blog }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export interface CreateBlogInput {
  title: string;
  content: string;
  status: BlogStatus;
  imageUrl?: string | null;
  tags?: string[];
  authorId?: string;
  authorName?: string;
}

export interface UpdateBlogInput {
  title?: string;
  content?: string;
  status?: BlogStatus;
  imageUrl?: string | null;
  tags?: string[];
  publishedAt?: string | null;
}

export type ThemeName = 'dark-green' | 'dark-teal' | 'light-neutral';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
}
