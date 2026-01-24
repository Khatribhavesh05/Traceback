'use client';

import { useState } from 'react';
import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface UploadResult {
    url: string;
    path: string;
}

export function useUploadFile() {
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startUpload = (file: File): Promise<UploadResult | null> => {
    return new Promise((resolve, reject) => {
      if (!file) {
        const err = new Error("No file selected.");
        setError(err);
        reject(err);
        return;
      }

      setIsUploading(true);
      setError(null);
      setUrl(null);
      setProgress(0);

      const filePath = `items/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(currentProgress);
        },
        (error) => {
          console.error("Upload failed:", error);
          setError(error);
          setIsUploading(false);
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setUrl(downloadURL);
            setIsUploading(false);
            const result = { url: downloadURL, path: filePath };
            resolve(result);
          }).catch(error => {
            console.error("Failed to get download URL:", error);
            setError(error);
            setIsUploading(false);
            reject(error);
          });
        }
      );
    });
  };
  
  return { progress, url, isUploading, error, startUpload };
}
