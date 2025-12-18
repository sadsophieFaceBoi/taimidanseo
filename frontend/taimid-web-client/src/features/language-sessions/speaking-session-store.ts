//a zustand store for the users current speaking session. It should persist across sessions using zustand persist middleware
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SpeakingSession } from './speaking-session-models';
interface SpeakingSessionStoreState {
    currentSpeakingSession: SpeakingSession | null;
    nearbySpeakingSessions: SpeakingSession[];

}
interface SpeakingSessionStoreActions {
    setCurrentSpeakingSession: (session: SpeakingSession | null) => void;
    clearSpeakingSessionData: () => void;
    setNearbySpeakingSessions: (sessions: SpeakingSession[]) => void;
    clearNearbySpeakingSessions: () => void;
}
type SpeakingSessionStore = SpeakingSessionStoreState & SpeakingSessionStoreActions;
const storage = typeof window !== 'undefined'
    ? createJSONStorage<Pick<SpeakingSessionStoreState, 'currentSpeakingSession'>>(() => localStorage)
    : undefined;
export const useSpeakingSessionStore = create<SpeakingSessionStore>()(
    persist(
        (set) => ({
            currentSpeakingSession: null,
            setCurrentSpeakingSession: (session: SpeakingSession | null) => set({ currentSpeakingSession: session }),
            clearSpeakingSessionData: () => set({ currentSpeakingSession: null }),
            nearbySpeakingSessions: [],
            setNearbySpeakingSessions: (sessions: SpeakingSession[]) => set({ nearbySpeakingSessions: sessions }),
            clearNearbySpeakingSessions: () => set({ nearbySpeakingSessions: [] }),
        }),
        {
            name: 'currentSpeakingSession',
            partialize: (state: SpeakingSessionStore) => ({ currentSpeakingSession: state.currentSpeakingSession }),
            storage,

        },

    ),
);
