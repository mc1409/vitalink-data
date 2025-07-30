import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Activity, Brain, Database, Smartphone, Shield, ArrowRight, CheckCircle } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-pulse">
          <Heart className="h-12 w-12 text-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Heart,
      title: "Complete Medical Records",
      description: "Store and track lab results, imaging studies, cardiovascular tests, and comprehensive medical history.",
      color: "text-primary"
    },
    {
      icon: Activity,
      title: "Wearable Integration",
      description: "Connect Apple Health, WHOOP, Oura Ring, and other devices for continuous health monitoring.",
      color: "text-accent"
    },
    {
      icon: Brain,
      title: "Advanced Biomarkers",
      description: "Track sleep patterns, HRV, recovery metrics, microbiome data, and nutritional insights.",
      color: "text-info"
    },
    {
      icon: Database,
      title: "Secure Data Platform",
      description: "HIPAA-compliant architecture with enterprise-grade security and real-time synchronization.",
      color: "text-warning"
    }
  ];

  const benefits = [
    "Comprehensive health data in one secure platform",
    "Real-time sync with popular wearable devices",
    "Advanced analytics and trend tracking",
    "HIPAA-compliant and end-to-end encrypted",
    "Mobile-ready for iOS and Android development",
    "Scalable architecture for growing health data"
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-primary p-4 rounded-full shadow-glow animate-pulse-glow">
              <Heart className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            VitaLink <span className="bg-gradient-primary bg-clip-text text-transparent">Data</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Your comprehensive health data platform. Unify medical records, wearable data, 
            and biomarkers in one secure, mobile-ready application.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 shadow-medical text-lg px-8 py-3"
              onClick={() => navigate('/auth')}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3 shadow-card-custom"
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Mobile Ready
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-medical border-0 hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className={`p-3 rounded-lg bg-primary-light w-fit`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Everything You Need for Health Data Management
            </h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Card className="shadow-medical border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Database Architecture
              </CardTitle>
              <CardDescription>
                Fully configured backend with comprehensive data models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">Medical Records</p>
                  <p className="text-muted-foreground">15+ tables</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Biomarker Data</p>
                  <p className="text-muted-foreground">8+ metric tables</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Device Integration</p>
                  <p className="text-muted-foreground">5+ platforms</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Security</p>
                  <p className="text-muted-foreground">RLS enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="shadow-medical border-0 bg-gradient-primary text-primary-foreground">
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-4">Ready to Build Your Health App?</h3>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Your comprehensive medical data platform is ready. Start building your mobile application 
              with a robust, secure, and scalable foundation.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-3"
              onClick={() => navigate('/auth')}
            >
              Start Building
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
