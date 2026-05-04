-- Create the locations table with campus support
CREATE TABLE IF NOT EXISTS locations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    campus TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists, run this:
-- ALTER TABLE locations ADD COLUMN campus TEXT DEFAULT 'Sud';
-- UPDATE locations SET campus = 'Sud' WHERE campus IS NULL;
-- ALTER TABLE locations ALTER COLUMN campus SET NOT NULL;
