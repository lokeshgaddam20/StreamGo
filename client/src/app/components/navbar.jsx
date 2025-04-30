"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const NavBar = () => {
    const router = useRouter();
    const { data: session } = useSession();

    const goToUpload = () => {
        router.push('/upload');
    };

    return (
        <nav className="bg-gray-900 border-b border-gray-800">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <span className="text-2xl font-semibold text-white">StreamGO</span>
                    
                    {session && (
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={goToUpload}
                                variant="secondary"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Upload
                            </Button>
                            <Button
                                onClick={() => signOut()}
                                variant="outline"
                                className="text-white border-gray-600 hover:bg-gray-800"
                            >
                                Sign Out
                            </Button>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-300">
                                    {session.user.name}
                                </span>
                                <Avatar>
                                    <AvatarImage src={session.user.image} alt={session.user.name} />
                                    <AvatarFallback>
                                        {session.user.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
