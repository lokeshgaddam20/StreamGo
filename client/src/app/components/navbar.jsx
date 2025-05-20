"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Library, Settings, User, Video, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NavBar = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navigation = [
        // Home button removed as StreamGO title will navigate to home
        { name: 'Library', href: '/library', icon: Library },
        { name: 'Upload', href: '/upload', icon: Video, highlight: true },
    ];

    const profileNavigation = [
        { name: 'Your Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <header>
            <nav className="bg-white dark:bg-background border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo and brand - now clickable */}
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
                                StreamGO
                            </span>
                            <Badge variant="outline" className="hidden sm:flex ml-2 border-purple-500 text-purple-500 dark:border-purple-400 dark:text-purple-400">
                                Beta
                            </Badge>
                        </Link>

                        {/* Desktop navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        item.highlight
                                            ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600"
                                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop right section */}
                        <div className="hidden md:flex items-center gap-4">
                            {/* Theme toggle */}
                            <ThemeToggle />
                            
                            {session && (
                                <>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="relative text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                                    >
                                        <Bell className="h-5 w-5" />
                                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                                    </Button>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-900"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={session.user.image} alt={session.user.name} />
                                                    <AvatarFallback className="bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                                                        {session.user.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="hidden lg:inline text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {session.user.name}
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                                            <DropdownMenuLabel className="font-normal">
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium">{session.user.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{session.user.email}</p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
                                            
                                            {profileNavigation.map((item) => (
                                                <DropdownMenuItem 
                                                    key={item.name}
                                                    className="cursor-pointer text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-gray-800"
                                                    onClick={() => router.push(item.href)}
                                                >
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.name}</span>
                                                </DropdownMenuItem>
                                            ))}
                                            
                                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
                                            <DropdownMenuItem 
                                                className="cursor-pointer text-red-500 focus:bg-gray-100 dark:focus:bg-gray-800"
                                                onClick={() => signOut()}
                                            >
                                                <span>Sign Out</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex md:hidden items-center gap-3">
                            {/* Theme toggle */}
                            <ThemeToggle />
                            
                            {session && (
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="relative text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                                >
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                                </Button>
                            )}
                            
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMobileMenu}
                                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                            >
                                {mobileMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium",
                                        item.highlight
                                            ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                                    )}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            {session && (
                                <>
                                    <div className="pt-4 pb-2">
                                        <div className="flex items-center gap-3 px-3">
                                            <Avatar>
                                                <AvatarImage src={session.user.image} alt={session.user.name} />
                                                <AvatarFallback className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                                                    {session.user.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{session.user.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{session.user.email}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                                        {profileNavigation.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <item.icon className="h-5 w-5" />
                                                {item.name}
                                            </Link>
                                        ))}
                                        
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start px-3 py-2 mt-1 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                signOut();
                                            }}
                                        >
                                            Sign Out
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default NavBar;