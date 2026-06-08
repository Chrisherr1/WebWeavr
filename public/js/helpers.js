import { CDN_ORGS } from './state.js';

// Returns true if the org name matches a known CDN provider
export function isCDN(org) {
  if (!org) {
    return false;
  }
  const lower = org.toLowerCase();
  return CDN_ORGS.some(function (cdn) { return lower.includes(cdn); });
}

// Renders a label/value row with an optional hint beneath the label
export function row(label, value, hint) {
  let hintHtml = '';
  if (hint) {
    hintHtml = '<span class="row-hint">' + hint + '</span>';
  }
  let valueHtml = value;
  if (!valueHtml) {
    valueHtml = '<span class="empty">—</span>';
  }
  return '<div class="row"><span class="label">' + label + hintHtml + '</span><span class="value">' + valueHtml + '</span></div>';
}

// Renders a section heading with an optional hint
export function section(title, hint) {
  let hintHtml = '';
  if (hint) {
    hintHtml = '<span class="section-hint">' + hint + '</span>';
  }
  return '<div class="section-label">' + title + hintHtml + '</div>';
}

// Renders an array of strings as tag chips, with an optional CSS class
export function tags(arr, cls) {
  const className = cls || '';
  if (!arr || !arr.length) {
    return '<span class="empty">None found</span>';
  }
  const parts = [];
  for (const item of arr) {
    parts.push('<span class="tag ' + className + '">' + item + '</span>');
  }
  return parts.join('');
}

// Renders a list of URL items, using keyFn to extract the display string from each item
export function urlList(items, keyFn, cls) {
  const className = cls || '';
  if (!items || !items.length) {
    return '<div class="empty">None found</div>';
  }
  const parts = [];
  for (const item of items) {
    parts.push('<div class="url-item ' + className + '">' + keyFn(item) + '</div>');
  }
  return parts.join('');
}

// Returns the display string for a card's status indicator
export function statusText(status) {
  if (status === 'loading') { return 'Running…'; }
  if (status === 'done')    { return 'Done'; }
  if (status === 'error')   { return 'Provider Down'; }
  return '';
}
