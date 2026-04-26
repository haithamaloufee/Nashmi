import User from "../src/models/User";
import Party from "../src/models/Party";
import Post from "../src/models/Post";
import Poll from "../src/models/Poll";
import Law from "../src/models/Law";

export type DemoDataCounts = {
  adminUsers: number;
  parties: number;
  posts: number;
  polls: number;
  laws: number;
};

export const requiredDemoDataCounts: DemoDataCounts = {
  adminUsers: 1,
  parties: 2,
  posts: 2,
  polls: 2,
  laws: 2
};

export async function getDemoDataCounts(): Promise<DemoDataCounts> {
  const [adminUsers, parties, posts, polls, laws] = await Promise.all([
    User.countDocuments({ role: { $in: ["admin", "super_admin"] }, status: { $ne: "disabled" } }),
    Party.countDocuments({ status: "active" }),
    Post.countDocuments({ status: "published" }),
    Poll.countDocuments({ status: "active" }),
    Law.countDocuments({ status: "published" })
  ]);

  return { adminUsers, parties, posts, polls, laws };
}

export function hasRequiredDemoData(counts: DemoDataCounts) {
  return Object.entries(requiredDemoDataCounts).every(([key, required]) => {
    return counts[key as keyof DemoDataCounts] >= required;
  });
}

export function describeMissingDemoData(counts: DemoDataCounts) {
  return Object.entries(requiredDemoDataCounts)
    .filter(([key, required]) => counts[key as keyof DemoDataCounts] < required)
    .map(([key, required]) => `${key}: ${counts[key as keyof DemoDataCounts]}/${required}`);
}
