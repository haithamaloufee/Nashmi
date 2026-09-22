"use client";

import PostCard from "@/components/posts/PostCard";
import PollCard from "@/components/polls/PollCard";
import SurveyFeedCard from "@/components/surveys/SurveyFeedCard";

type FeedItem = {
  type: "post" | "poll" | "survey";
  publishedAt: string;
  item: any;
};

export default function HomeFeedPreview({ items }: { items: FeedItem[] }) {
  return (
    <div className="space-y-4">
      {items.slice(0, 3).map((entry) => {
        if (entry.type === "post") return <PostCard key={`home-post-${entry.item._id}`} post={entry.item} compact />;
        if (entry.type === "poll") return <PollCard key={`home-poll-${entry.item._id}`} poll={entry.item} compact />;
        return <SurveyFeedCard key={`home-survey-${entry.item._id}`} survey={entry.item} />;
      })}
    </div>
  );
}
