import { SqliTestVector } from '../types/behaviorban';

export function bashDecodeUri(uri: string): string {
  try {
    // Mimic printf '%b' "${uri//%/\\x}" 2>/dev/null
    // First try standard decodeURIComponent, if it fails due to malformed URI, fallback to manual hex replacement
    return decodeURIComponent(uri).toLowerCase();
  } catch {
    const replaced = uri.replace(/%([0-9a-fA-F]{2})/g, (_match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _match;
      }
    });
    return replaced.toLowerCase();
  }
}

// Convert bash POSIX extended regular expression to JavaScript RegExp
export function convertBashRegexToJs(bashRegex: string): RegExp | null {
  try {
    // In bash:
    // [[:space:]+] -> [\s+]
    // ('')[[:space:]]* -> (')[\\s]*
    let jsPattern = bashRegex
      .replace(/\[\[:space:\]\+\]/g, '[\\s+]')
      .replace(/\[\[:space:\]\]/g, '\\s');

    return new RegExp(jsPattern, 'i');
  } catch (err) {
    console.error('Failed to parse regex:', err);
    return null;
  }
}

export function testSqliPattern(uri: string, bashRegex: string): {
  isMatch: boolean;
  decodedUri: string;
  matchedSnippet: string | null;
  matchedPattern: string | null;
  error?: string;
} {
  const decoded = bashDecodeUri(uri);
  const regex = convertBashRegexToJs(bashRegex);

  if (!regex) {
    return {
      isMatch: false,
      decodedUri: decoded,
      matchedSnippet: null,
      matchedPattern: null,
      error: 'Invalid SQLi regex syntax.'
    };
  }

  const match = decoded.match(regex);
  if (match) {
    return {
      isMatch: true,
      decodedUri: decoded,
      matchedSnippet: match[0],
      matchedPattern: match[0]
    };
  }

  return {
    isMatch: false,
    decodedUri: decoded,
    matchedSnippet: null,
    matchedPattern: null
  };
}

export const PRESET_SQLI_VECTORS: SqliTestVector[] = [
  {
    id: 'vec-1',
    category: 'Union-Based SQLi',
    name: 'Standard UNION SELECT extraction',
    uri: '/index.php?dispatch=products.view&product_id=1%20UNION%20ALL%20SELECT%201,2,schema_name%20FROM%20information_schema.schemata--',
    expectedMatch: true,
    explanation: 'Matches union all select and information_schema'
  },
  {
    id: 'vec-2',
    category: 'Time-Based Blind',
    name: 'MySQL sleep() function probe',
    uri: '/api/v1/search?query=sneakers%27%20AND%20sleep(5)--',
    expectedMatch: true,
    explanation: 'Matches sleep( function injection'
  },
  {
    id: 'vec-3',
    category: 'Boolean Blind',
    name: 'OR 1=1 Authentication bypass',
    uri: '/login?user=admin%27%20or%201=1--',
    expectedMatch: true,
    explanation: 'Matches or 1=1 syntax'
  },
  {
    id: 'vec-4',
    category: 'Database File Read',
    name: 'load_file sensitive file access',
    uri: '/catalog?cat=5%27;%20load_file(%27/etc/passwd%27);--',
    expectedMatch: true,
    explanation: 'Matches load_file( and comment syntax'
  },
  {
    id: 'vec-5',
    category: 'Error-Based Blind',
    name: 'extractvalue XPath error probe',
    uri: '/cart.php?action=view&item=1%20and%20extractvalue(1,concat(0x7e,version()))',
    expectedMatch: true,
    explanation: 'Matches extractvalue( syntax'
  },
  {
    id: 'vec-6',
    category: 'Benign User Traffic',
    name: 'Normal Product Search with "union"',
    uri: '/search?q=union+jack+flag+tshirt',
    expectedMatch: false,
    explanation: 'Contains word "union" but without SELECT; correctly does NOT trigger'
  },
  {
    id: 'vec-7',
    category: 'Benign User Traffic',
    name: 'Standard CS-Cart / CMS URL',
    uri: '/electronics/smartphones/apple-iphone-15-pro-max.html?page=2&sort_by=price',
    expectedMatch: false,
    explanation: 'Clean legitimate navigation query'
  }
];
