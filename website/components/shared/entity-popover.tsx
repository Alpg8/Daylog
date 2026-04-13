"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DetailItem {
  label: string;
  value: React.ReactNode;
}

interface EntityPopoverProps {
  trigger: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  items: DetailItem[];
}

import React from "react";

export function EntityPopover({ trigger, title, subtitle, items }: EntityPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer rounded px-1 py-0.5 text-left font-medium text-blue-300 underline-offset-2 transition-colors hover:bg-white/10 hover:text-blue-200">
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {/* Header */}
        <div className="mb-3 border-b border-white/10 pb-3">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <div className="mt-0.5">{subtitle}</div>}
        </div>
        {/* Items */}
        <div className="space-y-2">
          {items.filter(i => i.value !== null && i.value !== undefined && i.value !== "").map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-2">
              <span className="shrink-0 text-xs text-white/40">{item.label}</span>
              <span className="text-right text-xs font-medium text-white/80">{item.value ?? "—"}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
