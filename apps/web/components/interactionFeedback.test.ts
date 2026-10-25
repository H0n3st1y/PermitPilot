// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { A11yControls } from "@/components/a11y/A11yControls";
import IntakePage from "@/app/intake/page";
import LoginPage from "@/app/login/page";
import { sampleProject } from "@/lib/store";
import { translate } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), push: vi.fn(), setLocale: vi.fn(), workspace: vi.fn(), saveProject: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/layout/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/a11y", () => ({ useA11y: () => ({ plainLanguage: false, highContrast: false, locale: "en", setLocale: mocks.setLocale, t: (key: string) => translate("en", key) }) }));
vi.mock("@/lib/supabase", () => ({
  getCurrentUser: () => null, getSupabaseClient: () => null,
  getAccountAuthMode: () => "development", ACCOUNT_UNAVAILABLE_MESSAGE: "Account sign-in is not available on this installation yet.",
  useAuth: () => ({ user: null }), signInWithEmail: mocks.signIn, signUpWithEmail: vi.fn(), signInAsDemoJudge: vi.fn(),
}));
vi.mock("@/lib/store", async (original) => ({ ...await original<typeof import("@/lib/store")>(), workspaceAfterAuth: mocks.workspace, saveProject: mocks.saveProject }));

beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("document attachment feedback", () => {
  it("reports invalid files inline with a recovery action and preserves the checklist", () => {
    const project = sampleProject();
    const onUpload = vi.fn();
    render(React.createElement(DocumentVault, { project, onUpload, onRemove: vi.fn() }));
    const input = screen.getAllByLabelText(/Choose a file for/)[0];
    fireEvent.change(input, { target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("alert").textContent).toContain("Choose a PDF");
    expect(onUpload).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute("aria-label")).toMatch(/(Upload|Replace) file for/);
  });

  it("reports read failures and allows retrying without uploading a broken file", async () => {
    const onUpload = vi.fn();
    const read = vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      this.dispatchEvent(new ProgressEvent("error"));
    });
    render(React.createElement(DocumentVault, { project: sampleProject(), onUpload, onRemove: vi.fn() }));
    fireEvent.change(screen.getAllByLabelText(/Choose a file for/)[0], { target: { files: [new File(["pdf"], "plan.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Try choosing it again"));
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /Upload file for/ })[0].hasAttribute("disabled")).toBe(false);
    read.mockRestore();
  });

  it("makes large-file metadata limits explicit and does not claim verification", async () => {
    const onUpload = vi.fn();
    render(React.createElement(DocumentVault, { project: sampleProject(), onUpload, onRemove: vi.fn() }));
    fireEvent.change(screen.getAllByLabelText(/Choose a file for/)[0], { target: { files: [new File([new Uint8Array(450 * 1024)], "plan.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(onUpload.mock.calls[0][0].verified).toBe(false);
    expect(onUpload.mock.calls[0][0].dataUrl).toBeUndefined();
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("Only file details were saved"))).toBe(true);
  });
});

describe("authentication submission", () => {
  it("blocks duplicate requests while pending and presents recoverable network errors", async () => {
    let reject!: (reason: Error) => void;
    mocks.signIn.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    render(React.createElement(LoginPage));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    const form = screen.getByRole("tabpanel");
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Opening");
    await act(async () => { reject(new Error("Network")); });
    expect(screen.getByRole("alert").textContent).toContain("try again");
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled")).toBe(false);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("lets keyboard users switch sign-in tabs", () => {
    render(React.createElement(LoginPage));
    const signIn = screen.getByRole("tab", { name: "Sign in" }); signIn.focus();
    fireEvent.keyDown(signIn, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Create account" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByLabelText("Your name")).toBeTruthy();
  });
});

describe("language picker keyboard support", () => {
  it("focuses the selected language, supports arrows and closes with Escape", () => {
    render(React.createElement(A11yControls));
    const trigger = screen.getByRole("button", { name: /language/i });
    fireEvent.click(trigger);
    expect(document.activeElement?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("aria-selected")).toBe("false");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("project intake feedback", () => {
  it("moves focus through steps, reports missing choices and creates only one roadmap", async () => {
    const { container } = render(React.createElement(IntakePage));
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    expect(document.activeElement).toBe(screen.getByRole("alert"));
    fireEvent.click(screen.getByRole("button", { name: /Restaurant A sit-down/ }));
    fireEvent.submit(form);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
    expect(screen.getByLabelText(/square feet/i)).toBeTruthy();
    fireEvent.submit(form);
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: "New restaurant" } });
    fireEvent.submit(form); fireEvent.submit(form);
    expect(screen.getByRole("status").textContent).toContain("Building and saving");
    await waitFor(() => expect(mocks.saveProject).toHaveBeenCalledTimes(1));
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("permitpilot:draft")).toBeNull();
  });
});
