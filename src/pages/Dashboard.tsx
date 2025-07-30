import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Activity, Brain, Database, LogOut, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import DatabaseDashboard from '@/components/DatabaseDashboard';
import PDFUploadProcessor from '@/components/PDFUploadProcessor';

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  console.log('Dashboard render - User:', user?.email, 'Loading:', loading, 'Active tab:', activeTab);
  
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

  const healthMetrics = [
    {
      title: "Medical Records",
      description: "Lab results, imaging studies, and medical history",
      icon: Heart,
      count: "0",
      color: "text-primary",
      bgColor: "bg-primary-light"
    },
    {
      title: "Activity Data",
      description: "Steps, workouts, and fitness tracking",
      icon: Activity,
      count: "0",
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Biomarkers",
      description: "Sleep, HRV, and recovery metrics",
      icon: Brain,
      count: "0",
      color: "text-info",
      bgColor: "bg-info/10"
    },
    {
      title: "Connected Devices",
      description: "Apple Health, WHOOP, Oura, and more",
      icon: Database,
      count: "0",
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ];

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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Health Dashboard</h2>
          <p className="text-muted-foreground text-lg">
            Your comprehensive health data platform is ready. Start by connecting your devices or adding medical records.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button 
            className="h-auto p-4 bg-gradient-primary hover:opacity-90 shadow-medical"
            onClick={() => setActiveTab('upload')}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              <span>Upload Medical Document</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 shadow-card-custom"
            onClick={() => setActiveTab('database')}
          >
            <div className="flex flex-col items-center gap-2">
              <Database className="h-6 w-6" />
              <span>View Database</span>
            </div>
          </Button>
          <Button variant="outline" className="h-auto p-4 shadow-card-custom">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>View Trends</span>
            </div>
          </Button>
          <Button variant="outline" className="h-auto p-4 shadow-card-custom">
            <div className="flex flex-col items-center gap-2">
              <Activity className="h-6 w-6" />
              <span>Health Summary</span>
            </div>
          </Button>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Health Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {healthMetrics.map((metric, index) => (
                <Card key={index} className="shadow-medical border-0 hover:shadow-glow transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                        <metric.icon className={`h-5 w-5 ${metric.color}`} />
                      </div>
                      <span className={`text-2xl font-bold ${metric.color}`}>{metric.count}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-1">{metric.title}</CardTitle>
                    <CardDescription>{metric.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Getting Started Section */}
            <Card className="shadow-medical border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Getting Started with VitaLink Data
                </CardTitle>
                <CardDescription>
                  Your comprehensive health data platform is now set up with the following capabilities:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Medical Records System</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Complete lab test tracking (CBC, Chemistry, Lipids)</li>
                      <li>• Imaging studies management</li>
                      <li>• Cardiovascular test results</li>
                      <li>• Allergy and medication tracking</li>
                      <li>• Patient demographics and insurance info</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Biomarker Data Platform</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Apple Health integration ready</li>
                      <li>• WHOOP and Oura device support</li>
                      <li>• Sleep and recovery tracking</li>
                      <li>• Heart rate variability monitoring</li>
                      <li>• Microbiome analysis (Viome)</li>
                      <li>• Nutrition and activity metrics</li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-foreground mb-2">Features Available</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary"
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload Medical Documents
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setActiveTab('database')}
                    >
                      View Database Tables
                    </Button>
                    <Button size="sm" variant="outline">API Documentation</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <PDFUploadProcessor />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseDashboard />
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
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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