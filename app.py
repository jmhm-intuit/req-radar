from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
SAMPLE_DIR = BASE_DIR / "sample"
DEFAULT_DATA_DIR = BASE_DIR / "data"
DATA_DIR = Path(os.environ.get("REQ_RADAR_DATA_DIR", str(DEFAULT_DATA_DIR))).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
TEMP_DIR = DATA_DIR / "temp"
DB_PATH = DATA_DIR / "req_radar.db"
SAMPLE_PDF = SAMPLE_DIR / "sample-job.pdf"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
VALID_STATUSES = {"NEW", "PURSUING", "MAYBE", "NOT_PURSUING", "APPLIED"}

for directory in (DATA_DIR, UPLOAD_DIR, TEMP_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ReqRadar", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


SKILL_PATTERNS: dict[str, tuple[str, ...]] = {
    "Strategic planning": ("strategic planning", "annual planning", "long-term goals"),
    "Strategy and operations": ("strategy & operations", "strategy and operations", "business operations"),
    "Operating model design": ("operating model", "how we work as an organization"),
    "Operational excellence": ("operational excellence", "operations results"),
    "Process improvement": ("process improvement", "improve our processes", "improve quarterly performance"),
    "Data-driven analysis": ("data-driven analysis", "data driven analysis", "analytics"),
    "Financial modeling": ("financial models", "financial modeling"),
    "Analytical modeling": ("analytical models", "analytical modeling"),
    "Business acumen": ("business acumen",),
    "Financial acumen": ("financial acumen",),
    "Executive communication": ("senior executives", "executive leadership", "executive communication"),
    "Stakeholder management": ("stakeholder interests", "stakeholder management", "senior stakeholders"),
    "Cross-functional leadership": ("cross-functional", "cross functional"),
    "Influencing without authority": ("influence stakeholders", "influencing stakeholders"),
    "Change management": ("change management", "plans for change"),
    "KPI management": ("kpis", "operational metric", "goals / kpis"),
    "Decision framing": ("frame decisions", "drive decision-making", "decision making"),
    "Program management": ("program management", "critical initiatives"),
    "People leadership": ("people agenda", "people leadership", "team & culture"),
    "Customer success": ("customer success",),
    "Mid-market": ("mid-market", "mid market"),
    "Management consulting": ("management consulting",),
    "Finance": ("finance",),
    "SQL": (" sql ", "sql,"),
    "Python": ("python",),
    "Java": ("java",),
    "JavaScript": ("javascript",),
    "TypeScript": ("typescript",),
    "React": ("react",),
    "Node.js": ("node.js", "nodejs"),
    "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",),
    "Google Cloud": ("google cloud", "gcp"),
    "Machine learning": ("machine learning",),
    "Artificial intelligence": ("artificial intelligence", " ai "),
    "Product management": ("product management", "product manager"),
    "Product strategy": ("product strategy",),
    "Agile delivery": ("agile", "scrum"),
    "Sales operations": ("sales operations",),
    "Marketing operations": ("marketing operations",),
    "Talent acquisition": ("talent acquisition", "recruiting"),
    "Risk management": ("risk management",),
    "Payments": ("payments", "payment processing"),
    "SaaS": ("saas", "software as a service"),
    "REST APIs": ("rest api", "restful api"),
    "Microservices": ("microservices", "micro-services"),
    "Distributed systems": ("distributed systems",),
    "Data visualization": ("data visualization", "tableau", "power bi"),
    "Excel": ("excel",),
    "Tableau": ("tableau",),
    "Power BI": ("power bi",),
}

TITLE_STOPWORDS = {
    "a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with",
    "intuit", "role", "position", "job", "opening", "remote", "hybrid",
}

GENERIC_LINES = {
    "internal career site", "search", "apply now", "give feedback", "job overview",
    "responsibilities", "qualifications", "footer", "related content", "mobility move",
}

DEMO_JOBS = [
    {
        "job_id": "DEMO-1001",
        "title": "Principal, Strategy and Operations, Mid-Market",
        "category": "Program Management & Business Operations",
        "team": "Mid-Market Growth (Demo)",
        "locations": ["Mountain View, California", "San Diego, California"],
        "hiring_manager": "Demo Hiring Manager",
        "recruiter": "Demo Recruiter",
        "date_posted": "Jul 10, 2026",
        "seniority": "Principal",
        "experience": "8+ years",
        "summary": "Lead strategic planning and operating model improvements for a mid-market growth organization.",
        "responsibilities": [
            "Lead annual planning and translate strategy into measurable outcomes.",
            "Partner with senior leaders across functions to improve operating rhythms.",
            "Use data and financial analysis to prioritize growth initiatives.",
        ],
        "qualifications": [
            "8+ years in strategy and operations, consulting, finance, or analytics.",
            "Strong executive communication and stakeholder influence.",
        ],
        "skills": [
            "Strategic planning", "Strategy and operations", "Operating model design",
            "Data-driven analysis", "Financial modeling", "Executive communication",
            "Stakeholder management", "Mid-market",
        ],
        "decision_status": "MAYBE",
    },
    {
        "job_id": "DEMO-1002",
        "title": "Senior Manager, Business Operations, Customer Success",
        "category": "Program Management & Business Operations",
        "team": "Customer Success Operations (Demo)",
        "locations": ["San Diego, California"],
        "hiring_manager": "Demo Hiring Manager 2",
        "recruiter": "Demo Recruiter",
        "date_posted": "Jul 18, 2026",
        "seniority": "Senior Manager",
        "experience": "7+ years",
        "summary": "Drive operating cadence, KPI reviews, and cross-functional programs for Customer Success.",
        "responsibilities": [
            "Build durable operating rhythms and lead quarterly business reviews.",
            "Monitor strategic priorities and customer success KPIs.",
            "Lead change management across a complex stakeholder group.",
        ],
        "qualifications": [
            "Experience in business operations, program management, and analytics.",
            "Strong written communication and executive presence.",
        ],
        "skills": [
            "Customer success", "Operational excellence", "KPI management",
            "Program management", "Change management", "Cross-functional leadership",
            "Executive communication",
        ],
        "decision_status": "PURSUING",
    },
    {
        "job_id": "DEMO-1003",
        "title": "Principal Program Manager, Customer Experience",
        "category": "Program Management",
        "team": "Customer Experience (Demo)",
        "locations": ["Mountain View, California"],
        "hiring_manager": "Demo Hiring Manager 3",
        "recruiter": "Demo Recruiter",
        "date_posted": "Jul 20, 2026",
        "seniority": "Principal",
        "experience": "8+ years",
        "summary": "Lead complex cross-functional programs that improve customer experience and business performance.",
        "responsibilities": [
            "Lead critical programs with senior stakeholders.",
            "Frame decisions, manage risks, and communicate program outcomes.",
        ],
        "qualifications": [
            "8+ years of program management experience in a complex organization.",
            "Ability to influence at all levels and operate in ambiguity.",
        ],
        "skills": [
            "Program management", "Decision framing", "Stakeholder management",
            "Cross-functional leadership", "Executive communication", "Customer success",
        ],
        "decision_status": "NOT_PURSUING",
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                job_id TEXT,
                title TEXT NOT NULL,
                normalized_title TEXT,
                category TEXT,
                team TEXT,
                locations TEXT,
                hiring_manager TEXT,
                recruiter TEXT,
                date_posted TEXT,
                seniority TEXT,
                experience TEXT,
                summary TEXT,
                responsibilities TEXT,
                qualifications TEXT,
                skills TEXT,
                raw_text TEXT,
                filename TEXT,
                file_hash TEXT,
                file_path TEXT,
                decision_status TEXT NOT NULL DEFAULT 'NEW',
                decision_reason TEXT,
                notes TEXT,
                is_demo INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_job_id_unique
                ON jobs(job_id)
                WHERE job_id IS NOT NULL AND TRIM(job_id) <> '';
            CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_file_hash_unique
                ON jobs(file_hash)
                WHERE file_hash IS NOT NULL AND TRIM(file_hash) <> '';
            """
        )


init_db()


def json_load(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_job(row: sqlite3.Row, include_text: bool = False) -> dict[str, Any]:
    job = {
        "id": row["id"],
        "job_id": row["job_id"] or "",
        "title": row["title"],
        "normalized_title": row["normalized_title"] or row["title"],
        "category": row["category"] or "",
        "team": row["team"] or "",
        "locations": json_load(row["locations"], []),
        "hiring_manager": row["hiring_manager"] or "",
        "recruiter": row["recruiter"] or "",
        "date_posted": row["date_posted"] or "",
        "seniority": row["seniority"] or "",
        "experience": row["experience"] or "",
        "summary": row["summary"] or "",
        "responsibilities": json_load(row["responsibilities"], []),
        "qualifications": json_load(row["qualifications"], []),
        "skills": json_load(row["skills"], []),
        "filename": row["filename"] or "",
        "file_hash": row["file_hash"] or "",
        "has_source": bool(row["file_path"]),
        "decision_status": row["decision_status"],
        "decision_reason": row["decision_reason"] or "",
        "notes": row["notes"] or "",
        "is_demo": bool(row["is_demo"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
    if include_text:
        job["raw_text"] = row["raw_text"] or ""
    return job


def clean_value(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"\s+", " ", value).strip(" \t\r\n:-")
    return value


def find_labeled_value(text: str, label: str) -> str:
    pattern = rf"(?im)^\s*{re.escape(label)}\s*:\s*(.+?)\s*$"
    match = re.search(pattern, text)
    return clean_value(match.group(1)) if match else ""


def remove_noise(text: str) -> str:
    replacements = {
        "\u00a0": " ",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\ufb00": "ff",
        "\ufb03": "ffi",
        "\ufb04": "ffl",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines: list[str] = []
    cookie_prefixes = (
        "we use cookies", "to manage your preferences", "accept", "manage settings",
        "intuit cookie policy", "legal privacy security", "view all of our available",
        "sitemap", "jobs for you", "you haven't viewed", "related jobs saved jobs",
        "activities and to provide content from third parties", "to the use of cookies",
    )
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            lines.append("")
            continue
        lower = line.lower()
        if any(lower.startswith(prefix) for prefix in cookie_prefixes):
            continue
        if lower in {"give feedback", "search", "apply now", "internal career site", "manage settings", "accept"}:
            continue
        if lower.startswith(("search", "apply now", "internal career site")):
            continue
        lines.append(line)
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def extract_pdf_text(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        text = "\n".join(pages)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read this PDF: {exc}") from exc
    if len(text.strip()) < 40:
        raise HTTPException(
            status_code=422,
            detail="The PDF does not contain enough selectable text. Paste the job description instead.",
        )
    return remove_noise(text)


def extract_text_from_upload(filename: str, data: bytes, content_type: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf") or "pdf" in content_type.lower():
        return extract_pdf_text(data)
    if lower_name.endswith((".txt", ".md")) or content_type.startswith("text/"):
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                return remove_noise(data.decode(encoding))
            except UnicodeDecodeError:
                continue
    raise HTTPException(status_code=415, detail="Supported formats are PDF, TXT, and pasted text.")


def section_text(text: str, start_heading: str, end_headings: tuple[str, ...]) -> str:
    start_match = re.search(rf"(?im)^\s*{re.escape(start_heading)}\s*$", text)
    if not start_match:
        return ""
    start = start_match.end()
    end = len(text)
    for heading in end_headings:
        match = re.search(rf"(?im)^\s*{re.escape(heading)}\s*$", text[start:])
        if match:
            end = min(end, start + match.start())
    return text[start:end].strip()


def split_section_items(section: str) -> list[str]:
    if not section:
        return []
    bullet_chars = "\u2022\u25cf\u25aa\u25e6\uf0b7\uf111\uf0a7"
    section = re.sub(f"[{bullet_chars}]", "\n<BULLET>\n", section)
    lines = [re.sub(r"\s+", " ", line).strip() for line in section.splitlines()]
    items: list[str] = []
    current: list[str] = []
    saw_bullet = False
    for line in lines:
        if not line:
            continue
        if line == "<BULLET>":
            saw_bullet = True
            if current:
                item = clean_value(" ".join(current))
                if item:
                    items.append(item)
                current = []
            continue
        lower = line.lower()
        if lower in GENERIC_LINES or lower.startswith("we use cookies"):
            continue
        current.append(line)
    if current:
        item = clean_value(" ".join(current))
        if item:
            items.append(item)
    if saw_bullet and len(items) > 1:
        return items[:15]

    compact = clean_value(section)
    if not compact:
        return []
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", compact)
    sentences = [clean_value(sentence) for sentence in sentences if len(clean_value(sentence)) >= 25]
    if len(sentences) > 1:
        return sentences[:15]
    return [compact[:1800]]


def infer_title(text: str, filename: str) -> str:
    lines = [clean_value(line) for line in text.splitlines() if clean_value(line)]
    category_index = next((i for i, line in enumerate(lines) if line.lower().startswith("category:")), None)
    if category_index is not None:
        for index in range(category_index - 1, -1, -1):
            candidate = lines[index]
            if candidate.lower() not in GENERIC_LINES and len(candidate) > 4:
                return candidate
    for line in lines[:20]:
        lower = line.lower()
        if lower in GENERIC_LINES or ":" in line or lower.startswith("we use cookies"):
            continue
        if 5 <= len(line) <= 180:
            return line
    stem = Path(filename).stem
    stem = re.sub(r"\s+at\s+intuit.*$", "", stem, flags=re.IGNORECASE)
    return clean_value(stem) or "Untitled requisition"


def normalize_title(title: str) -> str:
    value = title.strip()
    value = re.sub(r"\bSr\.?\b", "Senior", value, flags=re.IGNORECASE)
    value = re.sub(r"\bJr\.?\b", "Junior", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value)
    return value


def infer_seniority(title: str) -> str:
    lower = title.lower()
    levels = (
        ("vice president", "Vice President"),
        ("vp", "Vice President"),
        ("director", "Director"),
        ("principal", "Principal"),
        ("staff", "Staff"),
        ("senior manager", "Senior Manager"),
        ("sr manager", "Senior Manager"),
        ("senior", "Senior"),
        ("lead", "Lead"),
        ("manager", "Manager"),
        ("associate", "Associate"),
        ("junior", "Junior"),
        ("entry", "Entry"),
    )
    for needle, label in levels:
        if needle in lower:
            return label
    return ""


def infer_experience(text: str) -> str:
    patterns = (
        r"\b(\d{1,2}\+?\s*years?\s+of\s+experience)\b",
        r"\b(\d{1,2}\+?\s*years?)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return clean_value(match.group(1))
    return ""


def extract_skills(text: str) -> list[str]:
    haystack = f" {text.lower()} "
    skills: list[str] = []
    for skill, variants in SKILL_PATTERNS.items():
        if any(variant in haystack for variant in variants):
            skills.append(skill)
    return skills[:18]


def split_locations(value: str) -> list[str]:
    if not value:
        return []
    parts = re.split(r"\s*;\s*|\s*\|\s*", value)
    return [clean_value(part) for part in parts if clean_value(part)]


def parse_job_text(text: str, filename: str) -> dict[str, Any]:
    cleaned = remove_noise(text)
    title = infer_title(cleaned, filename)
    overview = section_text(cleaned, "Job Overview", ("Responsibilities", "Qualifications"))
    responsibilities_text = section_text(cleaned, "Responsibilities", ("Qualifications", "Footer"))
    qualifications_text = section_text(cleaned, "Qualifications", ("Footer", "Related Content"))
    responsibilities = split_section_items(responsibilities_text)
    qualifications = split_section_items(qualifications_text)
    searchable = "\n".join([title, overview, responsibilities_text, qualifications_text, cleaned])
    locations = split_locations(find_labeled_value(cleaned, "Location"))
    category = find_labeled_value(cleaned, "Category")
    return {
        "job_id": find_labeled_value(cleaned, "Job ID"),
        "title": title,
        "normalized_title": normalize_title(title),
        "category": category,
        "team": find_labeled_value(cleaned, "Team"),
        "locations": locations,
        "hiring_manager": find_labeled_value(cleaned, "Hiring Manager"),
        "recruiter": find_labeled_value(cleaned, "Recruiter"),
        "date_posted": find_labeled_value(cleaned, "Date Posted"),
        "seniority": infer_seniority(title),
        "experience": infer_experience(qualifications_text or cleaned),
        "summary": clean_value(overview)[:2200],
        "responsibilities": responsibilities,
        "qualifications": qualifications,
        "skills": extract_skills(searchable),
        "raw_text": cleaned,
    }


def normalized_tokens(value: str) -> set[str]:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9+.#]+", " ", value)
    tokens = {token for token in value.split() if len(token) > 1 and token not in TITLE_STOPWORDS}
    aliases = {
        "bizops": "operations",
        "ops": "operations",
        "cx": "customer",
        "cs": "customer",
        "mgr": "manager",
        "sr": "senior",
    }
    return {aliases.get(token, token) for token in tokens}


def jaccard(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 0.0
    union = left | right
    return len(left & right) / len(union) if union else 0.0


def text_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    token_score = jaccard(normalized_tokens(left), normalized_tokens(right))
    sequence_score = SequenceMatcher(None, left.lower(), right.lower()).ratio()
    return max(token_score, sequence_score * 0.85)


def list_similarity(left: list[str], right: list[str]) -> float:
    left_tokens = normalized_tokens(" ".join(left))
    right_tokens = normalized_tokens(" ".join(right))
    return jaccard(left_tokens, right_tokens)


def skill_similarity(left: list[str], right: list[str]) -> tuple[float, list[str]]:
    left_map = {skill.lower(): skill for skill in left}
    right_map = {skill.lower(): skill for skill in right}
    overlap_keys = sorted(set(left_map) & set(right_map))
    overlap = [left_map[key] for key in overlap_keys]
    if not left and not right:
        return 0.0, []
    score = jaccard(set(left_map), set(right_map))
    return score, overlap


def compact_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": job.get("id", ""),
        "job_id": job.get("job_id", ""),
        "title": job.get("title", "Untitled requisition"),
        "team": job.get("team", ""),
        "locations": job.get("locations", []),
        "decision_status": job.get("decision_status", "NEW"),
        "is_demo": bool(job.get("is_demo", False)),
    }


def compare_jobs(source: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    title_score = text_similarity(source.get("normalized_title") or source.get("title", ""), target.get("normalized_title") or target.get("title", ""))
    skills_score, overlap_skills = skill_similarity(source.get("skills", []), target.get("skills", []))
    category_score = text_similarity(source.get("category", ""), target.get("category", ""))
    team_score = text_similarity(source.get("team", ""), target.get("team", ""))
    location_score = list_similarity(source.get("locations", []), target.get("locations", []))
    manager_score = 1.0 if source.get("hiring_manager") and source.get("hiring_manager", "").lower() == target.get("hiring_manager", "").lower() else 0.0
    seniority_score = text_similarity(source.get("seniority", ""), target.get("seniority", ""))

    weighted = (
        0.32 * title_score
        + 0.34 * skills_score
        + 0.09 * category_score
        + 0.08 * team_score
        + 0.07 * location_score
        + 0.05 * manager_score
        + 0.05 * seniority_score
    )
    overall = int(round(weighted * 100))

    reasons: list[str] = []
    if overlap_skills:
        reasons.append(f"{len(overlap_skills)} shared skills")
    if title_score >= 0.72:
        reasons.append("closely related titles")
    if category_score >= 0.8 and source.get("category"):
        reasons.append("same job category")
    if location_score >= 0.5:
        reasons.append("overlapping location")
    if manager_score == 1.0:
        reasons.append("same hiring manager")
    if team_score >= 0.75 and source.get("team"):
        reasons.append("similar team")

    duplicate_type = "RELATED"
    if overall >= 88 and title_score >= 0.82 and (manager_score == 1.0 or team_score >= 0.8):
        duplicate_type = "POSSIBLE_DUPLICATE"
    elif overall >= 72:
        duplicate_type = "HIGHLY_SIMILAR"
    elif overall >= 50:
        duplicate_type = "RELATED"
    else:
        duplicate_type = "LOW"

    return {
        "job": compact_job(target),
        "overall": overall,
        "title_similarity": int(round(title_score * 100)),
        "skill_similarity": int(round(skills_score * 100)),
        "category_similarity": int(round(category_score * 100)),
        "location_similarity": int(round(location_score * 100)),
        "team_similarity": int(round(team_score * 100)),
        "overlap_skills": overlap_skills,
        "reasons": reasons[:4],
        "duplicate_type": duplicate_type,
    }


def get_all_jobs(include_text: bool = False) -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
    return [row_to_job(row, include_text=include_text) for row in rows]


def find_job(job_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return row_to_job(row, include_text=True) if row else None


def find_exact_duplicates(job_id: str, file_hash: str) -> list[dict[str, Any]]:
    clauses: list[str] = []
    values: list[str] = []
    if job_id:
        clauses.append("job_id = ?")
        values.append(job_id)
    if file_hash:
        clauses.append("file_hash = ?")
        values.append(file_hash)
    if not clauses:
        return []
    query = "SELECT * FROM jobs WHERE " + " OR ".join(clauses)
    with get_db() as conn:
        rows = conn.execute(query, values).fetchall()
    return [row_to_job(row) for row in rows]


def comparisons_for(source: dict[str, Any], candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    comparisons = [compare_jobs(source, candidate) for candidate in candidates if candidate.get("id") != source.get("id")]
    comparisons.sort(key=lambda item: item["overall"], reverse=True)
    return comparisons


def make_upload_token(filename: str, data: bytes) -> tuple[str, Path]:
    token = uuid.uuid4().hex
    suffix = Path(filename).suffix.lower()[:10] or ".bin"
    temp_path = TEMP_DIR / f"{token}{suffix}"
    temp_path.write_bytes(data)
    return token, temp_path


def analyze_payload(text: str, filename: str, file_hash: str, upload_token: str) -> dict[str, Any]:
    draft = parse_job_text(text, filename)
    draft.update({"filename": filename, "file_hash": file_hash, "upload_token": upload_token})
    existing = get_all_jobs()
    exact = find_exact_duplicates(draft.get("job_id", ""), file_hash)
    comparisons = comparisons_for(draft, existing)
    potential = [item for item in comparisons if item["duplicate_type"] == "POSSIBLE_DUPLICATE"]
    return {
        "draft": draft,
        "duplicate_check": {
            "exact": [compact_job(job) for job in exact],
            "potential": potential[:5],
            "similar": [item for item in comparisons if item["overall"] >= 50][:5],
        },
    }


def safe_suffix(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in {".pdf", ".txt", ".md"} else ".bin"


def insert_job(payload: dict[str, Any], is_demo: bool = False) -> dict[str, Any]:
    status = str(payload.get("decision_status", "NEW")).upper()
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid decision status.")

    job_id = clean_value(str(payload.get("job_id", "")))
    file_hash = clean_value(str(payload.get("file_hash", "")))
    exact = find_exact_duplicates(job_id, file_hash)
    if exact:
        raise HTTPException(
            status_code=409,
            detail={"message": "This requisition is already in the tracker.", "existing": compact_job(exact[0])},
        )

    record_id = uuid.uuid4().hex
    now = utc_now()
    upload_token = clean_value(str(payload.get("upload_token", "")))
    filename = clean_value(str(payload.get("filename", "")))
    file_path = ""
    if upload_token:
        matches = list(TEMP_DIR.glob(f"{upload_token}.*"))
        if matches:
            source_path = matches[0]
            target_path = UPLOAD_DIR / f"{record_id}{safe_suffix(filename or source_path.name)}"
            shutil.move(str(source_path), str(target_path))
            file_path = str(target_path)

    values = {
        "id": record_id,
        "job_id": job_id,
        "title": clean_value(str(payload.get("title", ""))) or "Untitled requisition",
        "normalized_title": clean_value(str(payload.get("normalized_title", ""))) or clean_value(str(payload.get("title", ""))),
        "category": clean_value(str(payload.get("category", ""))),
        "team": clean_value(str(payload.get("team", ""))),
        "locations": json.dumps(payload.get("locations", []) or []),
        "hiring_manager": clean_value(str(payload.get("hiring_manager", ""))),
        "recruiter": clean_value(str(payload.get("recruiter", ""))),
        "date_posted": clean_value(str(payload.get("date_posted", ""))),
        "seniority": clean_value(str(payload.get("seniority", ""))),
        "experience": clean_value(str(payload.get("experience", ""))),
        "summary": clean_value(str(payload.get("summary", ""))),
        "responsibilities": json.dumps(payload.get("responsibilities", []) or []),
        "qualifications": json.dumps(payload.get("qualifications", []) or []),
        "skills": json.dumps(payload.get("skills", []) or []),
        "raw_text": str(payload.get("raw_text", "")),
        "filename": filename,
        "file_hash": file_hash,
        "file_path": file_path,
        "decision_status": status,
        "decision_reason": clean_value(str(payload.get("decision_reason", ""))),
        "notes": clean_value(str(payload.get("notes", ""))),
        "is_demo": 1 if is_demo else 0,
        "created_at": now,
        "updated_at": now,
    }

    columns = ", ".join(values.keys())
    placeholders = ", ".join(["?"] * len(values))
    try:
        with get_db() as conn:
            conn.execute(f"INSERT INTO jobs ({columns}) VALUES ({placeholders})", tuple(values.values()))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="A requisition with this Job ID or file already exists.") from exc
    job = find_job(record_id)
    if not job:
        raise HTTPException(status_code=500, detail="The requisition could not be saved.")
    return job


def decorate_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for job in jobs:
        comparisons = comparisons_for(job, jobs)
        top = comparisons[0] if comparisons else None
        possible_count = len([item for item in comparisons if item["duplicate_type"] == "POSSIBLE_DUPLICATE"])
        similar_count = len([item for item in comparisons if item["overall"] >= 50])
        decorated = dict(job)
        decorated.update(
            {
                "top_match": top,
                "possible_duplicate_count": possible_count,
                "similar_count": similar_count,
            }
        )
        result.append(decorated)
    return result


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/sample-job.pdf")
def sample_job_pdf() -> FileResponse:
    if not SAMPLE_PDF.exists():
        raise HTTPException(status_code=404, detail="Sample file is not available.")
    return FileResponse(SAMPLE_PDF, filename="sample-job.pdf", media_type="application/pdf")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_upload(request: Request) -> dict[str, Any]:
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The file is larger than 15 MB.")
    filename = unquote(request.headers.get("x-filename", "job-upload.pdf"))
    content_type = request.headers.get("content-type", "application/octet-stream")
    text = extract_text_from_upload(filename, data, content_type)
    file_hash = hashlib.sha256(data).hexdigest()
    token, _ = make_upload_token(filename, data)
    return analyze_payload(text, filename, file_hash, token)


@app.post("/api/analyze-text")
async def analyze_text(request: Request) -> dict[str, Any]:
    payload = await request.json()
    text = str(payload.get("text", "")).strip()
    if len(text) < 40:
        raise HTTPException(status_code=422, detail="Paste a longer job description before analyzing it.")
    filename = clean_value(str(payload.get("filename", "pasted-job.txt"))) or "pasted-job.txt"
    data = text.encode("utf-8")
    file_hash = hashlib.sha256(data).hexdigest()
    token, _ = make_upload_token(filename, data)
    return analyze_payload(remove_noise(text), filename, file_hash, token)


@app.get("/api/jobs")
def list_jobs() -> dict[str, Any]:
    jobs = decorate_jobs(get_all_jobs())
    stats = {
        "total": len(jobs),
        "pursuing": len([job for job in jobs if job["decision_status"] == "PURSUING"]),
        "needs_decision": len([job for job in jobs if job["decision_status"] in {"NEW", "MAYBE"}]),
        "applied": len([job for job in jobs if job["decision_status"] == "APPLIED"]),
        "duplicate_alerts": sum(1 for job in jobs if job["possible_duplicate_count"] > 0),
    }
    return {"jobs": jobs, "stats": stats}


@app.get("/api/comparisons")
def list_comparisons() -> dict[str, Any]:
    jobs = get_all_jobs()
    pairs: list[dict[str, Any]] = []
    for left_index, source in enumerate(jobs):
        for target in jobs[left_index + 1:]:
            comparison = compare_jobs(source, target)
            if comparison["overall"] < 35:
                continue
            comparison["source"] = compact_job(source)
            pairs.append(comparison)
    pairs.sort(key=lambda item: item["overall"], reverse=True)
    return {"comparisons": pairs}


@app.get("/api/jobs/{record_id}")
def get_job(record_id: str) -> dict[str, Any]:
    job = find_job(record_id)
    if not job:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    comparisons = comparisons_for(job, get_all_jobs())
    return {"job": job, "comparisons": comparisons[:12]}


@app.post("/api/jobs", status_code=201)
async def create_job(request: Request) -> dict[str, Any]:
    payload = await request.json()
    return {"job": insert_job(payload)}


@app.patch("/api/jobs/{record_id}")
async def update_job(record_id: str, request: Request) -> dict[str, Any]:
    payload = await request.json()
    job = find_job(record_id)
    if not job:
        raise HTTPException(status_code=404, detail="Requisition not found.")

    updates: dict[str, Any] = {}
    if "decision_status" in payload:
        status = str(payload["decision_status"]).upper()
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="Invalid decision status.")
        updates["decision_status"] = status
    for field in ("decision_reason", "notes"):
        if field in payload:
            updates[field] = clean_value(str(payload[field]))
    if not updates:
        return {"job": job}
    updates["updated_at"] = utc_now()
    assignment = ", ".join(f"{field} = ?" for field in updates)
    with get_db() as conn:
        conn.execute(f"UPDATE jobs SET {assignment} WHERE id = ?", (*updates.values(), record_id))
    return {"job": find_job(record_id)}


@app.delete("/api/jobs/{record_id}", status_code=204)
def delete_job(record_id: str) -> Response:
    job = find_job(record_id)
    if not job:
        raise HTTPException(status_code=404, detail="Requisition not found.")
    with get_db() as conn:
        row = conn.execute("SELECT file_path FROM jobs WHERE id = ?", (record_id,)).fetchone()
        conn.execute("DELETE FROM jobs WHERE id = ?", (record_id,))
    if row and row["file_path"]:
        Path(row["file_path"]).unlink(missing_ok=True)
    return Response(status_code=204)


@app.get("/api/jobs/{record_id}/source")
def job_source(record_id: str) -> FileResponse:
    with get_db() as conn:
        row = conn.execute("SELECT filename, file_path FROM jobs WHERE id = ?", (record_id,)).fetchone()
    if not row or not row["file_path"]:
        raise HTTPException(status_code=404, detail="The original source file is not available.")
    path = Path(row["file_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="The original source file is missing.")
    media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "text/plain"
    return FileResponse(path, filename=row["filename"] or path.name, media_type=media_type)


@app.post("/api/demo")
def load_demo_data() -> dict[str, Any]:
    created = 0
    for demo in DEMO_JOBS:
        with get_db() as conn:
            exists = conn.execute("SELECT 1 FROM jobs WHERE job_id = ?", (demo["job_id"],)).fetchone()
        if exists:
            continue
        payload = dict(demo)
        payload.update(
            {
                "normalized_title": normalize_title(demo["title"]),
                "raw_text": "Demo requisition created by ReqRadar.",
                "filename": "",
                "file_hash": "",
                "upload_token": "",
                "decision_reason": "",
                "notes": "Demo data. Replace or delete before real use.",
            }
        )
        insert_job(payload, is_demo=True)
        created += 1
    return {"created": created}


@app.delete("/api/demo")
def clear_demo_data() -> dict[str, Any]:
    with get_db() as conn:
        demo_rows = conn.execute("SELECT id, file_path FROM jobs WHERE is_demo = 1").fetchall()
        conn.execute("DELETE FROM jobs WHERE is_demo = 1")
    for row in demo_rows:
        if row["file_path"]:
            Path(row["file_path"]).unlink(missing_ok=True)
    return {"deleted": len(demo_rows)}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("REQ_RADAR_HOST", "127.0.0.1")
    port = int(os.environ.get("REQ_RADAR_PORT", "8000"))
    uvicorn.run("app:app", host=host, port=port, reload=False)
