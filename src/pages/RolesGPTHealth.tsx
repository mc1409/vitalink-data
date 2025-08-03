import React from "react";
import { Activity, Heart, Moon, Zap, TrendingUp, TrendingDown, Bell, Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePatient } from "@/contexts/PatientContext";
import { useHealthData } from "@/hooks/useHealthData";

const RolesGPTHealth = () => {
  const { primaryPatient, loading: patientLoading } = usePatient();
  const { healthData, aiInsights, loading: healthLoading } = useHealthData(primaryPatient?.id || null);
  
  const loading = patientLoading || healthLoading;

  const getHealthScoreColor = (score: number | null) => {
    if (!score) return "#666666";
    if (score >= 80) return "#00ff88";
    if (score >= 60) return "#ffaa00";
    return "#ff0044";
  };

  const getRiskLevelColor = (level: string | null) => {
    if (!level) return "#666666";
    switch (level) {
      case 'low': return "#00ff88";
      case 'medium': return "#ffaa00";
      case 'high': return "#ff0044";
      default: return "#666666";
    }
  };

  const getRiskLevelText = (level: string | null) => {
    if (!level) return "Calculating...";
    switch (level) {
      case 'low': return "Low Risk";
      case 'medium': return "Medium Risk";
      case 'high': return "High Risk";
      default: return "Unknown";
    }
  };

  const getLabStatus = (days: number | null) => {
    if (!days) return { color: "#666666", text: "No Data" };
    if (days <= 30) return { color: "#00ff88", text: "Recent" };
    if (days <= 90) return { color: "#ffaa00", text: "Due Soon" };
    return { color: "#ff0044", text: "Overdue" };
  };

  const CircularProgress = ({ value, max = 100, size = 80, strokeWidth = 6, color = "#00ff88" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI * 2;
    const offset = circumference - (value / max) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{value}</span>
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, value, unit, trend, color, icon: Icon, progress, description }) => (
    <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" style={{ color }} />
            <span className="text-gray-400 text-sm font-medium">{title}</span>
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-[#00ff88]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#ff0044]" />
              )}
              <span className={`text-xs ${trend > 0 ? 'text-[#00ff88]' : 'text-[#ff0044]'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-2xl font-bold">{value}</span>
              {unit && <span className="text-gray-400 text-sm">{unit}</span>}
            </div>
            {description && (
              <p className="text-gray-500 text-xs mt-1">{description}</p>
            )}
          </div>
          
          {progress !== undefined && (
            <CircularProgress 
              value={progress} 
              color={color}
              size={60}
              strokeWidth={4}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  const labStatus = getLabStatus(healthData.daysSinceLastLab);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Enhanced Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Good morning, {primaryPatient?.first_name || 'User'}
            </h1>
            <p className="text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Bell className="h-6 w-6 text-gray-400" />
        </div>
      </div>

      {/* Hero Metrics Section */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Overall Health Score */}
          <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
            <CardContent className="p-4 text-center">
              <CircularProgress 
                value={healthData.healthScore || 0} 
                color={getHealthScoreColor(healthData.healthScore)}
                size={80}
                strokeWidth={6}
              />
              <p className="text-gray-400 text-xs mt-2">Health Score</p>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="h-20 flex items-center justify-center">
                <div>
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: getRiskLevelColor(healthData.riskLevel) }}
                  />
                  <span className="text-white text-sm font-bold">
                    {getRiskLevelText(healthData.riskLevel)}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-xs">Risk Level</p>
            </CardContent>
          </Card>

          {/* Days Since Last Lab */}
          <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
            <CardContent className="p-4 text-center">
              <div className="h-20 flex items-center justify-center">
                <div>
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: labStatus.color }}
                  >
                    {healthData.daysSinceLastLab || '--'}
                  </span>
                  <p className="text-gray-400 text-xs mt-1">{labStatus.text}</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs">Days Since Lab</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Snapshot Cards */}
      <div className="px-6 space-y-4 mb-8">
        <h3 className="text-white text-lg font-bold mb-4">Today's Snapshot</h3>
        
        <MetricCard
          title="Heart Health"
          value={healthData.heartData.restingHR || '--'}
          unit="bpm"
          trend={healthData.heartData.trend}
          color="#ff4757"
          icon={Heart}
          progress={healthData.heartData.hrv ? (healthData.heartData.hrv / 100) * 100 : 0}
          description={`HRV: ${healthData.heartData.hrv || '--'} ms`}
        />
        
        <MetricCard
          title="Activity"
          value={healthData.activityData.steps || '--'}
          unit="steps"
          trend={healthData.activityData.trend}
          color="#5352ed"
          icon={Activity}
          progress={healthData.activityData.steps ? Math.min((healthData.activityData.steps / 10000) * 100, 100) : 0}
          description={`${healthData.activityData.calories || '--'} calories burned`}
        />
        
        <MetricCard
          title="Sleep"
          value={healthData.sleepData.totalSleep || '--'}
          unit="hrs"
          trend={healthData.sleepData.trend}
          color="#00ff88"
          icon={Moon}
          progress={healthData.sleepData.efficiency || 0}
          description={`Efficiency: ${healthData.sleepData.efficiency || '--'}%`}
        />
        
        <MetricCard
          title="Stress"
          value={healthData.heartData.hrv ? (healthData.heartData.hrv > 40 ? 'Low' : healthData.heartData.hrv > 25 ? 'Medium' : 'High') : '--'}
          unit=""
          trend={healthData.heartData.trend}
          color={healthData.heartData.hrv ? (healthData.heartData.hrv > 40 ? '#00ff88' : healthData.heartData.hrv > 25 ? '#ffaa00' : '#ff0044') : '#666666'}
          icon={Zap}
          progress={healthData.heartData.hrv ? Math.min((healthData.heartData.hrv / 60) * 100, 100) : 0}
          description="Based on HRV patterns"
        />
      </div>

      {/* Recent AI Insights */}
      <div className="px-6 mb-8">
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-bold">Recent Insights</h3>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                View All
              </Button>
            </div>
            
            {aiInsights.length > 0 ? (
              <div className="space-y-3">
                {aiInsights.slice(0, 3).map((insight, index) => {
                  const levelColor = insight.level === 'critical' ? '#ff0044' : 
                                  insight.level === 'warning' ? '#ffaa00' : '#00ff88';
                  return (
                    <div key={index} className="flex gap-3">
                      <div 
                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{ backgroundColor: levelColor }}
                      />
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">{insight.message}</p>
                        {insight.confidence && (
                          <p className="text-gray-500 text-xs mt-1">
                            Confidence: {insight.confidence}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#666666] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">
                    Add more health data to get personalized AI insights.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-[#666666] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-sm">
                    Upload recent lab results for comprehensive analysis.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mb-24">
        <h3 className="text-white text-lg font-bold mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <Button className="w-full bg-[#00ff88] text-black hover:bg-[#00dd77] font-semibold">
            Add Lab Results
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Manual Entry
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Health Report
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800">
        <div className="flex justify-around py-4">
          <button className="flex flex-col items-center gap-1">
            <Activity className="h-6 w-6 text-[#00ff88]" />
            <span className="text-xs text-[#00ff88] font-medium">Dashboard</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1"
            onClick={() => window.location.href = '/health-insights'}
          >
            <TrendingUp className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Insights</span>
          </button>
          <button 
            className="flex flex-col items-center gap-1"
            onClick={() => window.location.href = '/health-reports'}
          >
            <Heart className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Reports</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <User className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolesGPTHealth;