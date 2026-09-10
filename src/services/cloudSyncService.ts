import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebaseConfig';
import type { ChatSession, GoldenExample, Agent } from '../types';

/**
 * --- Authentication Helpers ---
 */

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAnonymouslyUser(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * --- Cloud Firestore Data Sync ---
 */

// 1. Chat Sessions Sync
export async function saveSessionToCloud(userId: string, session: ChatSession): Promise<void> {
  if (!userId || !session.id) return;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    
    // Sanitize attachments (strip large base64 strings to save bandwidth and fit under 1MB limit)
    const sanitizedMessages = session.messages.slice(-30).map((m) => ({
      ...m,
      attachments: m.attachments?.map((att) => ({
        ...att,
        base64Data: '', // Strip base64
      })),
    }));

    await setDoc(
      sessionRef,
      {
        id: session.id,
        title: session.title || 'Cuộc trò chuyện mới',
        agentId: session.agentId || 'general',
        agentName: session.agentName || 'Gemini Trợ Lý',
        agentAvatar: session.agentAvatar || '🤖',
        createdAt: session.createdAt || new Date().toISOString(),
        updatedAt: session.updatedAt || new Date().toISOString(),
        messages: sanitizedMessages,
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save session to cloud:', err);
  }
}

export async function syncAllSessionsToCloud(userId: string, sessions: ChatSession[]): Promise<void> {
  if (!userId || !Array.isArray(sessions)) return;
  // Sync up to 25 latest sessions
  const targetSessions = sessions.slice(0, 25);
  for (const s of targetSessions) {
    await saveSessionToCloud(userId, s);
  }
}

export async function loadSessionsFromCloud(userId: string): Promise<ChatSession[]> {
  if (!userId) return [];
  try {
    const sessionsCol = collection(db, 'users', userId, 'sessions');
    const snapshot = await getDocs(sessionsCol);
    const cloudSessions: ChatSession[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.id) {
        cloudSessions.push({
          id: data.id,
          title: data.title,
          agentId: data.agentId,
          agentName: data.agentName,
          agentAvatar: data.agentAvatar,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          messages: Array.isArray(data.messages) ? data.messages : [],
        });
      }
    });

    // Sort by updatedAt descending
    return cloudSessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (err) {
    console.warn('Failed to load sessions from cloud:', err);
    return [];
  }
}

export async function deleteSessionFromCloud(userId: string, sessionId: string): Promise<void> {
  if (!userId || !sessionId) return;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    console.warn('Failed to delete session from cloud:', err);
  }
}

// 2. Golden Examples (Few-Shot) Sync
export async function syncAllGoldenExamplesToCloud(
  userId: string,
  examples: GoldenExample[]
): Promise<void> {
  if (!userId || !Array.isArray(examples)) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'profile', 'golden_examples');
    await setDoc(
      userDocRef,
      {
        examples: examples.slice(0, 50),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync golden examples to cloud:', err);
  }
}

export async function loadGoldenExamplesFromCloud(userId: string): Promise<GoldenExample[]> {
  if (!userId) return [];
  try {
    const userDocRef = doc(db, 'users', userId, 'profile', 'golden_examples');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.examples)) {
        return data.examples as GoldenExample[];
      }
    }
    return [];
  } catch (err) {
    console.warn('Failed to load golden examples from cloud:', err);
    return [];
  }
}

// 3. Custom Agents Sync
export async function syncAllCustomAgentsToCloud(userId: string, agents: Agent[]): Promise<void> {
  if (!userId || !Array.isArray(agents)) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'profile', 'custom_agents');
    await setDoc(
      userDocRef,
      {
        agents,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync custom agents to cloud:', err);
  }
}

export async function loadCustomAgentsFromCloud(userId: string): Promise<Agent[]> {
  if (!userId) return [];
  try {
    const userDocRef = doc(db, 'users', userId, 'profile', 'custom_agents');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.agents)) {
        return data.agents as Agent[];
      }
    }
    return [];
  } catch (err) {
    console.warn('Failed to load custom agents from cloud:', err);
    return [];
  }
}
