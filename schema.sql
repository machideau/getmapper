-- Create the locations table
CREATE TABLE IF NOT EXISTS locations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Optional: Disable if you want public access for testing
-- ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public Access" ON locations FOR ALL USING (true);
