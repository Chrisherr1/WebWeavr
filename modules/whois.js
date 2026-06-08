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
  const parts = String(value).split(/[\n\s]+/);
  const result = [];
  for (const part of parts) {
    if (part) {
      result.push(part);
    }
  }
  return result;
}

// Returns the first entity in an array whose roles include the given role
function findEntityByRole(entities, role) {
  for (const entity of entities) {
    if (entity.roles && entity.roles.includes(role)) {
      return entity;
    }
  }
  return null;
}

// Returns the first vcard field whose type matches, or null if not found
// vcard fields are arrays: [type, params, valueType, value]
function findVcardField(vcard, type) {
  for (const field of vcard) {
    if (field[0] === type) {
      return field;
    }
  }
  return null;
}

async function legacyWhois(domain, tld) {
  const data = await whoisJson(domain);

  const rawNameservers = parseList(data.nameServer || data.nameServers);
  const nameservers = [];
  for (const nameserver of rawNameservers) {
    nameservers.push(nameserver.toLowerCase());
  }

  const contactName  = data.registrantName || data.registrantOrganization || null;
  const contactEmail = data.registrantEmail || null;
  const contactOrg   = data.registrantOrganization || null;

  let contact = null;
  if (contactName || contactEmail || contactOrg) {
    contact = { name: contactName, email: contactEmail, org: contactOrg };
  }

  return {
    registrar:   data.registrar || null,
    registered:  data.creationDate || data.created || null,
    updated:     data.updatedDate || data.lastUpdated || null,
    expiry:      data.registryExpiryDate || data.registrarRegistrationExpirationDate || data.expirationDate || null,
    nameservers: nameservers,
    status:      parseList(data.domainStatus || data.status),
    contact:     contact,
    dnssec:      null,
    tld:         tld,
    source:      'WHOIS (legacy fallback)'
  };
}

export default async function whois(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  let rdapBase = null;

  try {
    const bootstrap     = await fetch('https://data.iana.org/rdap/dns.json');
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

  // Returns the date for a named event, or null if not present
  function getEvent(action) {
    const events = json.events || [];
    for (const entry of events) {
      if (entry.eventAction === action) {
        return entry.eventDate;
      }
    }
    return null;
  }

  const entities        = json.entities || [];
  const registrarEntity = findEntityByRole(entities, 'registrar');

  let registrar        = null;
  let ianaRegistrarId  = null;
  let registrarUrl     = null;
  let registrarContact = null;

  if (registrarEntity) {
    // IANA Registrar ID — numeric ID assigned to every ICANN-accredited registrar
    const publicIds = registrarEntity.publicIds || [];
    for (const entry of publicIds) {
      if (entry.type === 'IANA Registrar ID') {
        ianaRegistrarId = entry.identifier;
        break;
      }
    }

    // Registrar URL — try entity links first, then fall back to vcard url field
    const registrarLinks = registrarEntity.links || [];
    for (const link of registrarLinks) {
      if (link.rel === 'about') {
        registrarUrl = link.href;
        break;
      }
    }
  }

  if (registrarEntity && registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
    const vcard         = registrarEntity.vcardArray[1];
    const fullNameField = findVcardField(vcard, 'fn');

    if (fullNameField) {
      registrar = fullNameField[3];
    }

    // Fall back to vcard url field if no link was found above
    if (!registrarUrl) {
      const urlField = findVcardField(vcard, 'url');
      if (urlField) {
        registrarUrl = urlField[3];
      }
    }

    const abuseEntity = findEntityByRole(registrarEntity.entities || [], 'abuse');
    if (abuseEntity && abuseEntity.vcardArray && abuseEntity.vcardArray[1]) {
      const abuseVcard = abuseEntity.vcardArray[1];
      const emailField = findVcardField(abuseVcard, 'email');
      const telField   = findVcardField(abuseVcard, 'tel');

      let abuseEmail = null;
      let abusePhone = null;

      if (emailField) {
        abuseEmail = emailField[3];
      }
      if (telField) {
        abusePhone = telField[3];
      }

      registrarContact = {
        email: abuseEmail,
        phone: abusePhone,
      };
    }
  }

  const nameservers = [];
  for (const ns of (json.nameservers || [])) {
    if (ns.ldhName) {
      nameservers.push(ns.ldhName.toLowerCase());
    } else {
      nameservers.push(null);
    }
  }

  const registrantEntity = findEntityByRole(entities, 'registrant');
  let contact = null;
  if (registrantEntity && registrantEntity.vcardArray && registrantEntity.vcardArray[1]) {
    const vcard         = registrantEntity.vcardArray[1];
    const fullNameField = findVcardField(vcard, 'fn');
    const emailField    = findVcardField(vcard, 'email');
    const orgField      = findVcardField(vcard, 'org');

    let contactName  = null;
    let contactEmail = null;
    let contactOrg   = null;

    if (fullNameField) {
      contactName = fullNameField[3];
    }
    if (emailField) {
      contactEmail = emailField[3];
    }
    if (orgField) {
      contactOrg = orgField[3];
    }

    if (contactName || contactEmail || contactOrg) {
      contact = {
        name:  contactName,
        email: contactEmail,
        org:   contactOrg,
      };
    }
  }

  let dnssec = null;
  if (json.secureDNS) {
    dnssec = {
      zoneSigned:       json.secureDNS.zoneSigned       || false,
      delegationSigned: json.secureDNS.delegationSigned || false,
    };
  }

  let domainStatus = [];
  if (Array.isArray(json.status)) {
    domainStatus = json.status;
  }

  return {
    registrar:        registrar,
    ianaRegistrarId:  ianaRegistrarId,
    registrarUrl:     registrarUrl,
    registrarContact: registrarContact,
    registered:       getEvent('registration'),
    updated:          getEvent('last changed'),
    expiry:           getEvent('expiration'),
    transferred:      getEvent('transfer'),
    nameservers:      nameservers,
    status:           domainStatus,
    registryDomainId: json.handle || null,
    contact:          contact,
    dnssec:           dnssec,
    tld:              tld
  };
}
