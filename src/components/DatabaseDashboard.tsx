import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, RefreshCw, Eye, Search, FileText, Activity, Heart, Beaker } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  count: number;
  category: string;
  description: string;
  icon: React.ElementType;
}

interface TableData {
  [key: string]: any;
}

const DatabaseDashboard = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tableCategories = {
    'Medical Records': {
      tables: ['patients', 'lab_tests', 'lab_results', 'imaging_studies', 'cardiovascular_tests', 'allergies'],
      icon: Heart,
      color: 'text-primary'
    },
    'Biomarker Data': {
      tables: ['activity_metrics', 'heart_metrics', 'sleep_metrics', 'nutrition_metrics', 'microbiome_metrics', 'recovery_strain_metrics', 'environmental_metrics'],
      icon: Activity,
      color: 'text-accent'
    },
    'System': {
      tables: ['profiles', 'device_integrations', 'document_processing_logs'],
      icon: Database,
      color: 'text-info'
    }
  };

  const getTableInfo = async () => {
    console.log('Database refresh - User:', user?.email, 'checking tables...');
    if (!user) {
      toast.error('Please log in to view database');
      return;
    }
    setRefreshing(true);
    try {
      const tableInfos: TableInfo[] = [];
      
      for (const [category, info] of Object.entries(tableCategories)) {
        for (const tableName of info.tables) {
          try {
            const { count, error } = await supabase
              .from(tableName as any)
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              tableInfos.push({
                name: tableName,
                count: count || 0,
                category,
                description: getTableDescription(tableName),
                icon: info.icon
              });
            }
          } catch (err) {
            console.log(`Table ${tableName} might not exist yet`);
          }
        }
      }
      
      setTables(tableInfos);
    } catch (error) {
      toast.error('Failed to fetch table information');
    } finally {
      setRefreshing(false);
    }
  };

  const getTableDescription = (tableName: string): string => {
    const descriptions: { [key: string]: string } = {
      'patients': 'Patient demographics and contact information',
      'lab_tests': 'Laboratory test orders and metadata',
      'lab_results': 'Individual lab test results and values',
      'imaging_studies': 'Medical imaging studies and reports',
      'cardiovascular_tests': 'ECG, stress tests, and cardiac evaluations',
      'allergies': 'Patient allergy information and reactions',
      'activity_metrics': 'Physical activity and fitness data',
      'heart_metrics': 'Heart rate, HRV, and cardiovascular data',
      'sleep_metrics': 'Sleep tracking and quality metrics',
      'nutrition_metrics': 'Nutritional intake and dietary data',
      'microbiome_metrics': 'Gut health and microbiome analysis',
      'recovery_strain_metrics': 'Recovery scores and strain data',
      'environmental_metrics': 'Environmental exposure and conditions',
      'profiles': 'User profile information',
      'device_integrations': 'Connected device configurations',
      'document_processing_logs': 'PDF upload and processing history'
    };
    return descriptions[tableName] || 'Database table';
  };

  const viewTableData = async (tableName: string) => {
    setLoading(true);
    setSelectedTable(tableName);
    
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(50)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTableData(data || []);
    } catch (error) {
      toast.error(`Failed to fetch data from ${tableName}`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTableInfo();
  }, []);

  const renderTablesByCategory = (category: string) => {
    const categoryTables = tables.filter(table => table.category === category);
    const categoryInfo = tableCategories[category as keyof typeof tableCategories];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <categoryInfo.icon className={`h-5 w-5 ${categoryInfo.color}`} />
          <h3 className="text-lg font-semibold">{category}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryTables.map((table) => (
            <Card key={table.name} className="shadow-card-custom hover:shadow-medical transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <table.icon className={`h-4 w-4 ${categoryInfo.color}`} />
                    <CardTitle className="text-sm">{table.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {table.count} rows
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-3">
                  {table.description}
                </CardDescription>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewTableData(table.name)}
                  className="w-full gap-2"
                  disabled={table.count === 0}
                >
                  <Eye className="h-3 w-3" />
                  {table.count === 0 ? 'No Data' : 'View Data'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderTableData = () => {
    if (!selectedTable || tableData.length === 0) {
      return (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {selectedTable ? 'No data found in this table' : 'Select a table to view its data'}
          </p>
        </div>
      );
    }

    const columns = Object.keys(tableData[0]);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{selectedTable} Data</h3>
          <Badge variant="outline">{tableData.length} records shown</Badge>
        </div>
        
        <ScrollArea className="h-96 w-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="min-w-32">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="font-mono text-xs">
                      {row[column] ? String(row[column]).substring(0, 100) : 'null'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-2 rounded-lg shadow-medical">
            <Database className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Database Dashboard</h2>
            <p className="text-muted-foreground">View and manage your health data tables</p>
          </div>
        </div>
        
        <Button
          onClick={getTableInfo}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(tableCategories).map(([category, info]) => {
          const categoryTables = tables.filter(table => table.category === category);
          const totalRecords = categoryTables.reduce((sum, table) => sum + table.count, 0);
          
          return (
            <Card key={category} className="shadow-medical">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <info.icon className={`h-5 w-5 ${info.color}`} />
                  <CardTitle className="text-lg">{category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">
                  {categoryTables.length} tables
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical Records</TabsTrigger>
          <TabsTrigger value="biomarkers">Biomarker Data</TabsTrigger>
          <TabsTrigger value="system">System Tables</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle>Database Overview</CardTitle>
              <CardDescription>
                Your health data platform contains {tables.length} tables with{' '}
                {tables.reduce((sum, table) => sum + table.count, 0).toLocaleString()} total records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTableData()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          {renderTablesByCategory('Medical Records')}
          {selectedTable && (
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle>Table Data</CardTitle>
                <CardDescription>
                  Viewing data from the selected table
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading table data...</p>
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="biomarkers" className="space-y-6">
          {renderTablesByCategory('Biomarker Data')}
          {selectedTable && (
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle>Table Data</CardTitle>
                <CardDescription>
                  Viewing data from the selected table
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading table data...</p>
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {renderTablesByCategory('System')}
          {selectedTable && (
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle>Table Data</CardTitle>
                <CardDescription>
                  Viewing data from the selected table
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading table data...</p>
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseDashboard;