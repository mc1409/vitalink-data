-- Create a secure function to execute SELECT queries only
CREATE OR REPLACE FUNCTION execute_sql(query_text TEXT)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    query_lower TEXT;
BEGIN
    -- Convert query to lowercase for checking
    query_lower := LOWER(TRIM(query_text));
    
    -- Only allow SELECT statements for security
    IF NOT query_lower LIKE 'select%' THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed for security reasons';
    END IF;
    
    -- Prevent potentially dangerous operations
    IF query_lower LIKE '%drop%' OR 
       query_lower LIKE '%delete%' OR 
       query_lower LIKE '%update%' OR 
       query_lower LIKE '%insert%' OR 
       query_lower LIKE '%alter%' OR 
       query_lower LIKE '%create%' OR 
       query_lower LIKE '%truncate%' THEN
        RAISE EXCEPTION 'Query contains potentially unsafe operations';
    END IF;
    
    -- Execute the query and return as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    
    -- Return empty array if no results
    IF result IS NULL THEN
        result := '[]'::JSON;
    END IF;
    
    RETURN result;
END;
$$;