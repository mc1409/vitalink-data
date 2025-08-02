import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play, Database, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface QueryResult {
  data: any[] | null;
  error: string | null;
  rowCount: number;
  executionTime: number;
}

const SQLEditor: React.FC = () => {
  const [query, setQuery] = useState('SELECT * FROM profiles LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const predefinedQueries = [
    {
      name: "View All Tables",
      query: `SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;`
    },
    {
      name: "All Patients",
      query: "SELECT first_name, last_name, date_of_birth, gender, email FROM patients ORDER BY created_at DESC LIMIT 20;"
    },
    {
      name: "All Lab Test Results",
      query: `SELECT 
  p.first_name, p.last_name,
  test_name, test_category,
  numeric_value, result_value,
  measurement_time
FROM clinical_diagnostic_lab_tests l
JOIN patients p ON l.patient_id = p.id
ORDER BY measurement_time DESC 
LIMIT 50;`
    },
    {
      name: "All Biomarker Data Overview",
      query: `(SELECT 
  'Activity' as type, patient_id, measurement_time, 
  CONCAT(steps_count, ' steps, ', total_calories, ' cal') as summary
FROM biomarker_activity
ORDER BY measurement_time DESC LIMIT 50)
UNION ALL
(SELECT 
  'Heart' as type, patient_id, measurement_time,
  CONCAT(resting_heart_rate, ' bpm rest, ', average_heart_rate, ' bpm avg') as summary
FROM biomarker_heart
ORDER BY measurement_time DESC LIMIT 50)
UNION ALL
(SELECT 
  'Sleep' as type, patient_id, measurement_time,
  CONCAT(total_sleep_time, ' min sleep, ', sleep_score, ' score') as summary
FROM biomarker_sleep
ORDER BY measurement_time DESC LIMIT 50)
ORDER BY measurement_time DESC 
LIMIT 100;`
    },
    {
      name: "Sleep Data - Last 10 Days",
      query: `SELECT 
  p.first_name, p.last_name,
  sleep_date,
  total_sleep_time,
  deep_sleep_minutes,
  rem_sleep_minutes,
  sleep_score,
  sleep_efficiency
FROM biomarker_sleep s
JOIN patients p ON s.patient_id = p.id
WHERE sleep_date >= CURRENT_DATE - INTERVAL '10 days'
ORDER BY sleep_date DESC, p.last_name;`
    },
    {
      name: "Activity Summary - Last 7 Days",
      query: `SELECT 
  p.first_name, p.last_name,
  measurement_date,
  steps_count,
  total_calories,
  active_calories,
  distance_walked_meters
FROM biomarker_activity a
JOIN patients p ON a.patient_id = p.id
WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY measurement_date DESC, steps_count DESC;`
    },
    {
      name: "Heart Rate Trends",
      query: `SELECT 
  p.first_name, p.last_name,
  DATE(measurement_time) as date,
  AVG(resting_heart_rate) as avg_resting_hr,
  AVG(average_heart_rate) as avg_hr,
  MAX(max_heart_rate) as max_hr,
  COUNT(*) as readings
FROM biomarker_heart h
JOIN patients p ON h.patient_id = p.id
WHERE measurement_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.first_name, p.last_name, DATE(measurement_time)
ORDER BY date DESC;`
    },
    {
      name: "Clinical Test Summary by Patient",
      query: `SELECT 
  p.first_name, p.last_name,
  COUNT(DISTINCT test_category) as test_categories,
  COUNT(*) as total_tests,
  MAX(measurement_time) as latest_test,
  MIN(measurement_time) as earliest_test
FROM clinical_diagnostic_lab_tests l
JOIN patients p ON l.patient_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY total_tests DESC;`
    },
    {
      name: "Complete Patient Health Profile",
      query: `SELECT 
  p.first_name, p.last_name, p.date_of_birth,
  -- Latest biomarker data
  (SELECT steps_count FROM biomarker_activity WHERE patient_id = p.id ORDER BY measurement_time DESC LIMIT 1) as latest_steps,
  (SELECT resting_heart_rate FROM biomarker_heart WHERE patient_id = p.id ORDER BY measurement_time DESC LIMIT 1) as latest_resting_hr,
  (SELECT total_sleep_time FROM biomarker_sleep WHERE patient_id = p.id ORDER BY measurement_time DESC LIMIT 1) as latest_sleep_time,
  -- Test counts
  (SELECT COUNT(*) FROM clinical_diagnostic_lab_tests WHERE patient_id = p.id) as total_lab_tests,
  -- Latest activity
  GREATEST(
    COALESCE((SELECT MAX(measurement_time) FROM biomarker_activity WHERE patient_id = p.id), '1900-01-01'::timestamp),
    COALESCE((SELECT MAX(measurement_time) FROM biomarker_heart WHERE patient_id = p.id), '1900-01-01'::timestamp),
    COALESCE((SELECT MAX(measurement_time) FROM biomarker_sleep WHERE patient_id = p.id), '1900-01-01'::timestamp),
    COALESCE((SELECT MAX(measurement_time) FROM clinical_diagnostic_lab_tests WHERE patient_id = p.id), '1900-01-01'::timestamp)
  ) as latest_data
FROM patients p
ORDER BY latest_data DESC;`
    }
  ];

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    // Basic safety check - only allow SELECT statements
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      toast.error("Only SELECT queries are allowed for security reasons");
      setResult({
        data: null,
        error: "Only SELECT queries are allowed for security reasons",
        rowCount: 0,
        executionTime: 0
      });
      return;
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Execute SQL query using our secure RPC function
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        setResult({
          data: null,
          error: error.message,
          rowCount: 0,
          executionTime
        });
        toast.error(error.message);
      } else {
        // The RPC function returns JSON, parse it to get the array
        const resultData = Array.isArray(data) ? data : (data ? [data] : []);
        setResult({
          data: resultData,
          error: null,
          rowCount: resultData.length,
          executionTime
        });
        toast.success(`Returned ${resultData.length} rows in ${executionTime}ms`);
      }
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      setResult({
        data: null,
        error: errorMessage,
        rowCount: 0,
        executionTime
      });
      
      toast.error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadPredefinedQuery = (predefinedQuery: string) => {
    setQuery(predefinedQuery);
  };

  const generateSQLFromText = async () => {
    if (!naturalLanguageQuery.trim()) {
      toast.error("Please enter what data you're looking for");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-sql', {
        body: { prompt: naturalLanguageQuery }
      });

      if (error) {
        toast.error(`Failed to generate SQL: ${error.message}`);
        return;
      }

      if (data?.sql) {
        setQuery(data.sql);
        toast.success("SQL query generated! Review and execute when ready.");
      } else {
        toast.error("Failed to generate SQL query");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <div className="text-muted-foreground text-center py-4">No data returned</div>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="border rounded-lg overflow-auto max-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="font-medium">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column} className="max-w-xs truncate">
                    {row[column] !== null && row[column] !== undefined 
                      ? String(row[column]) 
                      : <span className="text-muted-foreground italic">null</span>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            SQL Query Editor
          </CardTitle>
          <CardDescription>
            Execute SQL queries to explore your data. Only SELECT statements are allowed for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Predefined Queries */}
          <div>
            <h4 className="text-sm font-medium mb-2">Quick Queries:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {predefinedQueries.map((pq, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPredefinedQuery(pq.query)}
                  className="text-left justify-start h-auto py-2"
                >
                  {pq.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Natural Language Query */}
          <div>
            <label className="text-sm font-medium mb-2 block">Or describe what data you want:</label>
            <div className="flex gap-2">
              <Input
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                placeholder="e.g., 'Show me all patients with heart rate above 100'"
                className="flex-1"
              />
              <Button 
                onClick={generateSQLFromText}
                disabled={isGenerating || !naturalLanguageQuery.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate SQL'}
              </Button>
            </div>
          </div>

          {/* Query Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">SQL Query:</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              className="min-h-32 font-mono text-sm"
            />
          </div>

          {/* Execute Button */}
          <Button 
            onClick={executeQuery} 
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-2"
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isExecuting ? 'Executing...' : 'Execute Query'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              {result.error 
                ? `Error in ${result.executionTime}ms`
                : `${result.rowCount} rows returned in ${result.executionTime}ms`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <Alert variant="destructive">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              renderTable(result.data || [])
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SQLEditor;