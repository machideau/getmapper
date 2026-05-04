-- Create the locations table with campus support
CREATE TABLE IF NOT EXISTS locations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    campus TEXT NOT NULL,
    type TEXT DEFAULT 'Autre',
    description TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- To update existing table:
-- ALTER TABLE locations ADD COLUMN type TEXT DEFAULT 'Autre';
-- ALTER TABLE locations ADD COLUMN campus TEXT DEFAULT 'Sud';
-- ALTER TABLE locations ADD COLUMN description TEXT;
