// Navigation param list types — kept in a separate file to avoid circular imports
// (screens import these types, and the navigation index imports screens)

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  CreateEditPost: { postId?: string; mode: 'create' | 'edit' };
};

export type ProfileStackParamList = {
  Profile: undefined;
  PostDetail: { postId: string };
  CreateEditPost: { postId?: string; mode: 'create' | 'edit' };
};

export type TabParamList = {
  FeedTab: undefined;
  ProfileTab: undefined;
};
