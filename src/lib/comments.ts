import { publicUserSummary } from "@/lib/publicUser";

type LeanComment = Record<string, any>;

export function publicComment(comment: LeanComment) {
  const author = publicUserSummary(
    typeof comment.authorUserId === "object" && comment.authorUserId ? comment.authorUserId : null
  );

  return {
    _id: String(comment._id),
    content: comment.content,
    createdAt: comment.createdAt,
    author,
    authorUserId: author,
    authorRoleSnapshot: comment.authorRoleSnapshot,
    status: comment.status
  };
}

export function publicComments(comments: LeanComment[]) {
  return comments.map(publicComment);
}
