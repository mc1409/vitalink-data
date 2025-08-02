import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Database, 
  Upload, 
  Activity, 
  BarChart3, 
  Users,
  Brain,
  Table,
  Eye,
  Heart,
  LogOut
} from 'lucide-react';
import MedicalDataProcessor from '@/components/MedicalDataProcessor';
import SQLEditor from '@/components/SQLEditor';
import DatabaseDashboard from '@/components/DatabaseDashboard';
import SimpleTableViewer from '@/components/SimpleTableViewer';
import HealthKitSync from '@/components/HealthKitSync';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PatientSelector from '@/components/PatientSelector';
import { usePatient } from '@/contexts/PatientContext';

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const { primaryPatient } = usePatient();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Check if URL has tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'overview';
  });

  // Fetch recent processing activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('document_processing_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!error) {
          setRecentActivity(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent activity:', error);
      }
    };

    fetchRecentActivity();
  }, [user]);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', activeTab);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-pulse">
          <Heart className="h-12 w-12 text-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }
  
  // Redirect to auth if not logged in
  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary p-2 rounded-lg shadow-medical">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">VitaLink Data</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-80">
                <PatientSelector
                  selectedPatientId={primaryPatient?.id || null}
                  onPatientSelect={() => {}} 
                  showCreateButton={true}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Process Documents
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              View Data Tables
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              SQL Query
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents Processed</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recentActivity.length}</div>
                  <p className="text-xs text-muted-foreground">Recent uploads</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {recentActivity.filter(item => item.processing_status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully processed</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Tables</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15</div>
                  <p className="text-xs text-muted-foreground">Medical data tables</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Document Processing
                </CardTitle>
                <CardDescription>
                  Your latest document uploads and AI analysis results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents processed yet</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setActiveTab('upload')}
                    >
                      Process Your First Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{item.filename}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            {item.confidence_score && (
                              <>
                                <span>•</span>
                                <span>{Math.round(item.confidence_score * 100)}% confidence</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.processing_status === 'completed' ? 'default' : 'secondary'}>
                            {item.processing_status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setActiveTab('database')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Data
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Data Integration */}
            <HealthKitSync userId={user.id} />

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('upload')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Process New Document
                  </CardTitle>
                  <CardDescription>
                    Upload medical documents for AI analysis and data extraction
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('database')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table className="h-5 w-5 text-primary" />
                    Browse Data Tables
                  </CardTitle>
                  <CardDescription>
                    View and explore your medical data stored in database tables
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <MedicalDataProcessor />
          </TabsContent>

          <TabsContent value="database">
            <div className="space-y-6">
              <SimpleTableViewer />
              <DatabaseDashboard />
            </div>
          </TabsContent>

          <TabsContent value="sql">
            <SQLEditor />
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>
                  Data visualization and health insights (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Analytics dashboard will be available once you start uploading data
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;