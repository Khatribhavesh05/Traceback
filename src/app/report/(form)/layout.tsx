import React from 'react';

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center w-full min-h-full py-12 bg-secondary/50">
      {children}
    </div>
  );
}
