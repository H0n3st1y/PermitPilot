"use client";

import { useA11y } from "@/lib/a11y";

export function DemoNotice({ text }: { text?: string }) {
  const { t } = useA11y();
  return (
    <div className="demo-banner" role="note">
      {text || t("common.demoNotice")}
    </div>
  );
}
