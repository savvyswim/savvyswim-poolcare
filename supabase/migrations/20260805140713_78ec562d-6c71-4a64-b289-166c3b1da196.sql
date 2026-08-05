ALTER TABLE public.ss_project_files
  ADD COLUMN IF NOT EXISTS doc_folder text NOT NULL DEFAULT 'media';

CREATE INDEX IF NOT EXISTS ss_project_files_doc_folder_idx
  ON public.ss_project_files (project_id, doc_folder);