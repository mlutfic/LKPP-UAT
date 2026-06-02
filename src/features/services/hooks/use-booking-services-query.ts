"use client";

import { useQuery } from "@tanstack/react-query";

import { bookingServices } from "@/content/service-booking-content";

export function useBookingServicesQuery() {
  return useQuery({
    queryKey: ["booking-services"],
    queryFn: async () => bookingServices,
    initialData: bookingServices,
  });
}
