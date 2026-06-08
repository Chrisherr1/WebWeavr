// Queries crt.sh for certificates issued for subdomains of the target domain.
// crt.sh aggregates Certificate Transparency logs, making it a reliable passive source.

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

export default async function crtsh(domain) {
  const url = 'https://crt.sh/?q=' + domain + '&output=json';

  // crt.sh is slow — abort if it takes more than 30 seconds
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 30000);

  let res;
  try {
    res = await fetch(url, { headers: HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error('crt.sh returned ' + res.status);
  }

  const json = await res.json();

  // Each certificate has a name_value field that may contain multiple names separated by newlines
  const allNames = [];
  for (const cert of json) {
    const names = cert.name_value.split('\n');
    for (const name of names) {
      allNames.push(name);
    }
  }

  // Keep only names that belong to the target domain, drop wildcards, then normalise
  const normalised = [];
  for (const name of allNames) {
    if (name.endsWith(domain) && !name.includes('*')) {
      normalised.push(name.trim().toLowerCase());
    }
  }

  const subdomains = [...new Set(normalised)].sort();

  return { subdomains: subdomains, count: subdomains.length };
}
