"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import PollVote from "@/components/polls/PollVote";
import ReportButton from "@/components/reports/ReportButton";
import CommentBox from "@/components/comments/CommentBox";
import ReactionButtons from "@/components/ui/ReactionButtons";
import InlineModerationActions from "@/components/admin/InlineModerationActions";
import ShareMenu from "@/components/ui/ShareMenu";

type Poll = {
  _id: string;
  question: string;
  description?: string | null;
  options: Array<{ _id: string; text: string; votesCount: number }>;
  totalVotes: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount?: number;
};

export default function PollCard({ poll, compact = false }: { poll: Poll; compact?: boolean }) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(poll.commentsCount || 0);

  return (
    <article className="card card-hover p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay">تصويت</span>
          <h3 className="mt-3 text-lg font-bold leading-8">{poll.question}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InlineModerationActions targetType="poll" targetId={poll._id} />
          <ReportButton targetType="poll" targetId={poll._id} compact />
        </div>
      </div>
      <PollVote poll={poll} />
      <div className="mt-4 flex items-center justify-between border-y border-line py-1 text-sm text-ink/55">
        <span>{commentsCount} تعليق</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ReactionButtons targetType="polls" targetId={poll._id} likesCount={poll.likesCount} dislikesCount={poll.dislikesCount} />
        {!compact ? (
          <button
            type="button"
            onClick={() => setCommentsExpanded((value) => !value)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-civic/10 hover:text-civic active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            تعليق
          </button>
        ) : null}
        <ShareMenu url={`/updates?poll=${poll._id}`} title={poll.question} text={poll.description || poll.question} />
      </div>
      {!compact ? <CommentBox targetType="polls" targetId={poll._id} expanded={commentsExpanded} onCountChange={(delta) => setCommentsCount((value) => Math.max(0, value + delta))} /> : null}
    </article>
  );
}
