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
      name: "Patient Data",
      query: "SELECT * FROM patients LIMIT 10;"
    },
    {
      name: "Lab Results",
      query: "SELECT result_name, numeric_value, units, abnormal_flag FROM lab_results LIMIT 10;"
    },
    {
      name: "Document Processing Logs",
      query: "SELECT filename, processing_status, ai_analysis_status, created_at FROM document_processing_logs ORDER BY created_at DESC LIMIT 10;"
    },
    {
      name: "Recent Activity Metrics",
      query: `SELECT 
  measurement_date, 
  device_type, 
  steps_count, 
  total_calories 
FROM activity_metrics 
ORDER BY measurement_date DESC 
LIMIT 5;`
    },
    {
      name: "Heart Metrics Summary",
      query: `SELECT 
  measurement_timestamp, 
  resting_heart_rate, 
  average_heart_rate, 
  max_heart_rate 
FROM heart_metrics 
ORDER BY measurement_timestamp DESC 
LIMIT 10;`
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