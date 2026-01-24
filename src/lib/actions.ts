'use server';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { ReportSchema, type ItemReport, ClaimFormSchema, type UserProfile } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// The submitReport server action was moved to the client-side in `src/components/report/item-report-form.tsx`.
// This was necessary to ensure that the Firebase authentication context (`request.auth`) is available
// when creating an item, which is required by the Firestore security rules.
