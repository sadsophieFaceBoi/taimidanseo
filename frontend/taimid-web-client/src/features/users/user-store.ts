//The current user store implementation using zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from './user-models';

interface UserStoreState {
    currentUser: User | null;
}

interface UserStoreActions {
    setCurrentUser: (user: User | null) => void;
    clearUserData: () => void;
}

type UserStore = UserStoreState & UserStoreActions;

const storage = typeof window !== 'undefined'
    ? createJSONStorage<UserStoreState>(() => localStorage)
    : undefined;

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            currentUser: null,
            setCurrentUser: (user: User | null) => set({ currentUser: user }),
            clearUserData: () => set({ currentUser: null }),
        }),
        {
            name: 'currentUser',
            partialize: (state: UserStore) => ({ currentUser: state.currentUser }),
            storage,
        },
    ),
);