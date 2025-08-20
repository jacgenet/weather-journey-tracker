/**
 * Country name normalization utilities
 * Standardizes country names to prevent counting variations as separate countries
 */

export interface CountryMapping {
  [key: string]: string;
}

// Common country name variations and their standardized versions
const COUNTRY_MAPPINGS: CountryMapping = {
  // United States variations
  'USA': 'United States',
  'US': 'United States',
  'America': 'United States',
  'United States of America': 'United States',
  'U.S.A.': 'United States',
  'U.S.': 'United States',
  
  // Canada variations
  'CAN': 'Canada',
  'Can.': 'Canada',
  
  // United Kingdom variations
  'UK': 'United Kingdom',
  'U.K.': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'England': 'United Kingdom',
  'Scotland': 'United Kingdom',
  'Wales': 'United Kingdom',
  
  // Australia variations
  'AUS': 'Australia',
  'Oz': 'Australia',
  
  // Germany variations
  'DEU': 'Germany',
  'Deutschland': 'Germany',
  
  // France variations
  'FRA': 'France',
  'République française': 'France',
  
  // Spain variations
  'ESP': 'Spain',
  'España': 'Spain',
  
  // Italy variations
  'ITA': 'Italy',
  'Italia': 'Italy',
  
  // Japan variations
  'JPN': 'Japan',
  'Nippon': 'Japan',
  
  // China variations
  'CHN': 'China',
  '中国': 'China',
  
  // Mexico variations
  'MEX': 'Mexico',
  'México': 'Mexico',
  
  // Brazil variations
  'BRA': 'Brazil',
  'Brasil': 'Brazil',
  
  // India variations
  'IND': 'India',
  'Bharat': 'India',
  
  // Russia variations
  'RUS': 'Russia',
  'Россия': 'Russia',
  
  // South Korea variations
  'KOR': 'South Korea',
  '대한민국': 'South Korea',
  
  // Netherlands variations
  'NLD': 'Netherlands',
  'Holland': 'Netherlands',
  'The Netherlands': 'Netherlands',
};

/**
 * Normalizes a country name to its standard form
 * @param country - The country name to normalize
 * @returns The normalized country name
 */
export function normalizeCountryName(country: string): string {
  if (!country) return '';
  
  const trimmed = country.trim();
  if (!trimmed) return '';
  
  // Check if we have a mapping for this country
  const normalized = COUNTRY_MAPPINGS[trimmed];
  if (normalized) {
    return normalized;
  }
  
  // If no mapping exists, return the original (capitalized)
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Normalizes an array of country names
 * @param countries - Array of country names to normalize
 * @returns Array of normalized country names
 */
export function normalizeCountryNames(countries: string[]): string[] {
  return countries.map(normalizeCountryName);
}

/**
 * Gets unique normalized countries from a list
 * @param countries - Array of country names
 * @returns Set of unique normalized country names
 */
export function getUniqueNormalizedCountries(countries: string[]): Set<string> {
  return new Set(countries.map(normalizeCountryName));
}

/**
 * Counts unique normalized countries
 * @param countries - Array of country names
 * @returns Number of unique normalized countries
 */
export function countUniqueCountries(countries: string[]): number {
  return getUniqueNormalizedCountries(countries).size;
}
