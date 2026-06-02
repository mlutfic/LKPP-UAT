"use client";

import { useQuery } from "@tanstack/react-query";

import { userAppointments } from "@/content/user-appointments-content";

export function useUserAppointmentsQuery() {
  return useQuery({
    queryKey: ["user-appointments"],
    queryFn: async () => userAppointments,
    initialData: userAppointments,
  });
}
