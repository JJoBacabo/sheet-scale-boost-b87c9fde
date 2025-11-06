import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { currencies, useCurrency } from "@/contexts/CurrencyContext";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const [open, setOpen] = useState(false);
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="btn-glass h-10 px-4 gap-2"
          aria-label="Select currency"
        >
          <span className="text-sm font-semibold">{selectedCurrency.symbol}</span>
          <span className="text-sm font-semibold">{selectedCurrency.code}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Pesquisar país ou moeda..." />
          <CommandEmpty>Nenhuma moeda encontrada.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {currencies.map((currency) => (
              <CommandItem
                key={currency.code}
                value={`${currency.code} ${currency.name} ${currency.countries.join(' ')}`}
                onSelect={() => {
                  setSelectedCurrency(currency);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCurrency.code === currency.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{currency.symbol}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground">- {currency.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currency.countries.slice(0, 3).join(', ')}
                    {currency.countries.length > 3 && '...'}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
