"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import { ArrowRightCircle, CheckCircle2, Copy, Check, Mail, Sparkles, X } from "lucide-react";
import { CodeCitationBadge } from "@/components/citations/CodeCitationBadge";
import type { FollowUpSuggestion, MatchedCitation } from "@/lib/citationMatch";
import { citationRequestHeaders } from "@/lib/citationRequest";
import { PermitStepNode, type PermitFlowNode } from "@/components/graph/PermitStepNode";
import { StatusSelect } from "@/components/timeline/StatusSelect";
import { useA11y } from "@/lib/a11y";
import { nextAction } from "@/lib/engine/bottlenecks";
import { layoutPermitGraph } from "@/lib/engine/graphLayout";
import { criticalPathIds } from "@/lib/engine/timeline";
import type { Bottleneck, PermitStep, PermitStepStatus, Project } from "@/lib/types";
import "@xyflow/react/dist/style.css";

const nodeTypes = { permit: PermitStepNode };

// canned email, not from claude
// fill the follow-up email from the step, not from a model
function buildDeterministicFollowUpDraft(
  project: Project,
  step: PermitStep,
  ruleId?: string,
): string {
  // first citation, or a generic phrase when the step has none
  const citation = step.citations[0]
    ? `${step.citations[0].code} (${step.citations[0].title})`
    : "applicable municipal code";
  const changedAt = step.statusChangedAt ? new Date(step.statusChangedAt).getTime() : NaN;
  // days since the status changed, or 12 when we don't have a date
  const days = Number.isFinite(changedAt)
    ? Math.max(1, Math.round((Date.now() - changedAt) / (1000 * 60 * 60 * 24)))
    : 12;
  return [
    `To: ${step.department} (Demo Harbor, ${project.config.state ?? "NH"})`,
    `Subject: Status inquiry — ${project.config.name} · ${step.title}`,
    ``,
    `Hello ${step.department} team,`,
    ``,
    `I am following up on our ${step.title} application for ${project.config.name} (${project.config.squareFootage.toLocaleString()} sq ft), which has been in review for ${days} days.`,
    `Our submission includes the required documentation under ${citation}${ruleId ? ` (rule trace ${ruleId})` : ""}.`,
    ``,
    `Could you confirm whether any additional submittals are needed before downstream reviews can proceed?`,
    ``,
    `Thank you,`,
    `${project.config.name} Applicant`,
  ].join("\n");
}

// permit graph plus the why-this-step panel
export function PermitGraph({
  project,
  bottlenecks,
  onStatusChange,
}: {
  project: Project;
  bottlenecks: Bottleneck[];
  showDemoGuide?: boolean;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void | boolean;
}) {
  const { t, plainLanguage } = useA11y();
  const [selectedId, setSelectedId] = useState<string | null>(
    bottlenecks[0]?.stepId ?? project.roadmap.steps[0]?.id ?? null,
  );
  const [handoffText, setHandoffText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [matchedCitations, setMatchedCitations] = useState<MatchedCitation[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);
  const [explanation, setExplanation] = useState("");
  const [explainNote, setExplainNote] = useState("");
  const [explainFromModel, setExplainFromModel] = useState(false);
  const [explainBusy, setExplainBusy] = useState(false);
  const explanationRequest = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // changing steps cancels an in-flight explanation and the copy flash
  useEffect(() => {
    explanationRequest.current?.abort();
    setExplanation("");
    setExplainNote("");
    setExplainBusy(false);
    setCopied(false);
    setCopyError("");
    return () => { explanationRequest.current?.abort(); if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, [selectedId]);

  // steps that sit on the critical path
  const critical = useMemo(() => criticalPathIds(project.roadmap.steps), [project.roadmap.steps]);
  // bottleneck lookup by step id
  const bottleneckByStep = useMemo(
    () => new Map(bottlenecks.map((item) => [item.stepId, item])),
    [bottlenecks],
  );
  // the node the tour should highlight
  const primaryBottleneckId =
    bottlenecks[0]?.stepId ??
    project.roadmap.steps.find((s) => s.id === "health-permit")?.id ??
    project.roadmap.steps[0]?.id;

  const selectedStep = project.roadmap.steps.find((step) => step.id === selectedId);
  const selectedTrace = project.roadmap.traces.find((trace) => trace.stepId === selectedId);
  const selectedBottleneck = selectedId ? bottleneckByStep.get(selectedId) : undefined;

  const graph = useMemo(() => {
    // turn steps into nodes + arrows
    const positions = layoutPermitGraph(project.roadmap.steps);
    // one node per step, flagged if it is stuck, critical, or selected
    const nextNodes: Node[] = project.roadmap.steps.map((step) => {
      const point = positions.get(step.id) ?? { x: 0, y: 0 };
      const node: PermitFlowNode = {
        id: step.id,
        type: "permit",
        position: point,
        data: {
          shortTitle: step.shortTitle,
          department: step.department,
          status: step.status,
          statusLabel: t(`status.${step.status}`),
          bottleneck: bottleneckByStep.has(step.id),
          critical: critical.has(step.id),
          selected: step.id === selectedId,
          tourTarget: step.id === primaryBottleneckId ? "bottleneck-node" : undefined,
        },
        selected: step.id === selectedId,
      };
      return node;
    });

    // an arrow for each dependency, thicker when both ends are critical
    const nextEdges: Edge[] = project.roadmap.steps.flatMap((step) =>
      step.dependencies.map((dependency) => ({
        id: `${dependency}->${step.id}`,
        source: dependency,
        target: step.id,
        animated: false,
        className: critical.has(step.id) && critical.has(dependency) ? "permit-edge-critical" : "permit-edge",
      })),
    );

    return { nodes: nextNodes, edges: nextEdges };
  }, [project.roadmap.steps, bottleneckByStep, critical, selectedId, primaryBottleneckId, t]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  // clicking a node in the canvas selects it
  const handleSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    if (selected[0]) setSelectedId(selected[0].id);
  }, []);

  // push a rebuilt graph into the canvas state
  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  // if the selected step disappeared, pick the bottleneck or the first step
  useEffect(() => {
    if (!selectedId || project.roadmap.steps.some((step) => step.id === selectedId)) return;
    setSelectedId(bottlenecks[0]?.stepId ?? project.roadmap.steps[0]?.id ?? null);
  }, [bottlenecks, project.roadmap.steps, selectedId]);

  const citationKey = [
    project.id,
    project.config.state ?? "NH",
    project.config.useCase ?? "",
    project.config.projectType,
    project.roadmap.steps.map((step) => step.id).join(","),
  ].join("|");

  // ask the citations route to match quotes onto these steps
  useEffect(() => {
    const stepIds = project.roadmap.steps.map((step) => step.id);
    let cancelled = false;
    const controller = new AbortController();
    void citationRequestHeaders().then((headers) => fetch("/api/citations", {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({ action: "match", config: project.config, stepIds }),
    }))
      .then(async (response) => {
        // a failed match just leaves the lists empty
        if (!response.ok) return;
        const body = (await response.json()) as {
          citations?: MatchedCitation[];
          followUps?: FollowUpSuggestion[];
        };
        // ignore a response that came back after we moved on
        if (cancelled) return;
        setMatchedCitations(body.citations ?? []);
        setFollowUps(body.followUps ?? []);
      })
      .catch(() => undefined);
    // abort the match if the project changes
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [citationKey, project.config, project.roadmap.steps]);

  // save a status and, if it was an approval, point at the next step
  function handleStepStatusChange(stepId: string, status: PermitStepStatus) {
    // pretend the change already happened so we can find the next action
    const simulatedSteps = project.roadmap.steps.map((step) =>
      step.id === stepId ? { ...step, status, statusChangedAt: new Date().toISOString() } : step,
    );
    const nextUpcoming = nextAction(simulatedSteps);
    // the parent refused the save
    if (onStatusChange(stepId, status) === false) return;

    // an approval with a next step shows the handoff banner
    if (status === "approved" && nextUpcoming) {
      setHandoffText(
        t("graph.handoffNow", {
          title: nextUpcoming.shortTitle,
          department: nextUpcoming.department,
        }),
      );
    } else {
      setHandoffText(null);
    }
  }

  // follow-up draft shows for a bottleneck or a step already sent in
  const showFollowUp =
    selectedStep &&
    (Boolean(selectedBottleneck) || selectedStep.status === "in_review" || selectedStep.status === "submitted");

  const followUpText =
    selectedStep && showFollowUp
      ? buildDeterministicFollowUpDraft(project, selectedStep, selectedTrace?.ruleId)
      : "";

  // copy the draft and flash the copied state
  async function handleCopyFollowUp() {
    if (!followUpText || copyBusy) return;
    setCopyBusy(true);
    setCopyError("");
    try {
      await navigator.clipboard.writeText(followUpText);
      setCopied(true);
      // the check mark goes away after a couple seconds
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("Copy was unavailable. Select the draft text below and copy it manually, or try again.");
    } finally { setCopyBusy(false); }
  }

  // matched quotes that belong to the selected step
  const matchedForStep = selectedStep
    ? matchedCitations.filter((item) => item.stepId === selectedStep.id)
    : [];

  async function handleExplainCitation() {
    // pull a quote from the match or the fixture if match is empty
    if (!selectedStep || explainBusy) return;
    const controller = new AbortController();
    explanationRequest.current = controller;
    const quote =
      matchedForStep[0]?.quote ??
      selectedStep.citations[0]?.plainLanguage ??
      selectedStep.citations[0]?.summary ??
      selectedStep.whyRequired ??
      selectedStep.plainLanguage ??
      "";
    setExplainBusy(true);
    setExplainNote("");
    try {
      const response = await fetch("/api/citations", {
        method: "POST",
        signal: controller.signal,
        headers: await citationRequestHeaders(),
        body: JSON.stringify({
          action: "explain",
          config: project.config,
          stepIds: [selectedStep.id],
          stepTitle: selectedStep.title,
          citationQuote: quote,
        }),
      });
        if (!response.ok) throw new Error("Explanation request failed");
      const body = (await response.json()) as {
        explanation?: string;
        note?: string;
        modelUsed?: boolean;
      };
      const text = body.explanation?.trim() ?? "";
      setExplanation(text || body.note || "No explanation was returned.");
      setExplainFromModel(Boolean(body.modelUsed) && Boolean(text));
      // a local fallback keeps the note; a model reply does not
      setExplainNote(body.modelUsed ? "" : (body.note ?? ""));
    } catch {
      // a cancelled request should not overwrite the next step
      if (controller.signal.aborted) return;
      // local paragraph from the quote, or a short failure line
      setExplanation(
        quote
          ? `The cited language says: "${quote}"\n\nIn plain English: this step is on the map because of that requirement. Confirm it with the town. This is not official legal advice.`
          : "Could not explain this citation right now.",
      );
      setExplainFromModel(false);
      setExplainNote("The explanation service could not be reached. You can retry or open the citation source.");
    } finally {
      // leave the busy flag alone if this request was cancelled
      if (!controller.signal.aborted) setExplainBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel min-w-0 overflow-hidden p-0">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="font-serif text-2xl text-[var(--navy)]">{t("graph.title")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("graph.subtitle")}</p>
          </div>
          <label className="block border-b border-[var(--line)] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("graph.stepList")}
            </span>
            <select
              id="graph-step-picker"
              className="status-select mt-2"
              value={selectedId ?? ""}
              onChange={(event) => {
                // picking a step clears the handoff and any explanation
                setSelectedId(event.target.value || null);
                setHandoffText(null);
                setExplanation("");
                setExplainNote("");
                setExplainFromModel(false);
              }}
            >
              <option value="" disabled>{t("graph.selectHint")}</option>
              {/* one option per step, in sequence */}
              {project.roadmap.steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.sequence}. {step.shortTitle} ({step.department})
                </option>
              ))}
            </select>
          </label>
          <div className="permit-graph-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={handleSelectionChange}
              nodesDraggable={false}
              nodesConnectable={false}
              panOnScroll={false}
              preventScrolling={false}
              fitView
              minZoom={0.45}
              maxZoom={1.4}
              onNodeClick={(_, node) => {
                // same reset as the dropdown when they click a node
                setSelectedId(node.id);
                setHandoffText(null);
                setExplanation("");
                setExplainNote("");
                setExplainFromModel(false);
              }}
              aria-label={t("graph.title")}
            >
              <Background gap={18} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
        </section>

        <aside className="panel min-w-0 break-words">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{t("graph.why")}</p>
              <h3 className="font-serif text-2xl text-[var(--navy)]">
                {selectedStep?.title ?? t("graph.selectHint")}
              </h3>
            </div>
            {/* close puts focus back on the step list */}
            {selectedStep ? (
              <button
                type="button"
                className="button secondary px-3"
                onClick={() => { setSelectedId(null); document.getElementById("graph-step-picker")?.focus(); }}
              >
                <X size={16} aria-hidden />
                <span className="sr-only">{t("graph.close")}</span>
              </button>
            ) : null}
          </div>

          {/* details for the selected step, or the empty hint */}
          {selectedStep ? (
            <>
              <p className="mt-3 text-[var(--ink)]">
                {/* plain wording when that setting is on */}
                {plainLanguage ? selectedStep.plainLanguage : selectedStep.whyRequired}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* critical and bottleneck chips when they apply */}
                {critical.has(selectedStep.id) ? (
                  <span className="status-pill status-submitted">{t("graph.critical")}</span>
                ) : null}
                {selectedBottleneck ? (
                  <span className="status-pill status-in_review">{t("graph.bottleneck")}</span>
                ) : null}
              </div>
              {/* why this step is stuck */}
              {selectedBottleneck ? (
                <p className="bottleneck-flag" role="status">
                  {plainLanguage ? selectedBottleneck.plainLanguage : selectedBottleneck.message}
                </p>
              ) : null}

              {/* next step after an approval */}
              {handoffText ? (
                <div className="handoff-banner" role="status">
                  <ArrowRightCircle size={18} className="shrink-0 text-[var(--ok)]" aria-hidden />
                  <span>{handoffText}</span>
                </div>
              ) : null}

              <div className="mt-4 space-y-2.5" data-tour="status-control">
                {/* quick approve hides once it is already approved */}
                {selectedStep.status !== "approved" ? (
                  <button
                    type="button"
                    className="button primary w-full"
                    onClick={() => handleStepStatusChange(selectedStep.id, "approved")}
                  >
                    <CheckCircle2 size={16} aria-hidden />
                    {t("graph.markApprovedQuick")}
                  </button>
                ) : null}
                <StatusSelect
                  step={selectedStep}
                  onChange={(status) => handleStepStatusChange(selectedStep.id, status)}
                />
              </div>

              <div data-tour="why-trace" className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
                {/* rule trace, or a note when this step has none */}
                {selectedTrace ? (
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("graph.rule")}
                      </dt>
                      <dd className="mt-1 font-mono text-[var(--navy)]">{selectedTrace.ruleId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("graph.reason")}
                      </dt>
                      <dd className="mt-1">{selectedTrace.reason}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("graph.fields")}
                      </dt>
                      <dd className="mt-1">
                        <ul className="list-disc space-y-1 pl-5">
                          {/* each field the rule matched */}
                          {selectedTrace.matchedConditions.map((condition) => (
                            <li key={condition} className="font-mono text-xs">
                              {condition}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{t("graph.noTrace")}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{t("graph.ethics")}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("graph.citations")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {selectedStep.citations.map((citation) => (
                    <li key={citation.id}>
                      <CodeCitationBadge citation={citation} />
                    </li>
                  ))}
                </ul>
                {/* quotes the matcher attached to this step */}
                {matchedForStep.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {matchedForStep.map((item) => (
                      <li key={`${item.stepId}-${item.code}`} className="rounded border border-[var(--line)] bg-[var(--card)] p-2 text-xs">
                        <p className="font-semibold text-[var(--navy)]">
                          {item.code} · {item.title}
                        </p>
                        <p className="mt-1 text-[var(--ink)]">{item.quote}</p>
                        {/* source link when the match included one */}
                        {item.url ? (
                          <a className="mt-1 inline-block font-semibold text-[var(--navy)] underline" href={item.url} target="_blank" rel="noreferrer">
                            Open source
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="button secondary mt-3 text-sm"
                  disabled={explainBusy}
                  aria-busy={explainBusy}
                  onClick={() => void handleExplainCitation()}
                >
                  <Sparkles size={13} aria-hidden />
                  {explainBusy ? "Explaining…" : "Explain this citation"}
                </button>
                {/* explanation after they ask for one */}
                {explanation ? (
                  <div role="status" className="mt-3 rounded border border-[var(--line)] bg-[var(--card)] p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {/* label says whether a model wrote it */}
                      {explainFromModel ? "Claude explanation" : "Plain-language summary"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{explanation}</p>
                    {/* extra note when we fell back to local text */}
                    {explainNote ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">{explainNote}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* extra ideas that are not added to the map */}
              {followUps.length > 0 ? (
                <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--navy)]">
                    Suggested follow-ups
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    These are extra ideas in case the checklist missed something. They are not added to your permit map. Confirm with the town.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {followUps.map((item) => (
                      <li key={item.title} className="text-sm">
                        <strong className="text-[var(--navy)]">{item.title}.</strong> {item.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* email draft for a stuck or in-review step */}
              {showFollowUp ? (
                <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--navy)]">
                      <Mail size={14} aria-hidden />
                      {t("graph.followUpTitle")}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopyFollowUp()}
                      disabled={copyBusy}
                      className="button secondary text-sm"
                    >
                      {/* check icon after a successful copy */}
                      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copyBusy ? "Copying…" : copied ? t("graph.copied") : t("graph.copyDraft")}
                    </button>
                  </div>
                  <p className={copyError ? "mt-2 text-sm text-[var(--danger)]" : "sr-only"} role="status">{copyError || (copied ? "Draft copied to clipboard." : "")}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{t("graph.followUpNote")}</p>
                  <pre tabIndex={0} aria-label="Follow-up email draft" className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--line)] bg-[var(--card)] p-2.5 font-mono text-xs text-[var(--ink)]">
                    {followUpText}
                  </pre>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-[var(--muted)]">{t("graph.selectHint")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
