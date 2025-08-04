import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Calendar, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import DocumentSourceLink from './DocumentSourceLink';
import LabResultDetail from './LabResultDetail';

interface LabResult {
  id: string;
  test_name: string;
  test_category: string;
  result_value: string;
  numeric_value: number | null;
  unit: string | null;
  reference_range_min: number | null;
  reference_range_max: number | null;
  is_out_of_range: boolean | null;
  collection_date: string | null;
  result_date: string | null;
  sample_type: string | null;
  data_source: string;
  source_document_id?: string;
  document_processing_logs?: {
    filename: string;
    storage_path: string;
    created_at: string;
  };
}

interface LabResultsTableProps {
  patientId: string;
}

const LabResultsTable: React.FC<LabResultsTableProps> = ({ patientId }) => {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [selectedLabResult, setSelectedLabResult] = useState<LabResult | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchLabResults();
  }, [patientId]);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('clinical_diagnostic_lab_tests')
        .select(`
          *,
          document_processing_logs:source_document_id (
            filename,
            storage_path,
            created_at
          )
        `)
        .eq('patient_id', patientId)
        .order('collection_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setLabResults(data || []);
    } catch (err: any) {
      console.error('Error fetching lab results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (result: LabResult) => {
    setSelectedLabResult(result);
    setIsDetailOpen(true);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedLabResult(null);
  };

  const getStatusBadge = (result: LabResult) => {
    if (result.is_out_of_range === true) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Out of Range
        </Badge>
      );
    }
    if (result.is_out_of_range === false) {
      return <Badge variant="secondary">Normal</Badge>;
    }
    return <Badge variant="outline">-</Badge>;
  };

  const getTrendIcon = (result: LabResult) => {
    if (!result.numeric_value || !result.reference_range_min || !result.reference_range_max) {
      return null;
    }

    const midpoint = (result.reference_range_min + result.reference_range_max) / 2;
    if (result.numeric_value > midpoint) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (result.numeric_value < midpoint) {
      return <TrendingDown className="h-4 w-4 text-blue-500" />;
    }
    return null;
  };

  const formatReferenceRange = (result: LabResult) => {
    if (result.reference_range_min !== null && result.reference_range_max !== null) {
      return `${result.reference_range_min} - ${result.reference_range_max}`;
    }
    return '-';
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(labResults.map(result => result.test_category))];
    return categories.filter(Boolean);
  };

  const filteredAndSortedResults = labResults
    .filter(result => categoryFilter === 'all' || result.test_category === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.test_name.localeCompare(b.test_name);
        case 'category':
          return a.test_category.localeCompare(b.test_category);
        case 'date':
        default:
          const dateA = new Date(a.collection_date || a.result_date || '');
          const dateB = new Date(b.collection_date || b.result_date || '');
          return dateB.getTime() - dateA.getTime();
      }
    });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading lab results: {error}</p>
            <Button onClick={fetchLabResults} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lab Results ({labResults.length})
        </CardTitle>
        <CardDescription>
          Comprehensive blood work and laboratory test results
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <strong>Patient ID:</strong> <span className="font-mono">{patientId}</span>
          </div>
        </CardDescription>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getUniqueCategories().map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'category') => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="name">Sort by Test Name</SelectItem>
              <SelectItem value="category">Sort by Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedResults.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {categoryFilter === 'all' 
                ? 'No lab results found for this patient.' 
                : `No lab results found in the ${categoryFilter} category.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedResults.map((result) => (
                  <TableRow 
                    key={result.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(result)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {result.test_name}
                        {getTrendIcon(result)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.test_category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {result.result_value}
                          {result.unit && ` ${result.unit}`}
                        </span>
                        {result.sample_type && (
                          <span className="text-xs text-muted-foreground">
                            {result.sample_type}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatReferenceRange(result)}
                        {result.unit && ` ${result.unit}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {result.collection_date && (
                          <span className="text-sm">
                            {format(new Date(result.collection_date), 'MMM dd, yyyy')}
                          </span>
                        )}
                        {result.result_date && result.result_date !== result.collection_date && (
                          <span className="text-xs text-muted-foreground">
                            Results: {format(new Date(result.result_date), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DocumentSourceLink
                        sourceDocumentId={result.source_document_id}
                        documentInfo={result.document_processing_logs}
                        dataSource={result.data_source}
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(result);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Lab Result Detail Modal */}
      <LabResultDetail
        labResult={selectedLabResult}
        patientId={patientId}
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
      />
    </Card>
  );
};

export default LabResultsTable;