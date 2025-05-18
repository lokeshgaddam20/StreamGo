"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  User, 
  VideoIcon, 
  History, 
  BookMarked, 
  Bell,
  Upload,
  Save
} from "lucide-react";
import NavBar from "../components/navbar";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("videos");
  const [profileData, setProfileData] = useState({
    displayName: session?.user?.name || "",
    bio: "Educational content creator passionate about sharing knowledge.",
    email: session?.user?.email || "",
    notifications: true
  });

  // Mock data for the profile
  const userVideos = [
    { id: 1, title: "Introduction to React Hooks", views: "1.2K", uploaded: "2 weeks ago" },
    { id: 2, title: "Advanced CSS Techniques", views: "856", uploaded: "1 month ago" },
    { id: 3, title: "Building a REST API with Node.js", views: "2.3K", uploaded: "3 months ago" }
  ];

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = () => {
    // Here you would implement the API call to save profile changes
    console.log("Saving profile data:", profileData);
    // Show success message
    alert("Profile updated successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500">
            <Image
              src={session?.user?.image || "https://placehold.co/200x200"}
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold">{profileData.displayName}</h1>
            <p className="text-muted-foreground mt-2">{profileData.bio}</p>
            
            <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
              <div className="text-center">
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
              <Separator orientation="vertical" className="h-12 hidden sm:block" />
              <div className="text-center">
                <p className="text-2xl font-bold">12.4K</p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
              <Separator orientation="vertical" className="h-12 hidden sm:block" />
              <div className="text-center">
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
              onClick={() => window.location.href = "/upload"}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>
        
        {/* Profile Tabs */}
        <Tabs defaultValue="videos" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-5 mb-8">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <BookMarked className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userVideos.length > 0 ? (
                userVideos.map(video => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted-foreground/20 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoIcon className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{video.title}</h3>
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>{video.views} views</span>
                        <span>{video.uploaded}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="destructive">Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <VideoIcon className="w-16 h-16 mx-auto text-muted-foreground/40" />
                  <h3 className="mt-4 text-xl font-semibold">No videos yet</h3>
                  <p className="text-muted-foreground mt-2">Upload your first educational video to get started</p>
                  <Button 
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    onClick={() => window.location.href = "/upload"}
                  >
                    Upload a Video
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Watch History</CardTitle>
                <CardDescription>Videos you've watched recently</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground py-8">
                    Your watch history will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Videos</CardTitle>
                <CardDescription>Videos you've bookmarked for later</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground py-8">
                    Your saved videos will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground py-8">
                    You have no new notifications
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                      id="displayName" 
                      value={profileData.displayName}
                      onChange={(e) => handleInputChange("displayName", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profileData.email} 
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={profileData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={profileData.notifications}
                      onChange={(e) => handleInputChange("notifications", e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="notifications">Receive email notifications</Label>
                  </div>
                  
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}