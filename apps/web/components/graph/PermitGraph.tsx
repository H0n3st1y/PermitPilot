"use client";

import { useEffect, useMemo, useState } from "react";
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
import { PermitStepNode, type PermitFlowNode } from "@/components/graph/PermitStepNode";
import { StatusSelect } from "@/components/timeline/StatusSelect";
import { useA11y } from "@/lib/a11y";
import { nextAction } from "@/lib/engine/bottlenecks";
import { layoutPermitGraph } from "@/lib/engine/graphLayout";
import { criticalPathIds } from "@/lib/engine/timeline";
import type { Bottleneck, PermitStep, PermitStepStatus, Project } from "@/lib/types";
import "@xyflow/react/dist/style.css";

const nodeTypes = { permit: PermitStepNode };

function buildDeterministicFollowUpDraft(
  project: Project,
  step: PermitStep,
  ruleId?: string,
): string {
  const citation = step.citations[0]
    ? `${step.citations[0].code} (${step.citations[0].title})`
    : "applicable municipal code";
  const changedAt = step.statusChangedAt ? new Date(step.statusChangedAt).getTime() : NaN;
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

export function PermitGraph({
  project,
  bottlenecks,
  onStatusChange,
}: {
  project: Project;
  bottlenecks: Bottleneck[];
  showDemoGuide?: boolean;
  onStatusChange: (stepId: string, status: PermitStepStatus) => void;
}) {
  const { t, plainLanguage } = useA11y();
  const [selectedId, setSelectedId] = useState<string | null>(
    bottlenecks[0]?.stepId ?? project.roadmap.steps[0]?.id ?? null,
  );
  const [handoffText, setHandoffText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [matchedCitations, setMatchedCitations] = useState<MatchedCitation[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);
  const [explanation, setExplanation] = useState("");
  const [explainNote, setExplainNote] = useState("");
  const [explainFromModel, setExplainFromModel] = useState(false);
  const [explainBusy, setExplainBusy] = useState(false);

  const critical = useMemo(() => criticalPathIds(project.roadmap.steps), [project.roadmap.steps]);
  const bottleneckByStep = useMemo(
    () => new Map(bottlenecks.map((item) => [item.stepId, item])),
    [bottlenecks],
  );
  const primaryBottleneckId =
    bottlenecks[0]?.stepId ??
    project.roadmap.steps.find((s) => s.id === "health-permit")?.id ??
    project.roadmap.steps[0]?.id;

  const selectedStep = project.roadmap.steps.find((step) => step.id === selectedId);
  const selectedTrace = project.roadmap.traces.find((trace) => trace.stepId === selectedId);
  const selectedBottleneck = selectedId ? bottleneckByStep.get(selectedId) : undefined;

  const graph = useMemo(() => {
    const positions = layoutPermitGraph(project.roadmap.steps);
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

    const nextEdges: Edge[] = project.roadmap.steps.flatMap((step) =>
      step.dependencies.map((dependency) => ({
        id: `${dependency}->${step.id}`,
        source: dependency,
        target: step.id,
        animated: bottleneckByStep.has(step.id) || bottleneckByStep.has(dependency),
        className: critical.has(step.id) && critical.has(dependency) ? "permit-edge-critical" : "permit-edge",
      })),
    );

    return { nodes: nextNodes, edges: nextEdges };
  }, [project.roadmap.steps, bottleneckByStep, critical, selectedId, primaryBottleneckId, t]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  useEffect(() => {
    if (selectedId && project.roadmap.steps.some((step) => step.id === selectedId)) return;
    setSelectedId(bottlenecks[0]?.stepId ?? project.roadmap.steps[0]?.id ?? null);
  }, [bottlenecks, project.roadmap.steps, selectedId]);

  const citationKey = [
    project.id,
    project.config.state ?? "NH",
    project.config.useCase ?? "",
    project.config.projectType,
    project.roadmap.steps.map((step) => step.id).join(","),
  ].join("|");

  useEffect(() => {
    const stepIds = project.roadmap.steps.map((step) => step.id);
    let cancelled = false;
    void fetch("/api/citations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "match", config: project.config, stepIds }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          citations?: MatchedCitation[];
          followUps?: FollowUpSuggestion[];
        };
        if (cancelled) return;
        setMatchedCitations(body.citations ?? []);
        setFollowUps(body.followUps ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [citationKey, project.config, project.roadmap.steps]);

  function handleStepStatusChange(stepId: string, status: PermitStepStatus) {
    const simulatedSteps = project.roadmap.steps.map((step) =>
      step.id === stepId ? { ...step, status, statusChangedAt: new Date().toISOString() } : step,
    );
    const nextUpcoming = nextAction(simulatedSteps);
    onStatusChange(stepId, status);

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

  const showFollowUp =
    selectedStep &&
    (Boolean(selectedBottleneck) || selectedStep.status === "in_review" || selectedStep.status === "submitted");

  const followUpText =
    selectedStep && showFollowUp
      ? buildDeterministicFollowUpDraft(project, selectedStep, selectedTrace?.ruleId)
      : "";

  async function handleCopyFollowUp() {
    if (!followUpText || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(followUpText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const matchedForStep = selectedStep
    ? matchedCitations.filter((item) => item.stepId === selectedStep.id)
    : [];

  async function handleExplainCitation() {
    if (!selectedStep) return;
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "explain",
          config: project.config,
          stepIds: [selectedStep.id],
          stepTitle: selectedStep.title,
          citationQuote: quote,
        }),
      });
      const body = (await response.json()) as {
        explanation?: string;
        note?: string;
        modelUsed?: boolean;
      };
      const text = body.explanation?.trim() ?? "";
      setExplanation(text || body.note || "No explanation was returned.");
      setExplainFromModel(Boolean(body.modelUsed) && Boolean(text));
      setExplainNote(body.modelUsed ? "" : (body.note ?? ""));
    } catch {
      setExplanation(
        quote
          ? `The cited language says: "${quote}"\n\nIn plain English: this step is on the map because of that requirement. Confirm it with the town. This is not official legal advice.`
          : "Could not explain this citation right now.",
      );
      setExplainFromModel(false);
      setExplainNote("Claude could not be reached.");
    } finally {
      setExplainBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel overflow-hidden p-0">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="font-serif text-2xl text-[var(--navy)]">{t("graph.title")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("graph.subtitle")}</p>
          </div>
          <label className="block border-b border-[var(--line)] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("graph.stepList")}
            </span>
            <select
              className="status-select mt-2"
              value={selectedId ?? ""}
              onChange={(event) => {
                setSelectedId(event.target.value || null);
                setHandoffText(null);
                setExplanation("");
                setExplainNote("");
                setExplainFromModel(false);
              }}
            >
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
              nodesDraggable={false}
              nodesConnectable={false}
              panOnScroll
              fitView
              minZoom={0.45}
              maxZoom={1.4}
              onNodeClick={(_, node) => {
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

        <aside className="panel" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{t("graph.why")}</p>
              <h3 className="font-serif text-2xl text-[var(--navy)]">
                {selectedStep?.title ?? t("graph.selectHint")}
              </h3>
            </div>
            {selectedStep ? (
              <button
                type="button"
                className="button secondary px-3"
                onClick={() => setSelectedId(null)}
              >
                <X size={16} aria-hidden />
                <span className="sr-only">{t("graph.close")}</span>
              </button>
            ) : null}
          </div>

          {selectedStep ? (
            <>
              <p className="mt-3 text-[var(--ink)]">
                {plainLanguage ? selectedStep.plainLanguage : selectedStep.whyRequired}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {critical.has(selectedStep.id) ? (
                  <span className="status-pill status-submitted">{t("graph.critical")}</span>
                ) : null}
                {selectedBottleneck ? (
                  <span className="status-pill status-in_review">{t("graph.bottleneck")}</span>
                ) : null}
              </div>
              {selectedBottleneck ? (
                <p className="bottleneck-flag" role="status">
                  {plainLanguage ? selectedBottleneck.plainLanguage : selectedBottleneck.message}
                </p>
              ) : null}

              {handoffText ? (
                <div className="handoff-banner" role="status">
                  <ArrowRightCircle size={18} className="shrink-0 text-[var(--ok)]" aria-hidden />
                  <span>{handoffText}</span>
                </div>
              ) : null}

              <div className="mt-4 space-y-2.5" data-tour="status-control">
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
                {matchedForStep.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {matchedForStep.map((item) => (
                      <li key={`${item.stepId}-${item.code}`} className="rounded border border-[var(--line)] bg-[var(--card)] p-2 text-xs">
                        <p className="font-semibold text-[var(--navy)]">
                          {item.code} · {item.title}
                        </p>
                        <p className="mt-1 text-[var(--ink)]">{item.quote}</p>
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
                  className="button secondary mt-3 !min-h-[32px] !px-2.5 text-xs"
                  disabled={explainBusy}
                  onClick={() => void handleExplainCitation()}
                >
                  <Sparkles size={13} aria-hidden />
                  {explainBusy ? "Explaining…" : "Explain this citation"}
                </button>
                {explanation ? (
                  <div className="mt-3 rounded border border-[var(--line)] bg-[var(--card)] p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {explainFromModel ? "Claude explanation" : "Plain-language summary"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{explanation}</p>
                    {explainNote ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">{explainNote}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

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

              {showFollowUp ? (
                <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--navy)]">
                      <Mail size={14} aria-hidden />
                      {t("graph.followUpTitle")}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopyFollowUp()}
                      className="button secondary !min-h-[32px] !px-2.5 text-xs"
                    >
                      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copied ? t("graph.copied") : t("graph.copyDraft")}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{t("graph.followUpNote")}</p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[var(--line)] bg-[var(--card)] p-2.5 font-mono text-xs text-[var(--ink)]">
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
