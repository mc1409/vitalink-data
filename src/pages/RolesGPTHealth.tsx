import React from "react";
import { Activity, Heart, Moon, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const RolesGPTHealth = () => {
  // Mock data for WHOOP-inspired metrics
  const healthScore = 78;
  const strain = 12.5;
  const recovery = 85;
  const sleep = 7.2;
  const hrv = 42;
  const restingHR = 56;

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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">ROLESGPT Health</h1>
        <p className="text-gray-400">AI-powered health insights</p>
      </div>

      {/* Main Health Score */}
      <div className="px-6 mb-8">
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <CircularProgress 
                value={healthScore} 
                color="#00ff88"
                size={120}
                strokeWidth={8}
              />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Health Score</h2>
            <p className="text-gray-400 text-sm">
              Your overall health performance based on AI analysis
            </p>
            <div className="mt-4 flex justify-center">
              <span className="bg-[#00ff88] text-black px-3 py-1 rounded-full text-sm font-semibold">
                Excellent
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <div className="px-6 space-y-4 mb-8">
        <MetricCard
          title="Recovery"
          value={recovery}
          unit="%"
          trend={5}
          color="#00ff88"
          icon={Zap}
          progress={recovery}
          description="Ready for high strain"
        />
        
        <MetricCard
          title="Strain"
          value={strain}
          unit=""
          trend={-2}
          color="#ffaa00"
          icon={Activity}
          progress={(strain / 21) * 100}
          description="Moderate cardiovascular load"
        />
        
        <MetricCard
          title="Sleep"
          value={sleep}
          unit="hrs"
          trend={8}
          color="#00ff88"
          icon={Moon}
          progress={(sleep / 10) * 100}
          description="Quality sleep achieved"
        />
        
        <MetricCard
          title="HRV"
          value={hrv}
          unit="ms"
          trend={3}
          color="#00ff88"
          icon={Heart}
          progress={(hrv / 100) * 100}
          description="Heart rate variability"
        />
      </div>

      {/* AI Insights */}
      <div className="px-6 mb-8">
        <Card className="bg-[#1a1a1a] border-gray-800 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-white text-lg font-bold mb-4">AI Health Insights</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-[#00ff88] rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Your recovery is excellent. Consider maintaining current sleep schedule.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-[#ffaa00] rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  HRV trending upward - stress management strategies are working.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-[#00ff88] rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Optimal training window: 2-4 PM based on your circadian rhythm.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800">
        <div className="flex justify-around py-4">
          <button className="flex flex-col items-center gap-1">
            <Activity className="h-6 w-6 text-[#00ff88]" />
            <span className="text-xs text-[#00ff88] font-medium">Dashboard</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <TrendingUp className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Insights</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Heart className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Reports</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Zap className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolesGPTHealth;