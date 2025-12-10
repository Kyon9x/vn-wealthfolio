import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ThemeSelector({ value, onChange, className }: ThemeSelectorProps) {
  return (
    <RadioGroup
      onValueChange={onChange}
      defaultValue={value}
      className={cn("grid grid-cols-3 gap-2 md:gap-4", className)}
    >
      <FormItem>
        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
          <FormControl>
            <RadioGroupItem value="light" className="sr-only" />
          </FormControl>
          <div className="border-muted hover:border-accent items-center rounded-md border-2 p-2">
            <div className="space-y-1 rounded-sm bg-white p-1 sm:space-y-2 sm:p-2 border border-slate-100">
              <div className="space-y-1 rounded-md bg-slate-50 p-1 sm:p-2">
                <div className="h-1 w-[40px] rounded-lg bg-slate-200 sm:h-2 sm:w-[80px]" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-200 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-200 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-200 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-200 sm:h-2 sm:w-[100px]" />
              </div>
            </div>
          </div>
          <span className="block w-full p-1 text-center text-xs font-normal sm:p-2 sm:text-sm">
            Light
          </span>
        </FormLabel>
      </FormItem>
      <FormItem>
        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
          <FormControl>
            <RadioGroupItem value="dark" className="sr-only" />
          </FormControl>
          <div className="dark border-muted bg-popover hover:bg-accent hover:text-accent-foreground items-center rounded-md border-2 p-2">
            <div className="space-y-1 rounded-sm bg-slate-950 p-1 sm:space-y-2 sm:p-2">
              <div className="space-y-1 rounded-md bg-slate-900 p-1 sm:p-2">
                <div className="h-1 w-[40px] rounded-lg bg-slate-800 sm:h-2 sm:w-[80px]" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-800 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-800 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-800 sm:h-2 sm:w-[100px]" />
              </div>
              <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:space-x-2 sm:p-2">
                <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                <div className="h-1 w-[50px] rounded-lg bg-slate-800 sm:h-2 sm:w-[100px]" />
              </div>
            </div>
          </div>
          <span className="block w-full p-1 text-center text-xs font-normal sm:p-2 sm:text-sm">
            Dark
          </span>
        </FormLabel>
      </FormItem>
      <FormItem>
        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
          <FormControl>
            <RadioGroupItem value="system" className="sr-only" />
          </FormControl>
          <div className="border-muted hover:border-accent items-center rounded-md border-2 p-2">
            <div className="flex overflow-hidden rounded-sm">
              {/* Light half - left side */}
              <div className="w-1/2 space-y-1 bg-white p-1 sm:space-y-2 sm:p-2 border-l border-t border-b border-slate-100">
                <div className="space-y-1 rounded-md bg-slate-50 p-1 sm:p-2">
                  <div className="h-1 w-[20px] rounded-lg bg-slate-200 sm:h-2 sm:w-[40px]" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-200 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-200 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-200 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-50 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-200 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-200 sm:h-2 sm:w-[50px]" />
                </div>
              </div>
              {/* Dark half - right side */}
              <div className="dark w-1/2 space-y-1 bg-slate-950 p-1 sm:space-y-2 sm:p-2">
                <div className="space-y-1 rounded-md bg-slate-900 p-1 sm:p-2">
                  <div className="h-1 w-[20px] rounded-lg bg-slate-800 sm:h-2 sm:w-[40px]" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-800 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-800 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-800 sm:h-2 sm:w-[50px]" />
                </div>
                <div className="flex items-center space-x-1 rounded-md bg-slate-900 p-1 sm:p-2">
                  <div className="h-2 w-2 rounded-full bg-slate-800 sm:h-4 sm:w-4" />
                  <div className="h-1 w-[25px] rounded-lg bg-slate-800 sm:h-2 sm:w-[50px]" />
                </div>
              </div>
            </div>
          </div>
          <span className="block w-full p-1 text-center text-xs font-normal sm:p-2 sm:text-sm">
            System
          </span>
        </FormLabel>
      </FormItem>
    </RadioGroup>
  );
}
