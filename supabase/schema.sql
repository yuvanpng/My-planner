-- My Planner Database Schema v2

-- Schedule entries (hourly time slots per day)
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  activity TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule_entries(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_date_time ON schedule_entries(date, time_slot);

-- Schedule slot completion (checkboxes per hour)
CREATE TABLE IF NOT EXISTS schedule_done (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_done_unique ON schedule_done(date, time_slot);

-- Schedule activity history (for autocomplete hints)
CREATE TABLE IF NOT EXISTS schedule_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- To-do items (personal & academic)
CREATE TABLE IF NOT EXISTS todo_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('personal', 'academic')),
  deadline DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_todo_date ON todo_items(date);
CREATE INDEX IF NOT EXISTS idx_todo_category ON todo_items(category);
CREATE INDEX IF NOT EXISTS idx_todo_deadline ON todo_items(deadline);

-- Daily habit definitions
CREATE TABLE IF NOT EXISTS daily_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily habit completion logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES daily_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_log_unique ON habit_logs(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_log_date ON habit_logs(date);

-- Daily goal definitions (4 categories)
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('physical', 'technical', 'mental', 'consume')),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily goal completion logs
CREATE TABLE IF NOT EXISTS goal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES daily_goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goal_log_unique ON goal_logs(goal_id, date);
CREATE INDEX IF NOT EXISTS idx_goal_log_date ON goal_logs(date);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  mood TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date);

-- Academic projects
CREATE TABLE IF NOT EXISTS academic_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  next_meeting DATE,
  meeting_notes TEXT DEFAULT '',
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  semester TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly/Monthly goals
CREATE TABLE IF NOT EXISTS weekly_monthly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_type ON weekly_monthly_goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_dates ON weekly_monthly_goals(start_date, end_date);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  event_time TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Off-days / holidays
CREATE TABLE IF NOT EXISTS off_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  label TEXT DEFAULT 'Holiday',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_off_days_date ON off_days(date);

-- Disable RLS for single-user app (no auth)
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE off_days ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon (single-user, no auth)
CREATE POLICY "Allow all for anon" ON schedule_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON schedule_done FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON schedule_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON todo_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON daily_habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON habit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON daily_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON goal_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON academic_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON weekly_monthly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON off_days FOR ALL USING (true) WITH CHECK (true);
