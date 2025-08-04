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

        // Get the primary patient directly from user_patients table
        const { data: patient, error: patientError } = await supabase
          .from('user_patients')
          .select('id, first_name, last_name, date_of_birth, gender')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .single();

        if (patientError) {
          // If no primary patient found, get the first patient and set as primary
          const { data: patients, error: patientsError } = await supabase
            .from('user_patients')
            .select('id, first_name, last_name, date_of_birth, gender')
            .eq('user_id', user.id)
            .order('created_at')
            .limit(1);

          if (patientsError) {
            throw patientsError;
          }

          if (patients && patients.length > 0) {
            // Set the first patient as primary
            await supabase
              .from('user_patients')
              .update({ is_primary: true })
              .eq('id', patients[0].id);

            setPrimaryPatient(patients[0]);
          }
        } else {
          setPrimaryPatient(patient);
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
      const fetchPrimaryPatient = async () => {
        try {
          setError(null);

          // Get the primary patient directly from user_patients table
          const { data: patient, error: patientError } = await supabase
            .from('user_patients')
            .select('id, first_name, last_name, date_of_birth, gender')
            .eq('user_id', user.id)
            .eq('is_primary', true)
            .single();

          if (patientError) throw patientError;
          setPrimaryPatient(patient);
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