import React, { useState } from "react";
import { ArrowLeft, FileText, Download, Share2, Calendar, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePatient } from "@/contexts/PatientContext";
import { supabase } from "@/integrations/supabase/client";

const HealthReports = () => {
  const { primaryPatient } = usePatient();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock recent reports data
  const recentReports = [
    {
      id: 1,
      title: "Monthly Health Summary - December 2024",
      date: "2024-12-01",
      type: "monthly",
      size: "2.4 MB",
      pages: 12
    },
    {
      id: 2,
      title: "Quarterly Health Analysis - Q4 2024",
      date: "2024-10-01",
      type: "quarterly",
      size: "5.8 MB",
      pages: 28
    },
    {
      id: 3,
      title: "Weekly Progress Report - Nov 25-Dec 1",
      date: "2024-11-25",
      type: "weekly",
      size: "1.2 MB",
      pages: 6
    }
  ];

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'weekly': return '#5352ed';
      case 'monthly': return '#00ff88';
      case 'quarterly': return '#ffaa00';
      case 'annual': return '#ff4757';
      default: return '#666666';
    }
  };

  const handleGenerateReport = async () => {
    if (!primaryPatient?.id) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-health-report', {
        body: { 
          patientId: primaryPatient.id,
          reportType: selectedPeriod 
        }
      });
      
      if (error) throw error;
      
      console.log('Generated report:', data);
      // TODO: Save report to database and refresh list
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" className="p-0">
            <ArrowLeft className="h-6 w-6 text-gray-400" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Health Reports</h1>
        </div>

        <p className="text-gray-400 mb-6">
          Generate comprehensive health analytics and share with your healthcare team
        </p>
      </div>

      {/* Report Generator */}
      <div className="px-6 mb-8">
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate New Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Report Type</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="bg-black border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-gray-600">
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="monthly">Monthly Analysis</SelectItem>
                  <SelectItem value="quarterly">Quarterly Report</SelectItem>
                  <SelectItem value="annual">Annual Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Preview */}
            <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-white font-semibold mb-3">Report Will Include:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#00ff88]" />
                  <span className="text-gray-300">Executive Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#5352ed]" />
                  <span className="text-gray-300">Biomarker Trends</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#ffaa00]" />
                  <span className="text-gray-300">Lifestyle Correlations</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#ff4757]" />
                  <span className="text-gray-300">Risk Assessment</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full bg-[#00ff88] text-black hover:bg-[#00dd77] font-semibold"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <div className="px-6 mb-8">
        <h3 className="text-white text-lg font-bold mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {recentReports.map((report) => (
            <Card key={report.id} className="bg-[#1a1a1a] border-gray-800 rounded-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-2">{report.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Generated {new Date(report.date).toLocaleDateString()}</span>
                      <span>{report.size}</span>
                      <span>{report.pages} pages</span>
                    </div>
                  </div>
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: getReportTypeColor(report.type),
                      color: 'white'
                    }}
                  >
                    {report.type.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="flex-1 border-gray-600 text-gray-300">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-gray-600 text-gray-300">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analytics Preview */}
      <div className="px-6 mb-8">
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
          <CardHeader>
            <CardTitle className="text-white">Analytics Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                <h5 className="text-white font-semibold mb-2">Biomarker Trends</h5>
                <p className="text-gray-400 text-sm">
                  Interactive charts showing progression of key health markers over time
                </p>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                <h5 className="text-white font-semibold mb-2">Lifestyle Correlations</h5>
                <p className="text-gray-400 text-sm">
                  AI-powered analysis of how your activities impact your health metrics
                </p>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                <h5 className="text-white font-semibold mb-2">Risk Assessment</h5>
                <p className="text-gray-400 text-sm">
                  Comprehensive evaluation of cardiovascular, metabolic, and other health risks
                </p>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                <h5 className="text-white font-semibold mb-2">Personalized Recommendations</h5>
                <p className="text-gray-400 text-sm">
                  Data-driven action items and goal suggestions based on your unique patterns
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 py-8">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">
            Share reports securely with your healthcare team
          </p>
          <Button variant="outline" className="border-gray-600 text-gray-300">
            Manage Sharing Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HealthReports;