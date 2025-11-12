import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Download, BookmarkPlus, ExternalLink, Loader2, Bookmark, TrendingUp, Calendar, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FacebookAd {
  id: string;
  ad_creative_bodies?: string[];
  ad_snapshot_url?: string;
  page_name?: string;
  impressions?: {
    lower_bound: string;
    upper_bound: string;
  };
  spend?: {
    lower_bound: string;
    upper_bound: string;
  };
  spend_amount?: number;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  days_active?: number;
}

const EUROPEAN_COUNTRIES = [
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "GB", name: "United Kingdom" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "RO", name: "Romania" },
  { code: "GR", name: "Greece" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "NO", name: "Norway" },
  { code: "IE", name: "Ireland" },
  { code: "HR", name: "Croatia" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "BG", name: "Bulgaria" },
  { code: "HU", name: "Hungary" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" },
  { code: "LU", name: "Luxembourg" },
  { code: "IS", name: "Iceland" },
  { code: "AL", name: "Albania" },
  { code: "MK", name: "North Macedonia" },
  { code: "RS", name: "Serbia" },
  { code: "ME", name: "Montenegro" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "XK", name: "Kosovo" },
  { code: "MD", name: "Moldova" },
  { code: "UA", name: "Ukraine" },
  { code: "BY", name: "Belarus" },
];

const MIN_IMPRESSIONS_OPTIONS = [
  { value: "0", label: "No minimum" },
  { value: "5000", label: "5,000+" },
  { value: "15000", label: "15,000+" },
  { value: "50000", label: "50,000+" },
  { value: "100000", label: "100,000+" },
];

export default function ProductResearch() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("PT");
  const [datePeriod, setDatePeriod] = useState("30");
  const [minImpressions, setMinImpressions] = useState("0");
  const [sortBy, setSortBy] = useState("recent");
  const [isSearching, setIsSearching] = useState(false);
  const [ads, setAds] = useState<FacebookAd[]>([]);
  const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSavedAds();
  }, []);

  const loadSavedAds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_ads')
        .select('ad_library_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedAdIds(new Set(data?.map(ad => ad.ad_library_id) || []));
    } catch (error) {
      console.error('Error loading saved ads:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error(t('productResearch.enterSearchTerm'));
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-ads-research', {
        body: {
          searchTerms: searchTerm,
          datePeriod: parseInt(datePeriod),
          countries: [country],
          minImpressions: parseInt(minImpressions)
        }
      });

      if (error) throw error;

      if (data?.success && data?.ads) {
        let sortedAds = [...data.ads];

        // Sort results
        if (sortBy === 'recent') {
          sortedAds.sort((a, b) => 
            new Date(b.ad_delivery_start_time || 0).getTime() - 
            new Date(a.ad_delivery_start_time || 0).getTime()
          );
        } else if (sortBy === 'oldest') {
          sortedAds.sort((a, b) => 
            new Date(a.ad_delivery_start_time || 0).getTime() - 
            new Date(b.ad_delivery_start_time || 0).getTime()
          );
        } else if (sortBy === 'impressions-high') {
          sortedAds.sort((a, b) => {
            const aImpressions = parseInt(a.impressions?.upper_bound || '0');
            const bImpressions = parseInt(b.impressions?.upper_bound || '0');
            return bImpressions - aImpressions;
          });
        } else if (sortBy === 'impressions-low') {
          sortedAds.sort((a, b) => {
            const aImpressions = parseInt(a.impressions?.upper_bound || '0');
            const bImpressions = parseInt(b.impressions?.upper_bound || '0');
            return aImpressions - bImpressions;
          });
        } else if (sortBy === 'spend-high') {
          sortedAds.sort((a, b) => {
            const aSpend = a.spend_amount || 0;
            const bSpend = b.spend_amount || 0;
            return bSpend - aSpend;
          });
        } else if (sortBy === 'spend-low') {
          sortedAds.sort((a, b) => {
            const aSpend = a.spend_amount || 0;
            const bSpend = b.spend_amount || 0;
            return aSpend - bSpend;
          });
        } else if (sortBy === 'days-long') {
          sortedAds.sort((a, b) => (b.days_active || 0) - (a.days_active || 0));
        } else if (sortBy === 'days-short') {
          sortedAds.sort((a, b) => (a.days_active || 0) - (b.days_active || 0));
        }

        setAds(sortedAds);
        toast.success(t('productResearch.foundAds', { count: sortedAds.length }));
      } else {
        toast.error(t('productResearch.noAdsFound'));
        setAds([]);
      }
    } catch (error: any) {
      console.error('Error searching ads:', error);
      toast.error(t('productResearch.searchError'));
      setAds([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveAd = async (ad: FacebookAd) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('productResearch.loginRequired'));
        return;
      }

      // Check if already saved
      if (savedAdIds.has(ad.id)) {
        // Unsave
        const { error } = await supabase
          .from('saved_ads')
          .delete()
          .eq('user_id', user.id)
          .eq('ad_library_id', ad.id);

        if (error) throw error;

        setSavedAdIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(ad.id);
          return newSet;
        });

        toast.success(t('productResearch.adRemoved'));
      } else {
        // Save
        const { error } = await supabase
          .from('saved_ads')
          .insert({
            user_id: user.id,
            ad_library_id: ad.id,
            page_name: ad.page_name || '',
            ad_text: ad.ad_creative_bodies?.[0] || '',
            snapshot_url: ad.ad_snapshot_url || '',
            spend: ad.impressions?.upper_bound || '',
            impressions: ad.impressions?.upper_bound || '',
          });

        if (error) throw error;

        setSavedAdIds(prev => new Set(prev).add(ad.id));
        toast.success(t('productResearch.adSaved'));
      }
    } catch (error: any) {
      console.error('Error saving ad:', error);
      toast.error(t('productResearch.saveError'));
    }
  };

  const handleExportCSV = () => {
    const adsToExport = ads.filter(ad => selectedAds.has(ad.id));
    
    if (adsToExport.length === 0) {
      toast.error(t('productResearch.selectAdsToExport'));
      return;
    }

    // Create CSV content
    const headers = ['ID', 'Page Name', 'Ad Text', 'Snapshot URL', 'Impressions', 'Days Active', 'Start Date'];
    const rows = adsToExport.map(ad => [
      ad.id,
      ad.page_name || '',
      (ad.ad_creative_bodies?.[0] || '').replace(/,/g, ';').replace(/\n/g, ' '),
      ad.ad_snapshot_url || '',
      ad.impressions?.upper_bound || '',
      ad.days_active || '',
      ad.ad_delivery_start_time || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facebook-ads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(t('productResearch.exportSuccess'));
  };

  const toggleAdSelection = (adId: string) => {
    setSelectedAds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adId)) {
        newSet.delete(adId);
      } else {
        newSet.add(adId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAds.size === ads.length) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(ads.map(ad => ad.id)));
    }
  };

  return (
    <PageLayout
      title={t('productResearch.title')}
      subtitle={t('productResearch.subtitle')}
    >
      <div className="space-y-6">
        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('productResearch.searchFilters')}</CardTitle>
            <CardDescription>{t('productResearch.searchDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>{t('productResearch.keyword')}</Label>
                <Input
                  placeholder={t('productResearch.keywordPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('productResearch.country')}</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {EUROPEAN_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('productResearch.dateRange')}</Label>
                <Select value={datePeriod} onValueChange={setDatePeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t('productResearch.last7Days')}</SelectItem>
                    <SelectItem value="30">{t('productResearch.last30Days')}</SelectItem>
                    <SelectItem value="90">{t('productResearch.last90Days')}</SelectItem>
                    <SelectItem value="365">{t('productResearch.lastYear')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('productResearch.minImpressions')}</Label>
                <Select value={minImpressions} onValueChange={setMinImpressions}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MIN_IMPRESSIONS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('productResearch.sortBy')}</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t('productResearch.mostRecent')}</SelectItem>
                    <SelectItem value="oldest">{t('productResearch.oldestFirst')}</SelectItem>
                    <SelectItem value="impressions-high">{t('productResearch.mostImpressions')}</SelectItem>
                    <SelectItem value="impressions-low">{t('productResearch.leastImpressions')}</SelectItem>
                    <SelectItem value="spend-high">{t('productResearch.highestSpend')}</SelectItem>
                    <SelectItem value="spend-low">{t('productResearch.lowestSpend')}</SelectItem>
                    <SelectItem value="days-long">{t('productResearch.longestRunning')}</SelectItem>
                    <SelectItem value="days-short">{t('productResearch.shortestRunning')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleSearch} disabled={isSearching} className="flex-1">
                {isSearching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {t('productResearch.search')}
              </Button>

              {ads.length > 0 && (
                <Button 
                  onClick={handleExportCSV}
                  variant="outline"
                  disabled={selectedAds.size === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('productResearch.export')} ({selectedAds.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {ads.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedAds.size === ads.length}
                  onCheckedChange={toggleSelectAll}
                />
                <Label htmlFor="select-all" className="cursor-pointer">
                  {t('productResearch.selectAll')} ({ads.length})
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('productResearch.resultsCount', { count: ads.length })}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <Card key={ad.id} className="overflow-hidden">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Checkbox
                        checked={selectedAds.has(ad.id)}
                        onCheckedChange={() => toggleAdSelection(ad.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {ad.page_name || 'Unknown Page'}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {ad.impressions && (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {parseInt(ad.impressions.upper_bound).toLocaleString()}
                        </Badge>
                      )}
                      {ad.spend_amount && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          ${ad.spend_amount.toLocaleString()}
                        </Badge>
                      )}
                      {ad.days_active && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {ad.days_active}d
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ad.ad_creative_bodies && ad.ad_creative_bodies[0] && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {ad.ad_creative_bodies[0]}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(ad.ad_snapshot_url, '_blank')}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t('productResearch.viewAd')}
                      </Button>
                      <Button
                        size="sm"
                        variant={savedAdIds.has(ad.id) ? "default" : "outline"}
                        onClick={() => handleSaveAd(ad)}
                      >
                        {savedAdIds.has(ad.id) ? (
                          <Bookmark className="h-3 w-3" />
                        ) : (
                          <BookmarkPlus className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isSearching && ads.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('productResearch.noResults')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
