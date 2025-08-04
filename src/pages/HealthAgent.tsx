import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgentById } from '@/config/healthAgents';
import { useHealthAgent } from '@/hooks/useHealthAgent';
import { usePrimaryPatient } from '@/hooks/usePrimaryPatient';
import HealthAgentDashboard from '@/components/HealthAgentDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HealthAgent: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { primaryPatient, loading: patientLoading } = usePrimaryPatient();
  
  // Get agent configuration
  const agentConfig = agentId ? getAgentById(agentId) : null;
  
  // Use health agent hook
  const {
    data,
    loading,
    analyzing,
    error,
    debugInfo,
    refresh
  } = useHealthAgent(agentConfig!, primaryPatient?.id || null);

  const handleBack = () => {
    navigate('/rolesgpt-health');
  };

  // Agent not found
  if (!agentConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 backdrop-blur-sm border-white/20 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Agent Not Found</h2>
            <p className="text-gray-300 mb-6">
              The health agent '{agentId}' does not exist or is not configured.
            </p>
            <Button onClick={handleBack} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Health Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Patient loading
  if (patientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <agentConfig.icon className="h-12 w-12 text-blue-400" />
          <div className="text-white">Loading patient data...</div>
        </div>
      </div>
    );
  }

  // No patient selected
  if (!primaryPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 backdrop-blur-sm border-white/20 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Patient Selected</h2>
            <p className="text-gray-300 mb-6">
              Please select a patient to view {agentConfig.name} analysis.
            </p>
            <Button onClick={handleBack} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Health Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <HealthAgentDashboard
      agentConfig={agentConfig}
      data={data}
      loading={loading}
      analyzing={analyzing}
      error={error}
      debugInfo={debugInfo}
      onRefresh={refresh}
      onBack={handleBack}
    />
  );
};

export default HealthAgent;