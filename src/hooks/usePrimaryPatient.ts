import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface PrimaryPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
}

export const usePrimaryPatient = () => {
  const { user } = useAuth();
  const [primaryPatient, setPrimaryPatient] = useState<PrimaryPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrimaryPatient = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First get the user's profile to find their primary patient
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('primary_patient_id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profile?.primary_patient_id) {
          // Get the primary patient details - MUST also check user_id for security
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, first_name, last_name, date_of_birth, gender')
            .eq('id', profile.primary_patient_id)
            .eq('user_id', user.id)
            .single();

          if (patientError) {
            throw patientError;
          }

          setPrimaryPatient(patient);
        } else {
          // If no primary patient set, get the first patient for this user
          const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, first_name, last_name, date_of_birth, gender')
            .eq('user_id', user.id)
            .order('created_at')
            .limit(1);

          if (patientsError) {
            throw patientsError;
          }

          if (patients && patients.length > 0) {
            setPrimaryPatient(patients[0]);
            
            // Update the profile to set this as primary patient
            await supabase
              .from('profiles')
              .update({ primary_patient_id: patients[0].id })
              .eq('user_id', user.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching primary patient:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryPatient();
  }, [user]);

  const refreshPrimaryPatient = () => {
    if (user) {
      setLoading(true);
      // Re-trigger the effect by updating a state
      const fetchPrimaryPatient = async () => {
        try {
          setError(null);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('primary_patient_id')
            .eq('user_id', user.id)
            .single();

          if (profileError) throw profileError;

          if (profile?.primary_patient_id) {
            const { data: patient, error: patientError } = await supabase
              .from('patients')
              .select('id, first_name, last_name, date_of_birth, gender')
              .eq('id', profile.primary_patient_id)
              .eq('user_id', user.id)
              .single();

            if (patientError) throw patientError;
            setPrimaryPatient(patient);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchPrimaryPatient();
    }
  };

  return {
    primaryPatient,
    loading,
    error,
    refreshPrimaryPatient
  };
};