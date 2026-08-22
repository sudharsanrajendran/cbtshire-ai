# Supabase setup

## 1. Create a project

Create a Supabase project at https://supabase.com/dashboard.

## 2. Create the resume bucket

In **Storage**, create a bucket named `hireai` and keep it private.

## 3. Copy backend values

From **Project Settings > API**, copy the Project URL and the `service_role` key. Put them only in `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=hireai
```

Never put the service-role key in React or commit it to git.

## 4. Use Supabase Postgres instead of local SQLite

From **Project Settings > Database**, copy the connection string and set it in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

For a deployed backend, use Supabase's pooled connection string if direct port 5432 is unavailable.

## 5. Restart

```powershell
py -m uvicorn app.main:app --app-dir backend --reload
```

Resume uploads now go to Supabase Storage and return a temporary signed URL. No resume file is written to the local filesystem.
