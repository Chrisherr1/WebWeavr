// Fetches WHOIS data via RDAP (the modern, structured replacement for plain WHOIS).
// Uses the IANA bootstrap registry to find the correct RDAP endpoint for the TLD.
export default async function whois(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  let rdapBase = null;

  try {
    // The IANA bootstrap file maps TLDs to their authoritative RDAP endpoints
    const bootstrap = await fetch('https://data.iana.org/rdap/dns.json');
    const bootstrapJson = await bootstrap.json();
    for (const [tlds, urls] of bootstrapJson.services) {
      if (tlds.includes(tld) && urls.length) {
        rdapBase = urls[0];
        break;
      }
    }
  } catch (err) {
    // Fall back to Verisign's endpoint for .com/.net if bootstrap fetch fails
    rdapBase = 'https://rdap.verisign.com/com/v1/';
  }

  if (!rdapBase) {
    return { error: 'No RDAP endpoint for .' + tld, tld: tld };
  }

  const res = await fetch(rdapBase + 'domain/' + domain);
  if (res.status !== 200) {
    return { error: 'RDAP returned ' + res.status, tld: tld };
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
