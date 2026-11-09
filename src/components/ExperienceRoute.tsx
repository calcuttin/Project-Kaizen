import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { areaVisible, experienceHome } from '@/core/experience';

export function ExperienceRoute({ area, children }: { area: string; children: ReactNode }) {
  const { experience } = useAuth();
  return areaVisible(area, experience) ? children : <Navigate to={experienceHome(experience)} replace />;
}
