import ReportButton from "@/components/reports/ReportButton";
import CommentBox from "@/components/comments/CommentBox";
import ReactionButtons from "@/components/ui/ReactionButtons";

type Post = {
  _id: string;
  title?: string | null;
  content: string;
  tags?: string[];
  authorType: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  publishedAt?: string;
};

export default function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <article className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="rounded bg-olive/10 px-2 py-1 text-xs text-olive">{post.authorType === "iec" ? "الهيئة المستقلة" : post.authorType === "party" ? "حزب" : "إدارة"}</span>
          {post.title ? <h3 className="mt-3 text-lg font-bold">{post.title}</h3> : null}
        </div>
        <ReportButton targetType="post" targetId={post._id} />
      </div>
      <p className="whitespace-pre-line leading-8 text-ink/80">{post.content}</p>
      {post.tags?.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded border border-line px-2 py-1 text-xs">{tag}</span>)}</div> : null}
      <ReactionButtons targetType="posts" targetId={post._id} likesCount={post.likesCount} dislikesCount={post.dislikesCount} />
      <div className="mt-3 text-sm text-ink/55">{post.commentsCount} تعليق</div>
      {!compact ? <CommentBox targetType="posts" targetId={post._id} /> : null}
    </article>
  );
}
