from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.rule_engine import evaluate
from app.schemas import ApiResponse, Project, ProjectIntake, Source, StatusUpdate
from app.timeline_engine import generate, recalculate

DATA = Path(__file__).parent / "data"
MAX_UPLOAD = 10 * 1024 * 1024
ALLOWED = {"application/pdf", "image/png", "image/jpeg", "image/webp"}
projects: dict[UUID, Project] = {}
status_history: dict[str, list[dict]] = {}
documents: dict[str, list[dict]] = {}

app = FastAPI(title="PermitPilot API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])


def ok(data):
    return ApiResponse(data=data)


@app.get("/health")
def health():
    return ok({"status": "healthy", "demo_mode": True})


@app.get("/api/v1/municipality")
def municipality():
    return ok(json.loads((DATA / "municipality.json").read_text()))


@app.get("/api/v1/project-types")
def project_types():
    return ok(["food_business", "room_addition", "residential_renovation", "commercial_renovation", "public_event"])


@app.post("/api/v1/projects")
def create_project(intake: ProjectIntake):
    result = evaluate(intake)
    project = Project(intake=intake, requirements=result.requirements, traces=result.traces, warnings=result.warnings)
    project.milestones = generate(project.requirements, intake.desired_start_date)
    projects[project.id] = project
    return ok(project)


@app.get("/api/v1/projects")
def list_projects():
    return ok(list(projects.values()))


def find_project(project_id: UUID) -> Project:
    if project_id not in projects:
        raise HTTPException(404, "Project not found")
    return projects[project_id]


@app.get("/api/v1/projects/{project_id}")
def get_project(project_id: UUID):
    return ok(find_project(project_id))


@app.delete("/api/v1/projects/{project_id}")
def delete_project(project_id: UUID):
    find_project(project_id)
    del projects[project_id]
    documents.pop(str(project_id), None)
    return ok({"deleted": True})


@app.post("/api/v1/projects/{project_id}/evaluate")
def evaluate_project(project_id: UUID):
    project = find_project(project_id)
    result = evaluate(project.intake)
    project.requirements, project.traces, project.warnings = result.requirements, result.traces, result.warnings
    project.milestones = generate(result.requirements, project.intake.desired_start_date)
    return ok(result)


@app.get("/api/v1/projects/{project_id}/roadmap")
@app.get("/api/v1/projects/{project_id}/timeline")
def roadmap(project_id: UUID):
    return ok(find_project(project_id).milestones)


@app.post("/api/v1/projects/{project_id}/timeline/recalculate")
def recalculate_timeline(project_id: UUID):
    project = find_project(project_id)
    project.milestones = recalculate(project.milestones)
    return ok(project.milestones)


@app.patch("/api/v1/milestones/{milestone_id}/status")
def update_status(milestone_id: str, update: StatusUpdate):
    for project in projects.values():
        milestone = next((m for m in project.milestones if m.id == milestone_id), None)
        if milestone:
            previous = milestone.status
            milestone.status = update.status
            event = {"timestamp": datetime.now(UTC).isoformat(), "actor": "demo-user", "previous_status": previous, "new_status": update.status, "note": update.note}
            status_history.setdefault(milestone_id, []).append(event)
            project.milestones = recalculate(project.milestones, milestone_id)
            project.updated_at = datetime.now(UTC)
            return ok({"milestone": milestone, "event": event, "timeline": project.milestones})
    raise HTTPException(404, "Milestone not found")


@app.get("/api/v1/milestones/{milestone_id}/history")
def history(milestone_id: str):
    return ok(status_history.get(milestone_id, []))


@app.get("/api/v1/sources/{source_id}")
def source(source_id: str):
    sources = [Source.model_validate(s) for s in json.loads((DATA / "sources.json").read_text())]
    found = next((s for s in sources if s.id == source_id), None)
    if not found:
        raise HTTPException(404, "Source not found")
    return ok(found)


@app.post("/api/v1/projects/{project_id}/documents")
async def upload_document(project_id: UUID, file: UploadFile = File(...)):
    find_project(project_id)
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise HTTPException(413, "File exceeds the 10 MB limit")
    if file.content_type not in ALLOWED:
        raise HTTPException(415, "Unsupported file type")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(file.filename or "document").name)
    record = {"id": f"doc-{len(documents.get(str(project_id), []))+1}", "name": safe_name, "content_type": file.content_type, "size": len(content), "status": "uploaded", "private": True, "malware_scan_status": "not_implemented"}
    documents.setdefault(str(project_id), []).append(record)
    return ok(record)


@app.get("/api/v1/projects/{project_id}/documents")
def list_documents(project_id: UUID):
    find_project(project_id)
    return ok(documents.get(str(project_id), []))


@app.post("/api/v1/search")
def search(payload: dict):
    query = str(payload.get("query", "")).lower().strip()
    sources = json.loads((DATA / "sources.json").read_text())
    matches = [s for s in sources if query and query in (s["title"] + " " + s["department"]).lower()]
    return ok({"results": matches, "sufficient_evidence": False, "message": "PermitPilot could not find enough verified municipal information to answer this question confidently. Contact the listed department before taking action."})


@app.get("/api/v1/notifications")
def notifications_list():
    return ok([{"id":"demo-reminder","type":"follow_up_recommended","title":"Review your next action","read":False,"delivery":"in_app"}])
