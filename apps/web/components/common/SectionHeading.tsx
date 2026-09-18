import type { RefObject } from "react";

/** Focusable view heading; the dashboard moves focus here after navigation. */
export function SectionHeading({
  headingRef,
  title,
  children,
  actions,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 id="section-heading" ref={headingRef} tabIndex={-1} className="h2">
          {title}
        </h2>
        {children ? <div className="meta mt-1 max-w-2xl">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
