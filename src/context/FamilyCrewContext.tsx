import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { FamilyCrew, CrewSyncModules } from '../types';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

interface FamilyCrewContextType {
  currentCrew: FamilyCrew | null;
  isLoading: boolean;
  isOwner: boolean;
  createCrew: (name: string, syncModules?: Partial<CrewSyncModules>) => Promise<boolean>;
  joinCrew: (code: string) => Promise<{ success: boolean; message?: string }>;
  leaveCrew: () => Promise<boolean>;
  syncCrewSection: (section: 'fuelLogs' | 'trips' | 'checklists' | 'pantry' | 'maintenance', data: any) => Promise<boolean>;
  updateCrewSettings: (name?: string, syncModules?: Partial<CrewSyncModules>) => Promise<boolean>;
  refreshCrew: () => Promise<void>;
  isModuleSynced: (module: keyof CrewSyncModules) => boolean;
}

const FamilyCrewContext = createContext<FamilyCrewContextType | undefined>(undefined);

interface FamilyCrewProviderProps {
  children: ReactNode;
  currentUser: { email: string; nickname?: string; name?: string; profilePhoto?: string } | null;
}

export function FamilyCrewProvider({ children, currentUser }: FamilyCrewProviderProps) {
  const emailLower = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';

  const [currentCrew, setCurrentCrew] = useState<FamilyCrew | null>(() => {
    if (!emailLower) return null;
    try {
      const saved = localStorage.getItem(`camper_family_crew_${emailLower}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.ownerEmail === emailLower || (Array.isArray(parsed.members) && parsed.members.some((m: any) => m.email === emailLower)))) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // When currentUser changes or logs out, immediately reset currentCrew
  useEffect(() => {
    if (!emailLower) {
      setCurrentCrew(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`camper_family_crew_${emailLower}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.ownerEmail === emailLower || (Array.isArray(parsed.members) && parsed.members.some((m: any) => m.email === emailLower)))) {
          setCurrentCrew(parsed);
        } else {
          setCurrentCrew(null);
        }
      } else {
        setCurrentCrew(null);
      }
    } catch {
      setCurrentCrew(null);
    }
  }, [emailLower]);

  const refreshCrew = useCallback(async () => {
    if (!emailLower) {
      setCurrentCrew(null);
      return;
    }

    try {
      const res = await fetch(resolveMediaUrl(`/api/family-crew/user/${encodeURIComponent(emailLower)}`));
      if (res.ok) {
        const data = await res.json();
        if (data && data.crew) {
          setCurrentCrew(data.crew);
          localStorage.setItem(`camper_family_crew_${emailLower}`, JSON.stringify(data.crew));
        } else {
          // No active crew for user
          setCurrentCrew(null);
          localStorage.removeItem(`camper_family_crew_${emailLower}`);
        }
      }
    } catch (err) {
      console.warn("Family crew refresh notice:", err);
    }
  }, [emailLower]);

  // Initial fetch and auto-refresh interval
  useEffect(() => {
    refreshCrew();

    // Auto-refresh when tab gains focus
    const handleFocus = () => {
      refreshCrew();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic background sync every 12 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshCrew();
      }
    }, 12000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshCrew]);

  const createCrew = async (name: string, syncModules?: Partial<CrewSyncModules>): Promise<boolean> => {
    if (!currentUser || !emailLower) return false;
    setIsLoading(true);
    try {
      const res = await fetch(resolveMediaUrl('/api/family-crew/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ownerEmail: emailLower,
          ownerName: currentUser.nickname || currentUser.name || emailLower.split('@')[0],
          syncModules: syncModules || {
            fuelCard: true,
            trips: true,
            checklists: true,
            pantry: true,
            maintenance: true
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.crew) {
          setCurrentCrew(data.crew);
          localStorage.setItem(`camper_family_crew_${emailLower}`, JSON.stringify(data.crew));
          window.dispatchEvent(new CustomEvent('family-crew-changed', { detail: data.crew }));
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: { message: `🚐 Equipaggio "${data.crew.name}" creato con successo! Codice Invito: ${data.crew.code}`, duration: 5000 }
            })
          );
          return true;
        }
      }
    } catch (err) {
      console.error("Error creating crew:", err);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const joinCrew = async (code: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !emailLower) {
      return { success: false, message: "Effettua l'accesso per unirti a un equipaggio." };
    }
    setIsLoading(true);
    try {
      const res = await fetch(resolveMediaUrl('/api/family-crew/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          user: {
            email: emailLower,
            nickname: currentUser.nickname || currentUser.name || emailLower.split('@')[0],
            profilePhoto: currentUser.profilePhoto
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.crew) {
        setCurrentCrew(data.crew);
        localStorage.setItem(`camper_family_crew_${emailLower}`, JSON.stringify(data.crew));
        window.dispatchEvent(new CustomEvent('family-crew-changed', { detail: data.crew }));
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: `🎉 Ti sei unito all'equipaggio "${data.crew.name}"!`, duration: 4000 }
          })
        );
        return { success: true };
      } else {
        return { success: false, message: data.error || "Codice invito non valido." };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Errore di connessione." };
    } finally {
      setIsLoading(false);
    }
  };

  const leaveCrew = async (): Promise<boolean> => {
    if (!currentCrew || !emailLower) return false;
    setIsLoading(true);
    try {
      const res = await fetch(resolveMediaUrl('/api/family-crew/leave'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crewId: currentCrew.id,
          email: emailLower
        })
      });

      if (res.ok) {
        setCurrentCrew(null);
        localStorage.removeItem('camper_family_crew');
        window.dispatchEvent(new CustomEvent('family-crew-changed', { detail: null }));
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: { message: "Hai lasciato l'equipaggio famiglia.", duration: 3000 }
          })
        );
        return true;
      }
    } catch (err) {
      console.error("Error leaving crew:", err);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const syncCrewSection = async (
    section: 'fuelLogs' | 'trips' | 'checklists' | 'pantry' | 'maintenance',
    data: any
  ): Promise<boolean> => {
    if (!currentCrew || !currentCrew.id) return false;

    // Check if module is enabled in crew settings
    const moduleKeyMap: Record<string, keyof CrewSyncModules> = {
      fuelLogs: 'fuelCard',
      trips: 'trips',
      checklists: 'checklists',
      pantry: 'pantry',
      maintenance: 'maintenance'
    };

    const modKey = moduleKeyMap[section];
    if (modKey && currentCrew.syncModules && currentCrew.syncModules[modKey] === false) {
      return false; // Module sync disabled for this crew
    }

    try {
      // Optimistic update
      const updatedCrew: FamilyCrew = {
        ...currentCrew,
        sharedData: {
          ...(currentCrew.sharedData || {}),
          [section]: data
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.nickname || currentUser?.name || emailLower
      };
      setCurrentCrew(updatedCrew);
      localStorage.setItem(`camper_family_crew_${emailLower}`, JSON.stringify(updatedCrew));

      // Network sync
      const res = await fetch(resolveMediaUrl(`/api/family-crew/sync/${encodeURIComponent(currentCrew.id)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          data,
          userEmail: emailLower,
          userName: currentUser?.nickname || currentUser?.name || emailLower
        })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.crew) {
          setCurrentCrew(resData.crew);
          localStorage.setItem('camper_family_crew', JSON.stringify(resData.crew));
        }
        return true;
      }
    } catch (err) {
      console.warn("Error syncing crew section:", err);
    }
    return false;
  };

  const updateCrewSettings = async (name?: string, syncModules?: Partial<CrewSyncModules>): Promise<boolean> => {
    if (!currentCrew || !emailLower) return false;
    try {
      const res = await fetch(resolveMediaUrl(`/api/family-crew/update-settings/${encodeURIComponent(currentCrew.id)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || currentCrew.name,
          syncModules: syncModules || currentCrew.syncModules,
          email: emailLower
        })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.crew) {
          setCurrentCrew(resData.crew);
          localStorage.setItem('camper_family_crew', JSON.stringify(resData.crew));
          window.dispatchEvent(
            new CustomEvent('show-toast', {
              detail: { message: "Impostazioni equipaggio salvate con successo.", duration: 3000 }
            })
          );
          return true;
        }
      }
    } catch (err) {
      console.error("Error updating crew settings:", err);
    }
    return false;
  };

  const isOwner = !!(currentCrew && emailLower && currentCrew.ownerEmail?.toLowerCase() === emailLower);

  const isModuleSynced = (module: keyof CrewSyncModules): boolean => {
    if (!currentCrew) return false;
    if (!currentCrew.syncModules) return true;
    return currentCrew.syncModules[module] !== false;
  };

  return (
    <FamilyCrewContext.Provider
      value={{
        currentCrew,
        isLoading,
        isOwner,
        createCrew,
        joinCrew,
        leaveCrew,
        syncCrewSection,
        updateCrewSettings,
        refreshCrew,
        isModuleSynced
      }}
    >
      {children}
    </FamilyCrewContext.Provider>
  );
}

export function useFamilyCrew() {
  const context = useContext(FamilyCrewContext);
  if (!context) {
    throw new Error('useFamilyCrew must be used within a FamilyCrewProvider');
  }
  return context;
}
