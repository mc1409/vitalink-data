import React, { useState } from "react";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Target, Share2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePatient } from "@/contexts/PatientContext";
import { useHealthData } from "@/hooks/useHealthData";

const HealthInsights = () => {
  const { primaryPatient } = usePatient();
  const { healthData, aiInsights, loading } = useHealthData(primaryPatient?.id || null);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const getInsightsByType = (type: 'critical' | 'warning' | 'optimal') => {
    return aiInsights.filter(insight => insight.level === type);
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ff0044';
      case 'warning': return '#ffaa00';
      case 'optimal': return '#00ff88';
      default: return '#666666';
    }
  };

  const getPriorityLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'High Priority';
      case 'warning': return 'Medium Priority';
      case 'optimal': return 'Low Priority';
      default: return 'Unknown';
    }
  };

  const InsightCard = ({ insight, index }: { insight: any; index: number }) => {
    const isExpanded = expandedInsight === index;
    const priorityColor = getPriorityColor(insight.level);

    return (
      <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: priorityColor }}
              />
              <h4 className="text-white font-semibold">{insight.metric}</h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: priorityColor, color: priorityColor }}
              >
                {getPriorityLabel(insight.level)}
              </Badge>
              {insight.confidence && (
                <Badge variant="secondary" className="text-xs">
                  {insight.confidence}% confidence
                </Badge>
              )}
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-4">{insight.message}</p>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExpandedInsight(isExpanded ? null : index)}
            className="text-gray-400 hover:text-white p-0"
          >
            {isExpanded ? 'Show Less' : 'Learn More'}
          </Button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="space-y-3">
                <div>
                  <h5 className="text-white font-medium mb-2">Recommendation</h5>
                  <p className="text-gray-300 text-sm">{insight.recommendation}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Share with Physician
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Set Goal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" className="p-0">
            <ArrowLeft className="h-6 w-6 text-gray-400" />
          </Button>
          <h1 className="text-3xl font-bold text-white">AI Health Insights</h1>
        </div>

        {/* Overall Risk Score */}
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl mb-6">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="relative">
                <svg width="120" height="120" className="transform -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="#1a1a1a"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke={healthData.riskLevel === 'low' ? '#00ff88' : healthData.riskLevel === 'medium' ? '#ffaa00' : '#ff0044'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(healthData.healthScore || 0) * 3.14} 314.16`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">{healthData.healthScore || '--'}</span>
                </div>
              </div>
              <div className="text-left">
                <h2 className="text-white text-2xl font-bold mb-2">Overall Risk Score</h2>
                <Badge 
                  className="text-sm"
                  style={{ 
                    backgroundColor: healthData.riskLevel === 'low' ? '#00ff88' : healthData.riskLevel === 'medium' ? '#ffaa00' : '#ff0044',
                    color: 'black'
                  }}
                >
                  {healthData.riskLevel?.toUpperCase() || 'CALCULATING'} RISK
                </Badge>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Based on analysis of your latest biomarkers and health trends
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Insights */}
      <div className="px-6">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#1a1a1a] border border-gray-800">
            <TabsTrigger value="insights" className="text-xs">Key Insights</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">Actions</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4 mt-6">
            <div className="grid gap-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Critical Issues</span>
                <span className="text-[#ff0044] font-semibold">{getInsightsByType('critical').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Warnings</span>
                <span className="text-[#ffaa00] font-semibold">{getInsightsByType('warning').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Optimal Metrics</span>
                <span className="text-[#00ff88] font-semibold">{getInsightsByType('optimal').length}</span>
              </div>
            </div>

            {aiInsights.length > 0 ? (
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} index={index} />
                ))}
              </div>
            ) : (
              <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
                <CardContent className="p-6 text-center">
                  <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No AI Insights Available</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Upload recent health data to get personalized AI insights
                  </p>
                  <Button className="bg-[#00ff88] text-black hover:bg-[#00dd77]">
                    Add Health Data
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-6">
            <div className="space-y-4">
              {aiInsights.filter(insight => insight.recommendation).map((insight, index) => (
                <Card key={index} className="bg-[#1a1a1a] border-gray-800 rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-[#00ff88] mt-1" />
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-2">{insight.metric}</h4>
                        <p className="text-gray-300 text-sm mb-3">{insight.recommendation}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            Set Reminder
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            Track Progress
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4 mt-6">
            <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">Trend Analysis Coming Soon</h3>
                <p className="text-gray-400 text-sm">
                  Historical trend analysis will be available with more data points
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 mt-6">
            <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">Predictive Analytics Coming Soon</h3>
                <p className="text-gray-400 text-sm">
                  AI predictions will be available as more health data is collected
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 py-8">
        <div className="flex gap-3">
          <Button className="flex-1 bg-[#00ff88] text-black hover:bg-[#00dd77]">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" className="flex-1 border-gray-600 text-gray-300">
            <Share2 className="h-4 w-4 mr-2" />
            Share with Doctor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HealthInsights;