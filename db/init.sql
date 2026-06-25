CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  picture TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  journey_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in-progress',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, journey_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  journey_id VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  content BYTEA,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_title VARCHAR(500) NOT NULL,
  company VARCHAR(255) NOT NULL,
  job_url TEXT,
  seniority VARCHAR(50),
  location VARCHAR(255),
  work_mode VARCHAR(50),
  industry VARCHAR(255),
  labels TEXT[],
  additional_info TEXT,
  analysis JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'Applied',
  match_pct INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidature_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_id UUID NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  stage_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  entered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  target_role VARCHAR(255),
  seniority VARCHAR(50),
  industry VARCHAR(255),
  location VARCHAR(255),
  work_mode VARCHAR(50),
  salary VARCHAR(255),
  preferred_companies TEXT,
  cv_text TEXT,
  cv_filename VARCHAR(255),
  cv_file BYTEA,
  cv_file_type VARCHAR(100),
  linkedin_url VARCHAR(500),
  cv_analysis JSONB,
  linkedin_analysis JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
