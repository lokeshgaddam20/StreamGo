"use client"
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import NavBar from '../components/navbar';

const UploadForm = () => {
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState(session?.user?.name || '');
  const [uploading, setUploading] = useState(false);

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
      const formData = new FormData();
      formData.append('filename', selectedFile.name);
      const initializeRes = await axios.post('http://localhost:8080/upload/initialize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { uploadId } = initializeRes.data;
      const chunkSize = 5 * 1024 * 1024; // 5 MB chunks
      const totalChunks = Math.ceil(selectedFile.size / chunkSize);
      let start = 0;
      const uploadPromises = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = selectedFile.slice(start, start + chunkSize);
        start += chunkSize;
        const chunkFormData = new FormData();
        chunkFormData.append('filename', selectedFile.name);
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('totalChunks', totalChunks);
        chunkFormData.append('chunkIndex', chunkIndex);
        chunkFormData.append('uploadId', uploadId);

        const uploadPromise = axios.post('http://localhost:8080/upload', chunkFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        uploadPromises.push(uploadPromise);
      }

      await Promise.all(uploadPromises);

      const completeRes = await axios.post('http://localhost:8080/upload/complete', {
        uploadId,
        title,
        description,
        author
      });

      alert('Upload successful!');
      setTitle('');
      setDescription('');
      setSelectedFile(null);
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
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadForm;
