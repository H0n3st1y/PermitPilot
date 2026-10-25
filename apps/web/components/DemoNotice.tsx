"use client";

import { useA11y } from "@/lib/a11y";

// yellow strip at the top. uses the text we pass, or the default demo line
export function DemoNotice({ text }: { text?: string }) {
  const { t } = useA11y();
  return (
    <div className="demo-banner" role="note">
      {/* caller text wins; otherwise the translated notice */}
      {text || t("common.demoNotice")}
    </div>
  );
}
