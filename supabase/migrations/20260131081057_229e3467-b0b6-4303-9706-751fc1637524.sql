-- Grant usage on reco_audit schema to authenticated users
-- This is needed for the get_top_recommendations_v13 function to work
GRANT USAGE ON SCHEMA reco_audit TO authenticated;

-- Grant SELECT on any tables in reco_audit schema that the function reads from
GRANT SELECT ON ALL TABLES IN SCHEMA reco_audit TO authenticated;

-- Grant INSERT on any tables the function writes to (for logging recommendations)
GRANT INSERT ON ALL TABLES IN SCHEMA reco_audit TO authenticated;

-- Ensure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA reco_audit GRANT SELECT, INSERT ON TABLES TO authenticated;