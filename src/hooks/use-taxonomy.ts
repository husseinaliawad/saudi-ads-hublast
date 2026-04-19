import { useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchCities } from '@/lib/queries';
import { categories as localCategories } from '@/data/categories';
import { cities as localCities } from '@/data/cities';

export function useTaxonomy() {
  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const citiesQuery = useQuery({
    queryKey: ['taxonomy', 'cities'],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    categories: categoriesQuery.data && categoriesQuery.data.length > 0 ? categoriesQuery.data : localCategories,
    cities: citiesQuery.data && citiesQuery.data.length > 0 ? citiesQuery.data : localCities,
    loading: categoriesQuery.isLoading || citiesQuery.isLoading,
  };
}
