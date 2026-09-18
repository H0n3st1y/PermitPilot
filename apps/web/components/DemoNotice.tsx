"use client";

import Link from "next/link";
import { useCopy } from "@/lib/i18n/useCopy";

export function DemoNotice() {
  const { t } = useCopy();
  return (
    <div className="demo-banner" role="note">
      <strong>{t("demo.label")}</strong> {t("demo.body")}{" "}
      <Link href="/about" className="text-[var(--ink)] underline">
        {t("demo.whatThisMeans")}
      </Link>
    </div>
  );
}
