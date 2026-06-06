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
  const contact = {
    name:  data.registrantName  || data.registrantOrganization || null,
    email: data.registrantEmail || null,
    org:   data.registrantOrganization || null,
  };
  return {
    registrar:   data.registrar || null,
    registered:  data.creationDate || data.created || null,
    updated:     data.updatedDate || data.lastUpdated || null,
    expiry:      data.registryExpiryDate || data.registrarRegistrationExpirationDate || data.expirationDate || null,
    nameservers: parseList(data.nameServer || data.nameServers).map(function (n) { return n.toLowerCase(); }),
    status:      parseList(data.domainStatus || data.status),
    contact:     (contact.name || contact.email || contact.org) ? contact : null,
    dnssec:      null,
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
  let registrarContact = null;
  if (registrarEntity && registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
    const vcard = registrarEntity.vcardArray[1];
    const fn    = vcard.find(function (v) { return v[0] === 'fn'; });
    registrar   = fn ? fn[3] : null;

    const abuseEntity = (registrarEntity.entities || []).find(function (e) {
      return e.roles && e.roles.includes('abuse');
    });
    if (abuseEntity && abuseEntity.vcardArray && abuseEntity.vcardArray[1]) {
      const av    = abuseEntity.vcardArray[1];
      const email = av.find(function (v) { return v[0] === 'email'; });
      const tel   = av.find(function (v) { return v[0] === 'tel'; });
      registrarContact = {
        email: email ? email[3] : null,
        phone: tel   ? tel[3]   : null,
      };
    }
  }

  const nameservers = (json.nameservers || []).map(function (ns) {
    return ns.ldhName ? ns.ldhName.toLowerCase() : null;
  });

  const registrantEntity = entities.find(function (e) {
    return e.roles && e.roles.includes('registrant');
  });
  let contact = null;
  if (registrantEntity && registrantEntity.vcardArray && registrantEntity.vcardArray[1]) {
    const vcard = registrantEntity.vcardArray[1];
    const fn    = vcard.find(function (v) { return v[0] === 'fn'; });
    const email = vcard.find(function (v) { return v[0] === 'email'; });
    const org   = vcard.find(function (v) { return v[0] === 'org'; });
    if (fn || email || org) {
      contact = {
        name:  fn    ? fn[3]    : null,
        email: email ? email[3] : null,
        org:   org   ? org[3]   : null,
      };
    }
  }

  const secureDns = json.secureDNS || null;
  const dnssec = secureDns ? {
    zoneSigned:       secureDns.zoneSigned       || false,
    delegationSigned: secureDns.delegationSigned || false,
  } : null;

  return {
    registrar:        registrar,
    registrarContact: registrarContact,
    registered:       getEvent('registration'),
    updated:          getEvent('last changed'),
    expiry:           getEvent('expiration'),
    nameservers:      nameservers,
    status:           Array.isArray(json.status) ? json.status : [],
    contact:          contact,
    dnssec:           dnssec,
    tld:              tld
  };
}
