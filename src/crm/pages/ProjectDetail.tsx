import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, Check, Download, FileText, FileVideo, Image as ImageIcon, Loader2, Plus, Trash2,
  Upload, UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricing";
import { PROJECT_STATUS, statusMeta, type Project } from "@/crm/pages/Projects";


type Stage = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  status: string;
  notes: string | null;
  completed_at: string | null;
};

type ProjectFile = {
  id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  storage_path: string;
  media_type: string;
  doc_folder: string;
  size_bytes: number | null;
  created_at: string;
};

type StageTask = {
  id: string;
  project_id: string;
  stage_id: string;
  kind: string;
  label: string;
  doc_folder: string | null;
  is_required: boolean;
  is_done: boolean;
  sort_order: number;
};


const BUCKET = "pool-designs";

const DOC_FOLDERS: { key: string; label: string; hint: string }[] = [
  { key: "permits", label: "Permits", hint: "City permits, applications, approvals" },
  { key: "plans", label: "Plans & engineering", hint: "Blueprints, structural, soil reports" },
  { key: "contracts", label: "Contracts", hint: "Signed agreements & change orders" },
  { key: "inspections", label: "Inspections", hint: "Inspection reports & sign-offs" },
  { key: "insurance", label: "Insurance & licenses", hint: "COIs, bonds, sub licenses" },
  { key: "invoices", label: "Invoices & receipts", hint: "Vendor bills, material receipts" },
  { key: "warranties", label: "Warranties & manuals", hint: "Equipment warranties, manuals" },
  { key: "hoa", label: "HOA & utilities", hint: "HOA approvals, utility locates" },
  { key: "other", label: "Other documents", hint: "Anything else worth keeping" },
];

function docKey(active: string) {
  return active.startsWith("doc:") ? active.slice(4) : null;
}

function prettySize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<{ id: string; full_name: string } | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [tasks, setTasks] = useState<StageTask[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | "all">("all");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p, error }, { data: st }, { data: fl }, { data: tk }] = await Promise.all([
      supabase.from("ss_projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("ss_project_stages").select("*").eq("project_id", id).order("sort_order"),
      supabase.from("ss_project_files").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("ss_project_stage_tasks").select("*").eq("project_id", id).order("sort_order"),
    ]);
    if (error) toast.error(error.message);
    setProject((p ?? null) as Project | null);
    setStages((st ?? []) as Stage[]);
    setTasks((tk ?? []) as StageTask[]);
    const list = (fl ?? []) as ProjectFile[];
    setFiles(list);

    if (p?.customer_id) {
      const { data: c } = await supabase.from("ss_customers").select("id, full_name").eq("id", p.customer_id).maybeSingle();
      setCustomer(c ?? null);
    } else setCustomer(null);

    if (list.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(list.map((f) => f.storage_path), 60 * 60);
      const map: Record<string, string> = {};
      signed?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
      setUrls(map);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const done = stages.filter((s) => s.status === "complete").length;
  const pct = stages.length ? Math.round((done / stages.length) * 100) : 0;

  const isSatisfied = useCallback(
    (t: StageTask) =>
      t.is_done ||
      (t.kind === "document" && !!t.doc_folder && files.some((f) => f.doc_folder === t.doc_folder)),
    [files],
  );

  const stageChecks = useCallback(
    (stageId: string) => {
      const list = tasks.filter((t) => t.stage_id === stageId);
      const missing = list.filter((t) => t.is_required && !isSatisfied(t));
      return { list, missing, ok: list.length - missing.length, total: list.length };
    },
    [tasks, isSatisfied],
  );

  const missingAll = useMemo(
    () => tasks.filter((t) => t.is_required && !isSatisfied(t)),
    [tasks, isSatisfied],
  );
  const missingDocs = missingAll.filter((t) => t.kind === "document");


  const visibleFiles = useMemo(() => {
    if (activeStage === "all") return files;
    const dk = docKey(activeStage);
    if (dk) return files.filter((f) => f.doc_folder === dk);
    return files.filter((f) => f.stage_id === activeStage && f.doc_folder === "media");
  }, [files, activeStage]);

  async function upload(fileList: FileList | null, stageId: string | null, folder = "media") {
    if (!fileList?.length || !id) return;
    setUploadingTo(stageId ?? folder);
    for (const file of Array.from(fileList)) {
      const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `projects/${id}/${stageId ?? folder}/${Date.now()}-${clean}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) { toast.error(upErr.message); continue; }
      const { error: rowErr } = await supabase.from("ss_project_files").insert({
        project_id: id,
        stage_id: stageId,
        title: file.name,
        storage_path: path,
        doc_folder: folder,
        media_type: file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "document",
        size_bytes: file.size,
      });
      if (rowErr) toast.error(rowErr.message);
    }
    setUploadingTo(null);
    toast.success(folder === "media" ? "Media added to the project file" : "Document filed");
    void load();
  }


  async function removeFile(f: ProjectFile) {
    await supabase.storage.from(BUCKET).remove([f.storage_path]);
    const { error } = await supabase.from("ss_project_files").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    void load();
  }

  async function download(f: ProjectFile) {
    const url = urls[f.storage_path];
    if (!url) return toast.error("Preparing link — try again in a second");
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = f.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function downloadAll() {
    for (const f of visibleFiles) {
      // eslint-disable-next-line no-await-in-loop
      await download(f);
    }
  }

  async function toggleStage(s: Stage) {
    const next = s.status === "complete" ? "pending" : "complete";
    const { error } = await supabase
      .from("ss_project_stages")
      .update({ status: next, completed_at: next === "complete" ? new Date().toISOString() : null })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    setStages((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
  }

  async function addStage() {
    const name = window.prompt("Stage name");
    if (!name || !id) return;
    const { error } = await supabase.from("ss_project_stages").insert({
      project_id: id, name, sort_order: (stages.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    void load();
  }

  async function setStatus(status: string) {
    if (!id) return;
    const { error } = await supabase.from("ss_projects").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setProject((p) => (p ? { ...p, status } : p));
  }

  async function removeProject() {
    if (!id || !window.confirm("Delete this project file and all of its media records?")) return;
    const { error } = await supabase.from("ss_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Project file deleted");
    nav("/admin/crm/projects");
  }

  if (loading) return <EmptyState>Opening project file…</EmptyState>;
  if (!project) return <EmptyState>That project file no longer exists.</EmptyState>;

  const st = statusMeta(project.status);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/crm/projects" className="ss-btn ss-btn-ghost !no-underline">
          <ArrowLeft size={14} /> All project files
        </Link>
        <Link to="/admin/crm" className="ss-btn ss-btn-ghost !no-underline">Back to CRM</Link>
        {customer && (
          <Link to={`/admin/crm/customers/${customer.id}`} className="ss-btn ss-btn-ghost !no-underline">
            <UserRound size={14} /> {customer.full_name}
          </Link>
        )}
      </div>

      <SectionTitle
        title={project.title}
        sub={[
          project.kind === "remodel" ? "Remodel" : "New pool build",
          [project.address, project.city].filter(Boolean).join(", "),
          project.budget_low && project.budget_high
            ? `${money(project.budget_low)}–${money(project.budget_high)}`
            : "",
        ].filter(Boolean).join(" · ")}
        right={<Chip tone={st.tone}>{st.label}</Chip>}
      />

      <div className="ss-card p-4">
        <div className="flex items-center justify-between">
          <div className="ss-label">Build progress</div>
          <div className="ss-num text-[0.8rem] opacity-70">{done}/{stages.length} stages · {pct}%</div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "hsl(var(--ss-burgundy))" }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROJECT_STATUS.map((s) => (
            <button
              key={s.key}
              className={`ss-btn ${project.status === s.key ? "" : "ss-btn-ghost"}`}
              onClick={() => void setStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Stage folders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="ss-tag">Stage folders</div>
            <button className="ss-btn ss-btn-ghost" onClick={() => void addStage()}><Plus size={13} /> Stage</button>
          </div>

          <button
            className="ss-card w-full p-3 text-left"
            style={{ outline: activeStage === "all" ? "2px solid hsl(var(--ss-burgundy))" : undefined }}
            onClick={() => setActiveStage("all")}
          >
            <div className="text-[0.86rem] font-semibold">All media</div>
            <div className="text-[0.72rem] opacity-60">{files.length} files in this project</div>
          </button>

          {stages.map((s) => {
            const count = files.filter((f) => f.stage_id === s.id && f.doc_folder === "media").length;
            const complete = s.status === "complete";
            return (
              <div
                key={s.id}
                className="ss-card p-3"
                style={{ outline: activeStage === s.id ? "2px solid hsl(var(--ss-burgundy))" : undefined }}
              >
                <div className="flex items-start gap-2">
                  <button
                    aria-label="Toggle stage complete"
                    onClick={() => void toggleStage(s)}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border"
                    style={{
                      borderColor: "hsl(var(--ss-burgundy) / .4)",
                      background: complete ? "hsl(var(--ss-burgundy))" : "transparent",
                      color: "#fff",
                    }}
                  >
                    {complete && <Check size={13} />}
                  </button>
                  <button className="flex-1 text-left" onClick={() => setActiveStage(s.id)}>
                    <div className="text-[0.86rem] font-semibold" style={{ textDecoration: complete ? "line-through" : undefined }}>
                      {s.sort_order}. {s.name}
                    </div>
                    <div className="text-[0.72rem] opacity-60">{count} file{count === 1 ? "" : "s"}</div>
                  </button>
                  <UploadButton
                    busy={uploadingTo === s.id}
                    onFiles={(fl) => void upload(fl, s.id)}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-3">
            <div className="ss-tag">Document vault</div>
            <p className="mt-1 text-[0.72rem] opacity-60">
              Permits, contracts, inspections, warranties — every paper for this job in one place.
            </p>
          </div>

          {DOC_FOLDERS.map((d) => {
            const count = files.filter((f) => f.doc_folder === d.key).length;
            const key = `doc:${d.key}`;
            return (
              <div
                key={d.key}
                className="ss-card p-3"
                style={{ outline: activeStage === key ? "2px solid hsl(var(--ss-burgundy))" : undefined }}
              >
                <div className="flex items-start gap-2">
                  <FileText size={15} className="mt-0.5 shrink-0 opacity-50" />
                  <button className="flex-1 text-left" onClick={() => setActiveStage(key)}>
                    <div className="text-[0.86rem] font-semibold">{d.label}</div>
                    <div className="text-[0.72rem] opacity-60">
                      {count} file{count === 1 ? "" : "s"} · {d.hint}
                    </div>
                  </button>
                  <UploadButton
                    busy={uploadingTo === d.key}
                    onFiles={(fl) => void upload(fl, null, d.key)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Media */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="ss-tag">
              {activeStage === "all"
                ? "All files"
                : docKey(activeStage)
                  ? DOC_FOLDERS.find((d) => d.key === docKey(activeStage))?.label
                  : stages.find((s) => s.id === activeStage)?.name}
            </div>
            <div className="flex gap-2">
              <UploadButton
                label="Upload"
                busy={uploadingTo === (activeStage === "all" ? "media" : docKey(activeStage) ?? activeStage)}
                onFiles={(fl) =>
                  void upload(
                    fl,
                    activeStage === "all" || docKey(activeStage) ? null : activeStage,
                    docKey(activeStage) ?? "media",
                  )
                }
              />
              {visibleFiles.length > 0 && (
                <button className="ss-btn ss-btn-ghost" onClick={() => void downloadAll()}>
                  <Download size={14} /> Download all
                </button>
              )}
            </div>
          </div>


          {!visibleFiles.length ? (
            <EmptyState>
              {docKey(activeStage)
                ? "No documents filed here yet. Upload PDFs, scans or photos of permits and paperwork — they stay with this project forever."
                : "Nothing here yet. Upload photos, plans or walkthrough videos for this stage — customers and crews see the same file."}
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleFiles.map((f) => {
                const url = urls[f.storage_path];
                return (
                  <div key={f.id} className="ss-card overflow-hidden">
                    {url && f.media_type === "video" ? (
                      <video src={url} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" />
                    ) : url && f.media_type === "image" ? (
                      <img src={url} alt={f.title} loading="lazy" className="aspect-[3/2] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[3/2] w-full items-center justify-center" style={{ background: "hsl(var(--ss-sand) / .5)" }}>
                        {f.media_type === "video"
                          ? <FileVideo size={22} className="opacity-50" />
                          : f.media_type === "document"
                            ? <FileText size={22} className="opacity-50" />
                            : <ImageIcon size={22} className="opacity-50" />}
                      </div>
                    )}
                    <div className="p-3">
                      <div className="truncate text-[0.82rem] font-medium">{f.title}</div>
                      <div className="text-[0.7rem] opacity-60">
                        {new Date(f.created_at).toLocaleDateString()} · {prettySize(f.size_bytes)}
                        {f.doc_folder !== "media"
                          ? ` · ${DOC_FOLDERS.find((d) => d.key === f.doc_folder)?.label ?? f.doc_folder}`
                          : f.stage_id ? ` · ${stages.find((s) => s.id === f.stage_id)?.name ?? ""}` : ""}
                      </div>

                      <div className="mt-2 flex gap-1.5">
                        <button className="ss-btn ss-btn-ghost flex-1" onClick={() => void download(f)}>
                          <Download size={13} /> Download
                        </button>
                        <button className="ss-btn ss-btn-ghost" aria-label="Delete file" onClick={() => void removeFile(f)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {project.notes && (
        <div className="ss-card p-4">
          <div className="ss-label mb-1">Project notes</div>
          <p className="text-[0.85rem] whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      <button className="ss-btn ss-btn-ghost" onClick={() => void removeProject()}>
        <Trash2 size={13} /> Delete project file
      </button>
    </div>
  );
}

function UploadButton({
  onFiles,
  busy,
  label,
}: {
  onFiles: (files: FileList | null) => void;
  busy?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.heic,.zip"
        className="hidden"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
      <button
        className="ss-btn ss-btn-ghost"
        disabled={busy}
        aria-label="Upload media"
        onClick={() => ref.current?.click()}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {label ? ` ${label}` : ""}
      </button>
    </>
  );
}
