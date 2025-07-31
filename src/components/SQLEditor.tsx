import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play, Database } from 'lucide-react';
import { toast } from 'sonner';

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
      query: "SELECT * FROM lab_results LIMIT 10;"
    },
    {
      name: "Document Processing Logs",
      query: "SELECT filename, processing_status, ai_analysis_status, created_at FROM document_processing_logs ORDER BY created_at DESC LIMIT 10;"
    },
    {
      name: "Recent Activity",
      query: `SELECT 
  'Document' as type, 
  filename as name, 
  processing_status as status, 
  created_at 
FROM document_processing_logs 
ORDER BY created_at DESC 
LIMIT 5;`
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
      // For now, show a message that custom SQL execution requires the migration
      setResult({
        data: null,
        error: "SQL query execution requires the database migration to be approved and executed first. Please approve the migration above to enable this feature.",
        rowCount: 0,
        executionTime: Date.now() - startTime
      });
      toast.error("Migration required for SQL execution");
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
            Execute SQL queries to explore your data. Use SELECT statements only for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Predefined Queries */}
          <div>
            <h4 className="text-sm font-medium mb-2">Quick Queries:</h4>
            <div className="flex flex-wrap gap-2">
              {predefinedQueries.map((pq, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPredefinedQuery(pq.query)}
                >
                  {pq.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Query Input */}
          <div>
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