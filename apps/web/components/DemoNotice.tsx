import Link from "next/link";

export function DemoNotice() {
  return (
    <div className="demo-banner" role="note">
      <strong>Demo data.</strong> Demo Harbor is a fictional town.{" "}
      <Link href="/about" className="text-[var(--ink)] underline">
        What this means
      </Link>
    </div>
  );
}
