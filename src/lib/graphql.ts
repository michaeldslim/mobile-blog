import { GraphQLClient, gql } from 'graphql-request';
import { Blog, BlogsConnection, CreateBlogInput, UpdateBlogInput } from '../types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// GraphQL client pointing to Supabase pg_graphql endpoint
export const createGraphQLClient = (accessToken?: string | null) =>
  new GraphQLClient(`${supabaseUrl}/graphql/v1`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

// ─── Fragments
const BLOG_FIELDS = gql`
  fragment BlogFields on MobileBlog {
    id
    shortCode
    title
    content
    isGood
    likesCount
    dislikesCount
    imageUrl
    authorId
    authorName
    status
    publishedAt
    tags
    createdAt
    updatedAt
  }
`;

// ─── Queries
export const GET_BLOGS = gql`
  ${BLOG_FIELDS}
  query GetBlogs(
    $first: Int
    $after: Cursor
    $filter: MobileBlogFilter
    $orderBy: [MobileBlogOrderBy!]
  ) {
    mobileBlogCollection(
      first: $first
      after: $after
      filter: $filter
      orderBy: $orderBy
    ) {
      edges {
        cursor
        node {
          ...BlogFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_BLOG_BY_ID = gql`
  ${BLOG_FIELDS}
  query GetBlogById($id: UUID!) {
    mobileBlogCollection(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
          ...BlogFields
        }
      }
    }
  }
`;

// ─── Mutations
export const CREATE_BLOG = gql`
  ${BLOG_FIELDS}
  mutation CreateBlog($input: MobileBlogInsertInput!) {
    insertIntoMobileBlogCollection(objects: [$input]) {
      records {
        ...BlogFields
      }
    }
  }
`;

export const UPDATE_BLOG = gql`
  ${BLOG_FIELDS}
  mutation UpdateBlog($id: UUID!, $input: MobileBlogUpdateInput!) {
    updateMobileBlogCollection(filter: { id: { eq: $id } }, set: $input) {
      records {
        ...BlogFields
      }
    }
  }
`;

export const DELETE_BLOG = gql`
  mutation DeleteBlog($id: UUID!) {
    deleteFromMobileBlogCollection(filter: { id: { eq: $id } }) {
      records {
        id
      }
    }
  }
`;

export const TOGGLE_LIKE = gql`
  ${BLOG_FIELDS}
  mutation ToggleLike($id: UUID!, $likes: Int!) {
    updateMobileBlogCollection(
      filter: { id: { eq: $id } }
      set: { likesCount: $likes }
    ) {
      records {
        ...BlogFields
      }
    }
  }
`;

// ─── Helper types returned by queries
export interface GetBlogsResult {
  mobileBlogCollection: BlogsConnection;
}

export interface GetBlogByIdResult {
  mobileBlogCollection: {
    edges: Array<{ node: Blog }>;
  };
}

export interface CreateBlogResult {
  insertIntoMobileBlogCollection: { records: Blog[] };
}

export interface UpdateBlogResult {
  updateMobileBlogCollection: { records: Blog[] };
}

export interface DeleteBlogResult {
  deleteFromMobileBlogCollection: { records: Array<{ id: string }> };
}

// ─── Query variable builders
export interface FetchBlogsParams {
  first?: number;
  after?: string | null;
  search?: string;
  tag?: string;
  /** When true, shows all statuses (admin/profile view). Default: published only */
  allStatuses?: boolean;
  /** Filter to a specific authorId */
  authorId?: string;
}

export function buildBlogsFilter(params: FetchBlogsParams) {
  const andClauses: Record<string, unknown>[] = [];

  if (!params.allStatuses) {
    andClauses.push({ status: { eq: 'published' } });
  }

  if (params.authorId) {
    andClauses.push({ authorId: { eq: params.authorId } });
  }

  if (params.tag) {
    // pg_graphql array contains filter
    andClauses.push({ tags: { contains: [params.tag] } });
  }

  if (params.search) {
    const likeSearch = `%${params.search}%`;
    andClauses.push({
      or: [
        { title: { ilike: likeSearch } },
        { content: { ilike: likeSearch } },
      ],
    });
  }

  return andClauses.length > 0 ? { and: andClauses } : undefined;
}
