import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { pt, enUS } from "date-fns/locale";

export type TimeframeOption = 
  | 'today'
  | 'yesterday'
  | 'today_yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_28_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'maximum';

export interface TimeframeValue {
  option: TimeframeOption;
  dateFrom: Date;
  dateTo: Date;
}

interface TimeframeSelectorProps {
  value?: TimeframeValue;
  onChange: (value: TimeframeValue) => void;
}

export const TimeframeSelector = ({ value, onChange }: TimeframeSelectorProps) => {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const locale = language === 'pt' ? pt : enUS;

  const getTimeframeDates = (option: TimeframeOption): { dateFrom: Date; dateTo: Date } => {
    const now = new Date();
    // Create today's date without time to avoid timezone issues
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (option) {
      case 'today':
        // For "today", use today's date as start and end
        // Database query compares only date (without time), so this works
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        todayEnd.setHours(23, 59, 59, 999);
        return { dateFrom: todayStart, dateTo: todayEnd };
      
      case 'yesterday':
        const yesterday = subDays(today, 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = subDays(today, 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { dateFrom: yesterday, dateTo: yesterdayEnd };
      
      case 'today_yesterday':
        const twoDaysAgo = subDays(today, 1);
        twoDaysAgo.setHours(0, 0, 0, 0);
        return { dateFrom: twoDaysAgo, dateTo: today };
      
      case 'last_7_days':
        const sevenDaysAgo = subDays(today, 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return { dateFrom: sevenDaysAgo, dateTo: today };
      
      case 'last_14_days':
        const fourteenDaysAgo = subDays(today, 13);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        return { dateFrom: fourteenDaysAgo, dateTo: today };
      
      case 'last_28_days':
        const twentyEightDaysAgo = subDays(today, 27);
        twentyEightDaysAgo.setHours(0, 0, 0, 0);
        return { dateFrom: twentyEightDaysAgo, dateTo: today };
      
      case 'last_30_days':
        const thirtyDaysAgo = subDays(today, 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return { dateFrom: thirtyDaysAgo, dateTo: today };
      
      case 'this_week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        return { dateFrom: weekStart, dateTo: today };
      
      case 'last_week':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return { dateFrom: lastWeekStart, dateTo: lastWeekEnd };
      
      case 'this_month':
        const monthStart = startOfMonth(today);
        return { dateFrom: monthStart, dateTo: today };
      
      case 'last_month':
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        return { dateFrom: lastMonthStart, dateTo: lastMonthEnd };
      
      case 'maximum':
        const maxDate = new Date(2020, 0, 1);
        return { dateFrom: maxDate, dateTo: today };
      
      default:
        return { dateFrom: subDays(today, 29), dateTo: today };
    }
  };

  const handleOptionChange = (option: TimeframeOption) => {
    const dates = getTimeframeDates(option);
    onChange({
      option,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
    });
    setOpen(false);
  };

  const currentValue = value || {
    option: 'last_30_days' as TimeframeOption,
    ...getTimeframeDates('last_30_days'),
  };

  const getLabel = (option: TimeframeOption): string => {
    const labels: Record<TimeframeOption, { pt: string; en: string }> = {
      today: { pt: 'Hoje', en: 'Today' },
      yesterday: { pt: 'Ontem', en: 'Yesterday' },
      today_yesterday: { pt: 'Hoje e ontem', en: 'Today and yesterday' },
      last_7_days: { pt: 'Últimos 7 dias', en: 'Last 7 days' },
      last_14_days: { pt: 'Últimos 14 dias', en: 'Last 14 days' },
      last_28_days: { pt: 'Últimos 28 dias', en: 'Last 28 days' },
      last_30_days: { pt: 'Últimos 30 dias', en: 'Last 30 days' },
      this_week: { pt: 'Esta semana', en: 'This week' },
      last_week: { pt: 'Última semana', en: 'Last week' },
      this_month: { pt: 'Este mês', en: 'This month' },
      last_month: { pt: 'O mês passado', en: 'Last month' },
      maximum: { pt: 'Máximo', en: 'Maximum' },
    };
    return labels[option][language];
  };

  const displayText = `${getLabel(currentValue.option)} (${format(currentValue.dateFrom, 'dd/MM/yyyy', { locale })} - ${format(currentValue.dateTo, 'dd/MM/yyyy', { locale })})`;

  const recentlyUsed: TimeframeOption[] = ['today', 'yesterday', 'last_30_days'];
  const allOptions: TimeframeOption[] = [
    'today',
    'yesterday',
    'today_yesterday',
    'last_7_days',
    'last_14_days',
    'last_28_days',
    'last_30_days',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'maximum',
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left glass-card border-border/50 h-9 sm:h-10 text-xs sm:text-sm">
          <Calendar className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-80 p-0 glass-card border-border/50" align="start">
        <div className="p-3 sm:p-4">
          <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-muted-foreground">
            {t('dashboard.recentlyUsed') || (language === 'pt' ? 'Utilizados recentemente' : 'Recently used')}
          </h4>
          <RadioGroup value={currentValue.option} onValueChange={handleOptionChange}>
            <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
              {recentlyUsed.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={option} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <Label htmlFor={option} className="cursor-pointer flex-1 text-xs sm:text-sm">
                    {getLabel(option)}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="border-t border-border/50 my-3 sm:my-4" />

          <RadioGroup value={currentValue.option} onValueChange={handleOptionChange}>
            <div className="space-y-1.5 sm:space-y-2">
              {allOptions.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={option} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <Label htmlFor={option} className="cursor-pointer flex-1 text-xs sm:text-sm">
                    {getLabel(option)}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
};

