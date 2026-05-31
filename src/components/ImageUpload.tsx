'use client';

import { useState } from 'react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import Image from 'next/image';

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  endpoint?: 'imageUploader';
  className?: string;
}

export default function ImageUpload({ value, onChange, endpoint = 'imageUploader', className }: ImageUploadProps) {
  return (
    <div className={className}>
      {value ? (
        <div className="relative">
          <Image
            src={value}
            alt="Uploaded image"
            width={400}
            height={200}
            className="rounded-md object-cover w-full h-48"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <UploadButton<OurFileRouter, 'imageUploader'>
            endpoint={endpoint}
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                onChange(res[0].url);
              }
            }}
            onUploadError={(error: Error) => {
              console.error('Upload error:', error);
            }}
          />
          <p className="text-sm text-gray-500 mt-2">Upload an image (max 8MB)</p>
        </div>
      )}
    </div>
  );
}
