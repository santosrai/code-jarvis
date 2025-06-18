"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  User,
  PlusSquare,
  HelpCircle,
  MessageSquare,
  Users,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { DISCORD_COMMUNITY_URL, HELP_TUTORIAL_URL } from "@/lib/constants";
import Link from "next/link";

const AppLogo: React.FC = () => (
  <div className="flex items-center gap-2">
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      fill="currentColor"
    >
      <path d="M50 5C25.16 5 5 25.16 5 50s20.16 45 45 45 45-20.16 45-45S74.84 5 50 5zm0 82c-20.43 0-37-16.57-37-37s16.57-37 37-37 37 16.57 37 37-16.57 37-37 37z" />
      <path d="M50 27.5c-12.42 0-22.5 10.08-22.5 22.5S37.58 72.5 50 72.5s22.5-10.08 22.5-22.5S62.42 27.5 50 27.5zm0 37c-7.99 0-14.5-6.51-14.5-14.5S42.01 35.5 50 35.5s14.5 6.51 14.5 14.5S57.99 64.5 50 64.5z" />
      <circle cx="35" cy="50" r="5" />
      <circle cx="65" cy="50" r="5" />
      <path d="M50 58c-4.41 0-8-3.59-8-8s3.59-8 8-8" />
    </svg>
    <h1 className="text-xl font-semibold text-foreground">Jarvis 1.01</h1>
  </div>
);

export const Header: React.FC = () => {
  const {
    setCurrentView,
    currentView,
    isChatHistoryPanelVisible,
    toggleChatHistoryPanelVisibility,
  } = useAppContext();

  const toggleProfileView = () => {
    setCurrentView(currentView === "profile" ? "chat" : "profile");
  };

  return (
    <header className="flex items-center justify-between p-3 border-b bg-card shadow-sm sticky top-0 z-50 h-16">
      <AppLogo />
      <div className="flex items-center gap-2">
        <Button
          variant={currentView === "profile" ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleProfileView}
        >
          {currentView === "profile" ? (
            <MessageSquare className="mr-2 h-4 w-4" />
          ) : (
            <User className="mr-2 h-4 w-4" />
          )}
          {currentView === "profile" ? "Chat View" : "Profile & Scripts"}
        </Button>

        <Button variant="ghost" size="icon" asChild>
          <Link
            href={DISCORD_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Community Discord"
          >
            <Users className="h-5 w-5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={HELP_TUTORIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Help and Tutorial"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </header>
  );
};