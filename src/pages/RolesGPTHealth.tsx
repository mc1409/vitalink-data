import React, { useState } from "react";
import { 
  Activity, Heart, Moon, Zap, TrendingUp, Brain, 
  BarChart3, Shield, Pill, Apple, Clock, Waves,
  Target, Eye, Thermometer, ChevronRight, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WHOOPSleepAnalysis } from "@/components/WHOOPSleepAnalysis";

// Agent definitions with WHOOP-style metrics
const healthAgents = [
  {
    id: 'sleep-analysis',
    name: 'Sleep Coach',
    icon: Moon,
    status: 'active',
    lastRun: '2 hours ago',
    priority: 'high',
    color: '#00ff88',
    description: 'AI sleep analysis using biomarker patterns',
    metrics: { accuracy: 92, insights: 47, recommendations: 12 },
    component: <WHOOPSleepAnalysis />
  },
  {
    id: 'heart-optimizer',
    name: 'CardioAI',
    icon: Heart,
    status: 'active',
    lastRun: '1 hour ago',
    priority: 'high',
    color: '#ff4757',
    description: 'Heart rate variability and cardiovascular optimization',
    metrics: { accuracy: 89, insights: 23, recommendations: 8 },
    component: null
  },
  {
    id: 'activity-coach',
    name: 'FitBot',
    icon: Activity,
    status: 'running',
    lastRun: 'Live',
    priority: 'medium',
    color: '#5352ed',
    description: 'Workout optimization and recovery tracking',
    metrics: { accuracy: 94, insights: 31, recommendations: 15 },
    component: null
  },
  {
    id: 'stress-manager',
    name: 'ZenAI',
    icon: Zap,
    status: 'active',
    lastRun: '30 min ago',
    priority: 'medium',
    color: '#ffaa00',
    description: 'Stress detection and management strategies',
    metrics: { accuracy: 87, insights: 19, recommendations: 6 },
    component: null
  },
  {
    id: 'nutrition-guide',
    name: 'NutriBot',
    icon: Apple,
    status: 'pending',
    lastRun: '6 hours ago',
    priority: 'low',
    color: '#2ed573',
    description: 'Nutrition analysis and meal optimization',
    metrics: { accuracy: 91, insights: 28, recommendations: 9 },
    component: null
  },
  {
    id: 'lab-analyzer',
    name: 'LabAI',
    icon: BarChart3,
    status: 'active',
    lastRun: '4 hours ago',
    priority: 'high',
    color: '#ff6b6b',
    description: 'Biomarker analysis and lab result interpretation',
    metrics: { accuracy: 96, insights: 42, recommendations: 11 },
    component: null
  },
  {
    id: 'recovery-coach',
    name: 'RecovBot',
    icon: Shield,
    status: 'active',
    lastRun: '1 hour ago',
    priority: 'medium',
    color: '#70a1ff',
    description: 'Recovery optimization and injury prevention',
    metrics: { accuracy: 90, insights: 25, recommendations: 7 },
    component: null
  },
  {
    id: 'supplement-advisor',
    name: 'SupplAI',
    icon: Pill,
    status: 'inactive',
    lastRun: '2 days ago',
    priority: 'low',
    color: '#a4b0be',
    description: 'Supplement recommendations based on biomarkers',
    metrics: { accuracy: 85, insights: 16, recommendations: 4 },
    component: null
  },
  {
    id: 'circadian-optimizer',
    name: 'ChronoAI',
    icon: Clock,
    status: 'active',
    lastRun: '3 hours ago',
    priority: 'medium',
    color: '#ffa502',
    description: 'Circadian rhythm optimization and light therapy',
    metrics: { accuracy: 88, insights: 22, recommendations: 8 },
    component: null
  },
  {
    id: 'hrv-analyzer',
    name: 'HRVBot',
    icon: Waves,
    status: 'running',
    lastRun: 'Live',
    priority: 'high',
    color: '#ff6348',
    description: 'Heart rate variability pattern analysis',
    metrics: { accuracy: 93, insights: 35, recommendations: 10 },
    component: null
  },
  {
    id: 'performance-tracker',
    name: 'PerfAI',
    icon: Target,
    status: 'active',
    lastRun: '45 min ago',
    priority: 'medium',
    color: '#3742fa',
    description: 'Performance optimization and goal tracking',
    metrics: { accuracy: 91, insights: 29, recommendations: 13 },
    component: null
  },
  {
    id: 'vision-health',
    name: 'EyeAI',
    icon: Eye,
    status: 'pending',
    lastRun: '1 day ago',
    priority: 'low',
    color: '#2f3542',
    description: 'Eye health and screen time optimization',
    metrics: { accuracy: 82, insights: 14, recommendations: 5 },
    component: null
  }
];

const RolesGPTHealth = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#00ff88';
      case 'running': return '#00aaff';
      case 'pending': return '#ffaa00';
      case 'inactive': return '#666666';
      default: return '#666666';
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-900/20 text-red-400 border-red-800',
      medium: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
      low: 'bg-gray-900/20 text-gray-400 border-gray-800'
    };
    return colors[priority] || colors.low;
  };

  const AgentCard = ({ agent }) => (
    <Card 
      className="bg-[#1a1a1a] border-gray-800 rounded-xl cursor-pointer hover:bg-[#222] transition-all duration-200 group"
      onClick={() => setSelectedAgent(agent)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${agent.color}20` }}
            >
              <agent.icon 
                className="h-5 w-5" 
                style={{ color: agent.color }}
              />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{agent.name}</h3>
              <p className="text-gray-400 text-xs">{agent.description}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(agent.status) }}
            />
            <span className="text-gray-400 text-xs capitalize">{agent.status}</span>
          </div>
          <Badge variant="outline" className={`text-xs px-2 py-0 ${getPriorityBadge(agent.priority)}`}>
            {agent.priority}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs">{agent.lastRun}</span>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400">{agent.metrics.insights} insights</span>
            <span className="text-gray-400">{agent.metrics.accuracy}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AgentModal = ({ agent, onClose }) => {
    if (!agent) return null;

    return (
      <Dialog open={!!agent} onOpenChange={() => onClose()}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${agent.color}20` }}
                >
                  <agent.icon 
                    className="h-6 w-6" 
                    style={{ color: agent.color }}
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    {agent.name}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {agent.description}
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-6">
            {agent.component ? (
              <agent.component />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-[#0f0f0f] border-gray-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold" style={{ color: agent.color }}>
                        {agent.metrics.accuracy}%
                      </div>
                      <div className="text-xs text-gray-400">Accuracy</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f0f] border-gray-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">
                        {agent.metrics.insights}
                      </div>
                      <div className="text-xs text-gray-400">Insights</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0f0f0f] border-gray-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white">
                        {agent.metrics.recommendations}
                      </div>
                      <div className="text-xs text-gray-400">Recommendations</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-[#0f0f0f] border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Agent Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getStatusColor(agent.status) }}
                          />
                          <span className="text-white capitalize">{agent.status}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Run</span>
                        <span className="text-white">{agent.lastRun}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Priority</span>
                        <Badge variant="outline" className={`${getPriorityBadge(agent.priority)}`}>
                          {agent.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center text-gray-400">
                  <Brain className="h-12 w-12 mx-auto mb-4" />
                  <p>This agent is coming soon. Full functionality will be available in the next update.</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">Health Agents</h1>
          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
            {healthAgents.filter(a => a.status === 'active' || a.status === 'running').length} Active
          </Badge>
        </div>
        <p className="text-gray-400 text-sm">
          AI-powered health optimization agents
        </p>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-white">
                {healthAgents.reduce((sum, agent) => sum + agent.metrics.insights, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Insights</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-white">
                {Math.round(healthAgents.reduce((sum, agent) => sum + agent.metrics.accuracy, 0) / healthAgents.length)}%
              </div>
              <div className="text-xs text-gray-400">Avg Accuracy</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-white">
                {healthAgents.reduce((sum, agent) => sum + agent.metrics.recommendations, 0)}
              </div>
              <div className="text-xs text-gray-400">Recommendations</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="px-4 pb-24">
        <div className="space-y-3">
          {healthAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Agent Modal */}
      <AgentModal 
        agent={selectedAgent} 
        onClose={() => setSelectedAgent(null)} 
      />

      {/* Bottom Navigation Spacer */}
      <div className="h-20" />
    </div>
  );
};

export default RolesGPTHealth;