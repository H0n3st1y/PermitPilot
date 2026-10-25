// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentVault } from "./documents/DocumentVault";
import { FeeSummary } from "./fees/FeeSummary";
import { InspectionChecklists } from "./inspections/InspectionChecklists";
import { sampleProject } from "@/lib/store";
import type { UploadedDocument } from "@/lib/types";

vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ plainLanguage: false }) }));
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("recovers an interrupted file read by retrying the same selected file, with focus on recovery", async () => {
  const onUpload = vi.fn();
  const read = vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementationOnce(function (this: FileReader) {
    this.dispatchEvent(new ProgressEvent("abort"));
  });
  render(React.createElement(DocumentVault, { project: sampleProject(), onUpload, onRemove: vi.fn() }));
  fireEvent.change(screen.getAllByLabelText(/Choose a file for/)[0], { target: { files: [new File(["pdf"], "original.pdf", { type: "application/pdf" })] } });
  const retry = await screen.findByRole("button", { name: /Retry attachment for/ });
  await waitFor(() => expect(document.activeElement).toBe(retry));
  expect(onUpload).not.toHaveBeenCalled();
  read.mockRestore();
  fireEvent.click(retry);
  await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
  expect(onUpload.mock.calls[0][0].name).toBe("original.pdf");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.activeElement?.getAttribute("aria-label")).toMatch(/(Upload|Replace) file for/);
});

it("keeps the previous attachment when replacement storage fails and allows retry", async () => {
  const project = sampleProject();
  const step = project.roadmap.steps.find((item) => item.documents.length)!;
  project.documents = [{ id: "kept", stepId: step.id, requirementId: step.documents[0].id, name: "keep-original.pdf", mimeType: "application/pdf", size: 20, uploadedAt: "2026-10-24T10:00:00Z", verified: false }];
  const onUpload = vi.fn().mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
  render(React.createElement(DocumentVault, { project, onUpload, onRemove: vi.fn() }));
  fireEvent.change(screen.getAllByLabelText(/Choose a file for/)[0], { target: { files: [new File([new Uint8Array(450 * 1024)], "replacement.pdf", { type: "application/pdf" })] } });
  const retry = await screen.findByRole("button", { name: /Retry attachment for/ });
  expect(screen.getByRole("button", { name: "Remove keep-original.pdf" })).toBeTruthy();
  expect(document.activeElement).toBe(retry);
  fireEvent.click(retry);
  await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));
  expect(onUpload.mock.calls[1][0].name).toBe("replacement.pdf");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("uses the latest upload callback after a file read spans a parent update", async () => {
  const project = sampleProject();
  const readers: FileReader[] = [];
  vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) { readers.push(this); });
  const previousUpload = vi.fn();
  const currentUpload = vi.fn();
  const view = render(React.createElement(DocumentVault, { project, onUpload: previousUpload, onRemove: vi.fn() }));
  fireEvent.change(screen.getAllByLabelText(/Choose a file for/)[0], { target: { files: [new File(["pdf"], "pending.pdf", { type: "application/pdf" })] } });
  view.rerender(React.createElement(DocumentVault, { project: { ...project }, onUpload: currentUpload, onRemove: vi.fn() }));
  await act(async () => {
    const reader = readers[0];
    Object.defineProperty(reader, "result", { value: "data:application/pdf;base64,AA==" });
    reader.dispatchEvent(new ProgressEvent("load"));
  });
  expect(previousUpload).not.toHaveBeenCalled();
  expect(currentUpload).toHaveBeenCalledTimes(1);
  expect(currentUpload.mock.calls[0][0].name).toBe("pending.pdf");
});

it("undoes removal using the original attachment including its saved preview", async () => {
  const project = sampleProject();
  const step = project.roadmap.steps.find((item) => item.documents.length)!;
  const original: UploadedDocument = { id: "restore-original", stepId: step.id, requirementId: step.documents[0].id, name: "floor-plan.pdf", mimeType: "application/pdf", size: 12, uploadedAt: "2026-10-24T10:00:00Z", verified: false, dataUrl: "data:application/pdf;base64,AA==" };
  function Harness() {
    const [documents, setDocuments] = useState([original]);
    return React.createElement(DocumentVault, { project: { ...project, documents }, onRemove: (id: string) => setDocuments((docs) => docs.filter((doc) => doc.id !== id)), onUpload: (doc: UploadedDocument) => setDocuments((docs) => [...docs, doc]) });
  }
  render(React.createElement(Harness));
  fireEvent.click(screen.getByRole("button", { name: "Remove floor-plan.pdf" }));
  const undo = screen.getByRole("button", { name: "Undo removal of floor-plan.pdf" });
  expect(screen.queryByRole("button", { name: "Remove floor-plan.pdf" })).toBeNull();
  fireEvent.click(undo);
  expect(screen.getByRole("button", { name: "Remove floor-plan.pdf" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Undo removal of floor-plan.pdf" })).toBeNull();
  expect(screen.getAllByRole("status").some((node) => node.textContent === "floor-plan.pdf restored.")).toBe(true);
});

it("leads fees with the calculated estimate before long itemized details", () => {
  const project = sampleProject();
  render(React.createElement(FeeSummary, { fees: project.fees, config: project.config }));
  const total = screen.getByText("Estimated total");
  const detail = screen.getAllByText("Base departmental fees")[0];
  expect(total.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(Number(total.nextElementSibling?.textContent?.replace(/[^\d.]/g, ""))).toBeCloseTo(project.fees.total, 2);
});

it("jumps to the next unchecked inspection requirement without changing its completion", () => {
  const items = sampleProject().inspections.map((item, index) => ({ ...item, completed: index === 0 }));
  const onToggle = vi.fn();
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  render(React.createElement(InspectionChecklists, { items, onToggle }));
  fireEvent.click(screen.getByRole("button", { name: /Continue checklist/ }));
  expect(document.activeElement?.getAttribute("type")).toBe("checkbox");
  expect((document.activeElement as HTMLInputElement).checked).toBe(false);
  expect(scroll).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
  expect(document.activeElement?.getAttribute("aria-describedby")).toContain("criteria");
});
