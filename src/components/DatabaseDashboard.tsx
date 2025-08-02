import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, RefreshCw, Eye, Heart, Activity, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  count: number;
  category: string;
  description: string;
}

interface TableData {
  [key: string]: any;
}

const DatabaseDashboard = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tableCategories = {
    'Core User Management': {
      tables: ['profiles', 'patients'],
      icon: Heart,
      color: 'text-blue-600'
    },
    'Biomarker Data': {
      tables: ['biomarker_heart', 'biomarker_sleep', 'biomarker_activity', 'biomarker_nutrition', 'biomarker_biological_genetic_microbiome'],
      icon: Activity,
      color: 'text-green-600'
    },
    'Clinical Diagnostics': {
      tables: ['clinical_diagnostic_lab_tests', 'clinical_diagnostic_cardiovascular'],
      icon: Brain,
      color: 'text-red-600'
    },
    'System Management': {
      tables: ['device_integrations', 'document_processing_logs', 'test_standardization_map'],
      icon: Database,
      color: 'text-gray-600'
    }
  };

  const getTableInfo = async () => {
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
                description: getTableDescription(tableName)
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
      'profiles': 'User account and basic profile information',
      'patients': 'Individual health records linked to user profiles',
      'biomarker_heart': 'Heart rate, HRV, and cardiovascular biomarkers',
      'biomarker_sleep': 'Sleep tracking data from devices and apps',
      'biomarker_activity': 'Physical activity, steps, and exercise data',
      'biomarker_nutrition': 'Dietary intake and nutritional measurements',
      'biomarker_biological_genetic_microbiome': 'Microbiome, genetic markers, and recovery metrics',
      'clinical_diagnostic_lab_tests': 'Laboratory tests, results, and allergy records',
      'clinical_diagnostic_cardiovascular': 'Heart-related diagnostic tests (ECG, stress tests)',
      'device_integrations': 'Connected health device configurations',
      'document_processing_logs': 'Uploaded medical document processing history',
      'test_standardization_map': 'Mapping of test names to standardized nomenclature'
    };
    return descriptions[tableName] || 'Health data table';
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
    const IconComponent = categoryInfo.icon;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <IconComponent className={`h-5 w-5 ${categoryInfo.color}`} />
          <h3 className="text-lg font-semibold">{category}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryTables.map((table) => (
            <Card key={table.name} className="transition-all duration-200 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${categoryInfo.color}`} />
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
          <div className="bg-primary p-2 rounded-lg">
            <Database className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Database Dashboard</h2>
            <p className="text-muted-foreground">View and manage your patient-centric health data</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(tableCategories).map(([category, info]) => {
          const categoryTables = tables.filter(table => table.category === category);
          const totalRecords = categoryTables.reduce((sum, table) => sum + table.count, 0);
          const IconComponent = info.icon;
          
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-5 w-5 ${info.color}`} />
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core">Core Data</TabsTrigger>
          <TabsTrigger value="biomarkers">Biomarkers</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient-Centric Schema Overview</CardTitle>
                <CardDescription>
                  New patient-centric database with {tables.reduce((sum, table) => sum + table.count, 0).toLocaleString()} total records across {tables.length} tables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm">
                    <h4 className="font-medium mb-2">Migration Status:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✅ New biomarker tables created</li>
                      <li>✅ Clinical diagnostic tables unified</li>
                      <li>✅ Patient-centric architecture implemented</li>
                      <li>✅ Data migration completed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Table Data Viewer</CardTitle>
                <CardDescription>
                  {selectedTable ? `Viewing data from ${selectedTable}` : 'Click "View Data" to see table contents'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="core">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderTablesByCategory('Core User Management')}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Table Data Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="biomarkers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderTablesByCategory('Biomarker Data')}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Biomarker Data Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderTablesByCategory('Clinical Diagnostics')}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Clinical Data Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderTablesByCategory('System Management')}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>System Data Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  renderTableData()
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseDashboard;