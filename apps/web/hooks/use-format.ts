"use client";

import { useLocale } from "@/context/locale-context";

/**
 * Hook that provides formatting functions using the user's locale.
 * All date/time formatting will respect the user's preferred locale.
 */
export function useFormat() {
  const { locale } = useLocale();

  const UTC_TIME: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  };

  const UTC_CLOCK: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  };

  const UTC_DATE: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  };

  const formatTime = (iso: string | undefined | null): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(locale, UTC_TIME);
  };

  const formatClock = (iso: string | undefined | null): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(locale, UTC_CLOCK);
  };

  const formatDateTime = (iso: string | undefined | null): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(locale, UTC_DATE);
  };

  const formatNumber = (value: number, digits = 0): string => {
    return value.toLocaleString(locale, {
      maximumFractionDigits: digits,
    });
  };

  return {
    locale,
    formatTime,
    formatClock,
    formatDateTime,
    formatNumber,
  };
}
