import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  profile_id: string;
}

interface PatientSelectorProps {
  selectedPatientId?: string;
  onPatientSelect: (patientId: string | null) => void;
  showCreateButton?: boolean;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  selectedPatientId,
  onPatientSelect,
  showCreateButton = true
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: ''
  });

  const loadPatients = async () => {
    setLoading(true);
    try {
      // First get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      // Then get patients for this profile
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, date_of_birth, gender, profile_id')
        .eq('profile_id', profile.id)
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      toast.error('Failed to load patients');
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPatient = async () => {
    if (!newPatient.first_name || !newPatient.last_name || !newPatient.date_of_birth) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get the user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...newPatient,
          profile_id: profile.id,
          user_id: (await supabase.auth.getUser()).data.user?.id // Keep for backward compatibility
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Patient created successfully');
      setIsDialogOpen(false);
      setNewPatient({ first_name: '', last_name: '', date_of_birth: '', gender: '' });
      loadPatients();
      
      // Auto-select the new patient
      if (data) {
        onPatientSelect(data.id);
      }
    } catch (error) {
      toast.error('Failed to create patient');
      console.error('Error creating patient:', error);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const getPatientDisplayName = (patient: Patient) => {
    const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
    return `${patient.first_name} ${patient.last_name} (${age}y)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Patient Selection
        </CardTitle>
        <CardDescription>
          Select a patient to view and manage their health data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedPatientId || ''} onValueChange={onPatientSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {getPatientDisplayName(patient)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {showCreateButton && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Patient
                  </DialogTitle>
                  <DialogDescription>
                    Create a new patient profile to track their health data.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={newPatient.first_name}
                        onChange={(e) => setNewPatient(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={newPatient.last_name}
                        onChange={(e) => setNewPatient(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={newPatient.date_of_birth}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={newPatient.gender} onValueChange={(value) => setNewPatient(prev => ({ ...prev, gender: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPatient}>
                    Create Patient
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {loading && <p className="text-sm text-muted-foreground">Loading patients...</p>}
        {!loading && patients.length === 0 && (
          <p className="text-sm text-muted-foreground">No patients found. Create your first patient to get started.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientSelector;