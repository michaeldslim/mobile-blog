import {
  createGraphQLClient,
  CREATE_BLOG,
  CreateBlogResult,
} from './graphql';
import { uploadBlogImage } from './imageUpload';
import { OfflineDraft, removeOfflineDraft } from './offlineDrafts';
import { CreateBlogInput } from '../types';

export async function publishOfflineDraft(
  draft: OfflineDraft,
  accessToken: string | undefined | null
): Promise<void> {
  let imageUrl: string | null = null;
  if (draft.localImageUri) {
    imageUrl = await uploadBlogImage(draft.localImageUri);
  }

  const input: CreateBlogInput = {
    title: draft.title,
    content: draft.content,
    tags: draft.tags,
    status: draft.status,
    imageUrl,
    authorId: draft.authorId,
    authorName: draft.authorName,
  };

  const client = createGraphQLClient(accessToken);
  const result = await client.request<CreateBlogResult>(CREATE_BLOG, { input });
  const record = result.insertIntoMobileBlogCollection.records[0];
  if (!record) throw new Error('Blog creation returned no record');

  await removeOfflineDraft(draft.localId);
}
