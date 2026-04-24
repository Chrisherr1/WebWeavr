// Validates that the input is a well-formed domain (e.g. example.com, sub.example.co.uk).
// Rejects IPs, bare hostnames, and anything with a protocol prefix.
export function isValidDomain(domain) {
  const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return re.test(domain);
}
