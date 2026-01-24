'use client';

import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import FirebaseErrorListener from '../FirebaseErrorListener';

type FirebaseAuthState = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<FirebaseAuthState>({
  user: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      <FirebaseErrorListener />
      {children}
    </AuthContext.Provider>
  );
}
