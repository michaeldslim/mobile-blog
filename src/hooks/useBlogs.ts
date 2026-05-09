import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createGraphQLClient,
  GET_BLOGS,
  GET_BLOG_BY_ID,
  CREATE_BLOG,
  UPDATE_BLOG,
  DELETE_BLOG,
  TOGGLE_LIKE,
  GetBlogsResult,
  GetBlogByIdResult,
  CreateBlogResult,
  UpdateBlogResult,
  DeleteBlogResult,
  buildBlogsFilter,
  FetchBlogsParams,
} from '../lib/graphql';
import { deleteBlogImage } from '../lib/imageUpload';
import { sendNewPostNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { Blog, CreateBlogInput, UpdateBlogInput } from '../types';

const PAGE_SIZE = 20;

// ─── Feed (infinite scroll) 
export interface UseBlogsOptions {
  search?: string;
  tag?: string;
  allStatuses?: boolean;
  authorId?: string;
  accessToken?: string | null;
  enabled?: boolean;
  orderBy?: Record<string, string>[];
}

export function useBlogs(options: UseBlogsOptions = {}) {
  const { search, tag, allStatuses, authorId, accessToken, enabled, orderBy } = options;

  return useInfiniteQuery<GetBlogsResult, Error, InfiniteData<GetBlogsResult>, string[], string | null>({
    queryKey: ['blogs', search ?? '', tag ?? '', allStatuses ? '1' : '0', authorId ?? '', JSON.stringify(orderBy ?? null)],
    enabled: enabled ?? true,
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLClient(accessToken);
      const filter = buildBlogsFilter({ search, tag, allStatuses, authorId });
      return client.request<GetBlogsResult>(GET_BLOGS, {
        first: PAGE_SIZE,
        after: pageParam ?? null,
        filter,
        orderBy: orderBy ?? [{ createdAt: 'DescNullsLast' }],
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.mobileBlogCollection.pageInfo.hasNextPage
        ? lastPage.mobileBlogCollection.pageInfo.endCursor
        : undefined,
  });
}

// Flatten pages → flat list of blogs
export function flattenBlogPages(data: InfiniteData<GetBlogsResult> | undefined): Blog[] {
  if (!data) return [];
  return data.pages.flatMap((page) =>
    page.mobileBlogCollection.edges.map((edge) => edge.node)
  );
}

// ─── Single post
export function useBlog(id: string, accessToken?: string | null) {
  return useQuery<Blog | null>({
    queryKey: ['blog', id],
    queryFn: async () => {
      const client = createGraphQLClient(accessToken);
      const result = await client.request<GetBlogByIdResult>(GET_BLOG_BY_ID, { id });
      return result.mobileBlogCollection.edges[0]?.node ?? null;
    },
    enabled: !!id,
  });
}

// ─── Create 
export function useCreateBlog(accessToken?: string | null) {
  const qc = useQueryClient();

  return useMutation<Blog, Error, CreateBlogInput>({
    mutationFn: async (input) => {
      const client = createGraphQLClient(accessToken);
      const result = await client.request<CreateBlogResult>(CREATE_BLOG, { input });
      const record = result.insertIntoMobileBlogCollection.records[0];
      if (!record) throw new Error('Blog creation returned no record');
      return record;
    },
    onSuccess: (blog) => {
      qc.invalidateQueries({ queryKey: ['blogs'] });
      qc.invalidateQueries({ queryKey: ['blogs-calendar'] });
      if (blog.status === 'published') {
        sendNewPostNotification(blog, accessToken).catch(() => {});
      }
    },
  });
}

// ─── Update
export function useUpdateBlog(accessToken?: string | null) {
  const qc = useQueryClient();

  return useMutation<Blog, Error, { id: string; input: UpdateBlogInput; oldImageUrl?: string | null }>({
    mutationFn: async ({ id, input, oldImageUrl }) => {
      // If imageUrl is being changed, delete old image
      if (oldImageUrl && input.imageUrl !== undefined && input.imageUrl !== oldImageUrl) {
        await deleteBlogImage(oldImageUrl);
      }
      const client = createGraphQLClient(accessToken);
      const result = await client.request<UpdateBlogResult>(UPDATE_BLOG, { id, input });
      const record = result.updateMobileBlogCollection.records[0];
      if (!record) throw new Error('Blog update returned no record');
      return record;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['blogs'] });
      qc.invalidateQueries({ queryKey: ['blogs-calendar'] });
      qc.setQueryData(['blog', data.id], data);
    },
  });
}

// ─── Delete 
export function useDeleteBlog(accessToken?: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, { id: string; imageUrl?: string | null }>({
    mutationFn: async ({ id, imageUrl }) => {
      const client = createGraphQLClient(accessToken);
      await client.request<DeleteBlogResult>(DELETE_BLOG, { id });
      if (imageUrl) await deleteBlogImage(imageUrl);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blogs'] });
      qc.invalidateQueries({ queryKey: ['blogs-calendar'] });
    },
  });
}

// ─── Like / Dislike
// Persist vote per post in AsyncStorage so it survives app restarts.
// Key: "vote:<postId>", Value: "like" | "dislike" | ""
const VOTE_KEY = (id: string) => `vote:${id}`;

export type VoteState = 'like' | 'dislike' | null;

export async function getVote(postId: string): Promise<VoteState> {
  const v = await AsyncStorage.getItem(VOTE_KEY(postId));
  return (v as VoteState) ?? null;
}

async function setVoteStorage(postId: string, vote: VoteState) {
  if (vote) {
    await AsyncStorage.setItem(VOTE_KEY(postId), vote);
  } else {
    await AsyncStorage.removeItem(VOTE_KEY(postId));
  }
}

export function useVote(postId: string) {
  return useQuery<VoteState>({
    queryKey: ['vote', postId],
    queryFn: () => getVote(postId),
    staleTime: Infinity,
  });
}

export function useLikeBlog(accessToken?: string | null) {
  const qc = useQueryClient();

  return useMutation<
    { blog: Blog; newVote: VoteState },
    Error,
    { blog: Blog; action: 'like' | 'dislike' }
  >({
    mutationFn: async ({ blog, action }) => {
      const prevVote = await getVote(blog.id);

      // Toggle off if same action clicked again
      const newVote: VoteState = prevVote === action ? null : action;

      // Compute new counts based on transition
      let likes = blog.likesCount;
      let dislikes = blog.dislikesCount;

      if (prevVote === 'like') likes -= 1;
      if (prevVote === 'dislike') dislikes -= 1;
      if (newVote === 'like') likes += 1;
      if (newVote === 'dislike') dislikes += 1;

      // Clamp to >= 0 to guard against data drift
      likes = Math.max(0, likes);
      dislikes = Math.max(0, dislikes);

      const client = createGraphQLClient(accessToken);
      await client.request(
        `mutation UpdateReactions($id: UUID!, $likes: Int!, $dislikes: Int!) {
           updateMobileBlogCollection(
             filter: { id: { eq: $id } }
             set: { likesCount: $likes, dislikesCount: $dislikes }
           ) {
             records { id likesCount dislikesCount }
           }
         }`,
        { id: blog.id, likes, dislikes }
      );

      await setVoteStorage(blog.id, newVote);

      return {
        blog: { ...blog, likesCount: likes, dislikesCount: dislikes },
        newVote,
      };
    },

    onMutate: async ({ blog, action }) => {
      await qc.cancelQueries({ queryKey: ['blog', blog.id] });
      await qc.cancelQueries({ queryKey: ['vote', blog.id] });

      const prevVote = qc.getQueryData<VoteState>(['vote', blog.id]) ?? null;
      const newVote: VoteState = prevVote === action ? null : action;

      let likes = blog.likesCount;
      let dislikes = blog.dislikesCount;
      if (prevVote === 'like') likes -= 1;
      if (prevVote === 'dislike') dislikes -= 1;
      if (newVote === 'like') likes += 1;
      if (newVote === 'dislike') dislikes += 1;

      qc.setQueryData(['blog', blog.id], { ...blog, likesCount: Math.max(0, likes), dislikesCount: Math.max(0, dislikes) });
      qc.setQueryData(['vote', blog.id], newVote);

      return { prevBlog: blog, prevVote };
    },

    onError: (_err, { blog }, ctx: any) => {
      qc.setQueryData(['blog', blog.id], ctx?.prevBlog ?? blog);
      qc.setQueryData(['vote', blog.id], ctx?.prevVote ?? null);
    },

    onSuccess: ({ blog, newVote }) => {
      qc.setQueryData(['blog', blog.id], blog);
      qc.setQueryData(['vote', blog.id], newVote);

      // Patch the updated counts into every cached feed page so the
      // counts are correct when the user navigates back to the feed.
      qc.setQueriesData<InfiniteData<GetBlogsResult>>(
        { queryKey: ['blogs'], exact: false },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              mobileBlogCollection: {
                ...page.mobileBlogCollection,
                edges: page.mobileBlogCollection.edges.map((edge) =>
                  edge.node.id === blog.id
                    ? { ...edge, node: { ...edge.node, likesCount: blog.likesCount, dislikesCount: blog.dislikesCount } }
                    : edge
                ),
              },
            })),
          };
        }
      );
    },

    onSettled: (_data, _err, { blog }) => {
      qc.invalidateQueries({ queryKey: ['blog', blog.id] });
    },
  });
}

// ─── All posts for calendar view (current user's posts only)
// Fetches all posts for the given author in batches and resolves to a flat array.
export function useAllBlogsForCalendar(accessToken?: string | null, authorId?: string | null) {
  return useInfiniteQuery<GetBlogsResult, Error, InfiniteData<GetBlogsResult>, string[], string | null>({
    queryKey: ['blogs-calendar', authorId ?? ''],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLClient(accessToken);
      // When authorId is present, show all of the user's own posts (any status).
      // Without an authorId, fall back to published-only.
      const filter = authorId
        ? { authorId: { eq: authorId } }
        : { status: { eq: 'published' } };
      return client.request<GetBlogsResult>(GET_BLOGS, {
        first: 200,
        after: pageParam ?? null,
        filter,
        orderBy: [{ createdAt: 'DescNullsLast' }],
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.mobileBlogCollection.pageInfo.hasNextPage
        ? lastPage.mobileBlogCollection.pageInfo.endCursor
        : undefined,
  });
}

// ─── View count ──────────────────────────────────────────────────────────────
export function useViewCount(postId: string, _accessToken?: string | null) {
  return useQuery<number>({
    queryKey: ['viewCount', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_blogs')
        .select('view_count')
        .eq('id', postId)
        .single();
      if (error) throw error;
      return (data as any)?.view_count ?? 0;
    },
    enabled: !!postId,
    staleTime: 30_000,
  });
}

// ─── Increment view count ────────────────────────────────────────────────────
export function useIncrementViewCount() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.rpc('increment_blog_view_count', { post_id: id });
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      // Refetch the view count from DB so we show the accurate server value
      qc.invalidateQueries({ queryKey: ['viewCount', id] });
    },
  });
}
