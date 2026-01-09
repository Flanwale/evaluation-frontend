"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Patient } from "@/types/clinical";

interface PatientSwitcherProps {
  patients: Patient[];
  selectedId: string | null;
  onSelect: (id: string) => void;

  /** ✅ 可选：允许外部传 className 控制宽度（不传也能自适应父容器） */
  className?: string;
}

export function PatientSwitcher({
  patients,
  selectedId,
  onSelect,
  className,
}: PatientSwitcherProps) {
  const [open, setOpen] = React.useState(false);

  const selectedPatient = React.useMemo(
    () => patients.find((p) => String(p.id) === String(selectedId)),
    [patients, selectedId]
  );

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            suppressHydrationWarning
            className={cn(
              "w-full min-w-0 justify-between h-9 bg-white border-slate-200 text-slate-700 shadow-sm",
              "px-3"
            )}
          >
            {selectedPatient ? (
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="truncate font-medium">
                  {selectedPatient.subject_label}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 truncate">🔍 搜索或选择患者...</span>
            )}

            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>

        {/* ✅ 下拉宽度跟随触发器：w-[var(--radix-popover-trigger-width)] */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            "p-0",
            "w-[var(--radix-popover-trigger-width)]",
            "min-w-[220px]"
          )}
        >
          <Command>
            <CommandInput placeholder="输入编号搜索..." />
            <CommandList>
              <CommandEmpty>未找到该患者</CommandEmpty>

              <CommandGroup>
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.subject_label ?? ""} ${patient.protocol_id ?? ""}`}
                    onSelect={() => {
                      onSelect(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(selectedId) === String(patient.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{patient.subject_label || "-"}</span>
                      <span className="text-xs text-slate-400 truncate">
                        {patient.protocol_id || "-"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
