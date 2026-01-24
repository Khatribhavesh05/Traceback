'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadFile } from '@/hooks/use-upload-file';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Trash2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onUploadComplete: (url: string, path: string) => void;
}

export default function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { progress, url, isUploading, startUpload } = useUploadFile();

  const handleFileChange = (acceptedFiles: File[]) => {
    setError(null);
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    setFile(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
    
    startUpload(selectedFile)
      .then(uploadResult => {
        if(uploadResult) {
            onUploadComplete(uploadResult.url, uploadResult.path);
        }
      })
      .catch(uploadError => {
        setError(uploadError.message || 'Upload failed. Please try again.');
        setFile(null);
        setPreview(null);
      });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileChange,
    multiple: false,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  });

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    // Note: We don't have a way to cancel the upload via the hook, but we can reset the UI.
  };

  if (url) {
    return (
      <div className="p-4 border-2 border-dashed rounded-lg border-green-500 bg-green-50">
        <div className="flex items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Upload Successful</p>
            <p className="text-sm text-green-700">{file?.name}</p>
          </div>
           <Button variant="ghost" size="icon" onClick={resetState} className="ml-auto">
            <Trash2 className="w-5 h-5 text-gray-500 hover:text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="p-4 border-2 border-dashed rounded-lg">
        <div className="flex items-center gap-4">
          {preview ? (
            <Image src={preview} alt="Preview" width={40} height={40} className="object-cover rounded-md" />
          ) : (
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-foreground">Uploading {file?.name}...</p>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 text-muted-foreground" />
        <p className="mt-4 text-center text-muted-foreground">
          {isDragActive ? 'Drop the image here...' : "Drag 'n' drop an image here, or click to select"}
        </p>
      </div>

      {preview && file && (
        <div className="flex items-center gap-4 p-2 border rounded-lg">
          <Image src={preview} alt={file.name} width={64} height={64} className="object-cover rounded-md" />
          <div className="flex-1">
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
          <Button variant="ghost" size="icon" onClick={resetState}>
            <Trash2 className="w-5 h-5 text-gray-500 hover:text-destructive" />
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
