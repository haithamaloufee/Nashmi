export type PublisherAccountType = "party" | "authority";

export type PublisherComposerProfile = {
  name?: string | null;
  imageUrl?: string | null;
  accountType: PublisherAccountType;
};

export type UploadedComposerMedia = {
  id: string;
  url: string;
  type?: string;
  mimeType?: string;
};
