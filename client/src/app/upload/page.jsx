"use client"
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import NavBar from '../components/navbar';

const UploadForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState(session?.user?.name || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileKey, setFileKey] = useState(null);

  if (!session) {
    redirect('/');
  }

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!title || !author) {
      alert('Title and Author are required fields.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Initialize upload
      const formData = new FormData();
      formData.append('filename', selectedFile.name);
      const initializeRes = await axios.post('http://localhost:8080/upload/initialize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { uploadId, key } = initializeRes.data;
      setFileKey(key);
      
      // Upload chunks
      const chunkSize = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);
      let start = 0;
      const uploadPromises = [];
      const partETags = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = selectedFile.slice(start, start + chunkSize);
        start += chunkSize;
        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('key', key);
        chunkFormData.append('uploadId', uploadId);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('totalChunks', totalChunks);

        const uploadPromise = axios.post('http://localhost:8080/upload', chunkFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = ((chunkIndex + 1) / totalChunks) * 100;
            setUploadProgress(Math.min(progress, 99));
          }
        }).then(response => {
          if (response.data.ETag) {
            partETags.push({
              PartNumber: chunkIndex + 1,
              ETag: response.data.ETag
            });
          }
          return response;
        });
        
        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);

      // Complete upload
      const completeRes = await axios.post('http://localhost:8080/upload/complete', {
        uploadId,
        key,
        title,
        description,
        author
      });

      setUploadProgress(100);
      alert('Upload successful!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setFileKey(null);
      setUploadProgress(0);
      
      // Redirect to home page after successful upload
      router.push('/');
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="max-w-2xl mx-auto p-6">
        <Card className="bg-gray-800 text-white">
          <CardHeader>
            <CardTitle>Upload Educational Content</CardTitle>
            <CardDescription className="text-gray-400">Share your knowledge with the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                type="text"
                placeholder="Video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                type="text"
                placeholder="Video description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Author</label>
              <Input
                type="text"
                placeholder="Author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Video File</label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept="video/*"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {uploading && (
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
            >
              {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadForm;
