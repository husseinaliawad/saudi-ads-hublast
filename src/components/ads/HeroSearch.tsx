import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { Button } from '@/components/ui/button';

export function HeroSearch() {
  const { cities } = useTaxonomy();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city) params.set('city', city);
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card rounded-2xl shadow-elegant border border-border/60 p-2 flex flex-col sm:flex-row items-stretch gap-2"
    >
      <div className="relative flex-1 flex items-center">
        <Search className="absolute right-4 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن سيارة، شقة، وظيفة، أو أي شيء..."
          className="w-full bg-transparent border-0 outline-none pr-12 pl-4 py-3 text-base placeholder:text-muted-foreground/70"
          aria-label="بحث"
        />
      </div>

      <div className="relative flex items-center sm:border-r sm:border-border sm:pr-2">
        <MapPin className="absolute right-4 h-5 w-5 text-muted-foreground pointer-events-none" />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="appearance-none bg-transparent border border-border sm:border-0 rounded-xl outline-none pr-12 pl-10 py-3 text-base font-medium min-w-[180px] cursor-pointer"
          aria-label="المدينة"
        >
          <option value="">كل المدن</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      <Button type="submit" size="lg" className="px-8 text-base font-bold">
        بحث
      </Button>
    </form>
  );
}
