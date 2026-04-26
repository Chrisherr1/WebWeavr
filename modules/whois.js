import whoisJson from 'whois-json';

// Fetches WHOIS data via RDAP (the modern, structured replacement for plain WHOIS).
// Falls back to legacy WHOIS protocol when RDAP returns 404.

function parseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value).split(/[\n\s]+/).filter(Boolean);
}

async function legacyWhois(domain, tld) {
  const data = await whoisJson(domain);
  return {
    registrar:   data.registrar || null,
    registered:  data.creationDate || data.created || null,
    updated:     data.updatedDate || data.lastUpdated || null,
    expiry:      data.registryExpiryDate || data.registrarRegistrationExpirationDate || data.expirationDate || null,
    nameservers: parseList(data.nameServer || data.nameServers).map(function (n) { return n.toLowerCase(); }),
    status:      parseList(data.domainStatus || data.status),
    tld:         tld,
    source:      'WHOIS (legacy fallback)'
  };
}

export default async function whois(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  let rdapBase = null;

  try {
    const bootstrap = await fetch('https://data.iana.org/rdap/dns.json');
    const bootstrapJson = await bootstrap.json();
    for (const [tlds, urls] of bootstrapJson.services) {
      if (tlds.includes(tld) && urls.length) {
        rdapBase = urls[0];
        break;
      }
    }
  } catch (err) {
    rdapBase = 'https://rdap.verisign.com/com/v1/';
  }

  if (!rdapBase) {
    return await legacyWhois(domain, tld);
  }

  const res = await fetch(rdapBase + 'domain/' + domain);
  if (res.status === 404) {
    return await legacyWhois(domain, tld);
  }
  if (!res.ok) {
    throw new Error('RDAP returned ' + res.status);
  }

  const json = await res.json();

  function getEvent(action) {
    const events = json.events || [];
    const event = events.find(function (e) { return e.eventAction === action; });
    return event ? event.eventDate : null;
  }

  const entities = json.entities || [];
  const registrarEntity = entities.find(function (e) {
    return e.roles && e.roles.includes('registrar');
  });

  let registrar = null;
  if (registrarEntity && registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
    const fnEntry = registrarEntity.vcardArray[1].find(function (v) { return v[0] === 'fn'; });
    registrar = fnEntry ? fnEntry[3] : null;
  }

  const nameservers = (json.nameservers || []).map(function (ns) {
    return ns.ldhName ? ns.ldhName.toLowerCase() : null;
  });

  return {
    registrar: registrar,
    registered: getEvent('registration'),
    updated: getEvent('last changed'),
    expiry: getEvent('expiration'),
    nameservers: nameservers,
    status: Array.isArray(json.status) ? json.status : [],
    tld: tld
  };
}
