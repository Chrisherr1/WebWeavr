// src/modules/wayback.js

// Fetches historical URLs from the Wayback Machine for a given domain\
export default async function wayback(domain) {

  // Wayback Machine CDX API - statuscode and timestamp included for potential filtering, limits to 100 results and collapses on urlkey to avoid duplicates
  const url = 'https://web.archive.org/cdx/search/cdx?url=*.' + domain + '/*&output=json&fl=original,statuscode,timestamp&collapse=urlkey&limit=100';
  
  // waits for url to respond
  const res = await fetch(url);
  // parses the response as JSON
  const json = await res.json();

  // if no results, return empty array and count of 0
  if (!json.length) {
    return { urls: [], count: 0 };
  }

  // the first row of the JSON response contains the field names,
  // so we skip it and process the remaining rows
  const rows = json.slice(1);
  // we map each row to an object with url, status, and timestamp properties
  const urls = rows.map(function (row) {
    return { url: row[0], status: row[1], timestamp: row[2] };
  });
  // we filter the URLs to find those that contain potentially interesting keywords
  const interesting = urls.filter(function (u) {
    return /admin|api|backup|config|\.env|\.git|login|upload|internal|dev|staging/i.test(u.url);
  });
  // returns an object with urls, count of urls, and count of interesting urls
  return { urls: urls, count: urls.length, interesting: interesting };
}
