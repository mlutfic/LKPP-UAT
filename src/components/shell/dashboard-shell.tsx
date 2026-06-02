"use client";

import * as React from "react";

import { AppMobileNav } from "@/components/shell/app-mobile-nav";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { type AppRole } from "@/design-system/roles";
import { UserProfileCompletionModal } from "@/features/user/components/user-profile-completion-modal";
import { UserCallingAlert } from "@/features/user/components/user-calling-alert";
import { UserCallingVoiceManager } from "@/features/user/components/user-calling-voice-manager";
import { UserPushNotificationManager } from "@/features/user/components/user-push-notification-manager";
import { useMockUserProfile } from "@/hooks/use-mock-user-profile";
import { useUiStore } from "@/stores/ui-store";

export function DashboardShell({
  role,
  currentPath,
  title,
  subtitle,
  children,
}: {
  role: AppRole;
  currentPath: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  void title;
  void subtitle;
  const {
    profile,
    updateProfile,
    completionStatus,
    hasResolvedProfileCompletion,
  } = useMockUserProfile(role === "user");
  const shouldShowProfileCompletionModal =
    role === "user" &&
    Boolean(profile) &&
    hasResolvedProfileCompletion &&
    !completionStatus.isComplete &&
    !currentPath.startsWith("/bantuan") &&
    !currentPath.startsWith("/profil");

  return (
    <div data-role-theme={role} className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar
          role={role}
          currentPath={currentPath}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
        <div className="min-w-0 flex-1">
          <main
            className={`mx-auto max-w-7xl px-4 pb-32 sm:px-6 lg:px-8 lg:pb-10 ${
              role === "user" ? "pt-6 lg:pt-8" : "pt-8 lg:pt-9"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
      <AppMobileNav role={role} currentPath={currentPath} />
      {shouldShowProfileCompletionModal && profile ? (
        <UserProfileCompletionModal
          profile={profile}
          onSave={updateProfile}
        />
      ) : null}
      {role === "user" ? <UserCallingVoiceManager /> : null}
      {role === "user" ? <UserPushNotificationManager /> : null}
      {role === "user" ? <UserCallingAlert /> : null}
    </div>
  );
}
