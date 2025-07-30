import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Database, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableData {
  [key: string]: any;
}

const SimpleTableViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableTables] = useState([
    'patients',
    'lab_results', 
    'lab_tests',
    'document_processing_logs',
    'profiles',
    'heart_metrics',
    'sleep_metrics',
    'activity_metrics',
    'nutrition_metrics'
  ]);

  const loadTableData = async (tableName: string) => {
    if (!tableName) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(50)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTableData(data || []);
      
      toast.success(`Loaded ${data?.length || 0} records from ${tableName}`);
    } catch (error) {
      toast.error(`Failed to load data from ${tableName}`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable]);

  const renderTableData = () => {
    if (!selectedTable) {
      return (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a table to view its data</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No data found in {selectedTable}</p>
        </div>
      );
    }

    const columns = Object.keys(tableData[0]);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{selectedTable} - {tableData.length} records</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadTableData(selectedTable)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="min-w-32 font-medium">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="max-w-xs truncate font-mono text-xs">
                      {row[column] !== null && row[column] !== undefined 
                        ? String(row[column]).substring(0, 100)
                        : <span className="text-muted-foreground italic">null</span>
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Quick Table Viewer
        </CardTitle>
        <CardDescription>
          Select a table to quickly view its contents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a table..." />
            </SelectTrigger>
            <SelectContent>
              {availableTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {renderTableData()}
      </CardContent>
    </Card>
  );
};

export default SimpleTableViewer;