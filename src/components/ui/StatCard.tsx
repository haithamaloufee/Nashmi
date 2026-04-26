export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink/60">{label}</div>
      <div className="mt-2 text-3xl font-bold text-civic">{value}</div>
    </div>
  );
}
