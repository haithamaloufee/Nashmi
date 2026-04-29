import PollVote from "@/components/polls/PollVote";
import ReportButton from "@/components/reports/ReportButton";
import CommentBox from "@/components/comments/CommentBox";
import ReactionButtons from "@/components/ui/ReactionButtons";
import InlineModerationActions from "@/components/admin/InlineModerationActions";

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  options: Array<{ _id: string; text: string; votesCount: number }>;
  totalVotes: number;
  likesCount: number;
  dislikesCount: number;
};

export default function PollCard({ poll, compact = false }: { poll: Poll; compact?: boolean }) {
  return (
    <article className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded bg-clay/10 px-2 py-1 text-xs text-clay">تصويت</span>
        <div className="flex flex-wrap items-center gap-2">
          <InlineModerationActions targetType="poll" targetId={poll._id} />
          <ReportButton targetType="poll" targetId={poll._id} />
        </div>
      </div>
      <PollVote poll={poll} />
      <ReactionButtons targetType="polls" targetId={poll._id} likesCount={poll.likesCount} dislikesCount={poll.dislikesCount} />
      {!compact ? <CommentBox targetType="polls" targetId={poll._id} /> : null}
    </article>
  );
}
