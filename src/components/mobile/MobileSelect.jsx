import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}

/**
 * MobileSelect – renders a native-feeling Vaul bottom sheet on mobile
 * and the standard shadcn Select on desktop.
 *
 * Props:
 *  value, onValueChange, placeholder, disabled, triggerClassName
 *  options: Array<{ value: string, label: string }>
 */
export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'Selecione...',
  options = [],
  disabled = false,
  triggerClassName,
  title,
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName
          )}
        >
          <span className={cn(!selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-gray-900 rounded-t-2xl flex flex-col max-h-[70vh] outline-none">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full mt-3 mb-1 shrink-0" />

          {title && (
            <p className="px-5 pt-2 pb-1 text-sm font-semibold text-gray-700 border-b border-gray-100">
              {title}
            </p>
          )}

          <div className="overflow-y-auto pb-10 pt-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'w-full flex items-center justify-between px-5 py-3.5 text-sm transition-colors active:bg-gray-100',
                    isSelected
                      ? 'text-emerald-700 font-semibold bg-emerald-50'
                      : 'text-gray-800 hover:bg-gray-50'
                  )}
                  onClick={() => {
                    onValueChange(opt.value);
                    setDrawerOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}