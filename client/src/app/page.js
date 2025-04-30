"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";
import YouTubeHome from "./pages/youtubehome";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-white/5 backdrop-blur-lg text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold mb-2">Welcome to StreamGO</CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Your ultimate platform for educational content streaming
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-300">Share and discover educational content with ease</p>
              <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                <li>High-quality educational video streaming</li>
                <li>Easy content upload and management</li>
                <li>Seamless learning experience</li>
              </ul>
            </div>
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => signIn("google")}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                Sign in with Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <YouTubeHome />;
}
