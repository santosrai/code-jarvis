
"use client";

import type { Profile } from '@/types';
import useLocalStorage from './useLocalStorage';
import { LOCALSTORAGE_PROFILE_KEY, DEFAULT_DISPLAY_NAME, DEFAULT_GPU_USAGE } from '@/lib/constants';

const defaultProfile: Profile = {
  displayName: DEFAULT_DISPLAY_NAME,
  estimatedGpuUsage: DEFAULT_GPU_USAGE,
};

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<Profile>(LOCALSTORAGE_PROFILE_KEY, defaultProfile);

  const updateDisplayName = (newName: string) => {
    setProfile(prev => ({ ...prev, displayName: newName || DEFAULT_DISPLAY_NAME }));
  };

  const addGpuUsage = (seconds: number) => {
    setProfile(prev => ({ ...prev, estimatedGpuUsage: (prev.estimatedGpuUsage || 0) + seconds }));
  };

  const resetGpuUsage = () => {
    setProfile(prev => ({ ...prev, estimatedGpuUsage: DEFAULT_GPU_USAGE }));
  };

  return {
    profile,
    updateDisplayName,
    addGpuUsage,
    resetGpuUsage,
  };
}
