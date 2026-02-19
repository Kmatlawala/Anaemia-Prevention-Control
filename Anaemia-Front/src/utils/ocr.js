
export const normalizeLines = (rawText) =>
    rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  
  export const parseFieldsFromText = (rawText) => {
    const lines = normalizeLines(rawText || '');
    const full = lines.join('\n');
  
    const result = { id: null, name: null, dob: null, phone: null, address: null };
  
    const aad = full.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aad) result.id = aad[1].replace(/\s/g, '');
  
    const phone = full.match(/(\+?91[\-\s]?)?([6-9]\d{9})/);
    if (phone) result.phone = phone[2];
  
    const nameLine = lines.find((l) => /^(name|naam|नाम)[:\-\s]/i.test(l));
    if (nameLine) {
      const m = nameLine.match(/^(?:name|naam|नाम)[:\-\s]*(.+)/i);
      if (m && m[1]) result.name = m[1].trim();
    } else {
      const candidate = lines.find((l) => {
        const low = l.toLowerCase();
        if (/[0-9]/.test(l) && l.replace(/\s/g, '').length < 6) return false;
        if (/dob|date of birth|father|gender|male|female|address|age|aadhar|aadhaar|identity/i.test(low)) return false;
        return /[A-Za-z\u0900-\u097F]/.test(l) && l.split(/\s+/).length >= 2;
      });
      if (candidate) result.name = candidate.trim();
    }
  
    const addrIndex = lines.findIndex((l) => /^(address|addr|address:)/i.test(l));
    if (addrIndex >= 0) {
      const addrLines = lines.slice(addrIndex, addrIndex + 4);
      addrLines[0] = addrLines[0].replace(/^(address[:\-\s]?)/i, '').trim();
      result.address = addrLines.join(', ').replace(/,+/g, ', ').trim();
    } else {
      const addrCandidate = lines.find((l) => /(street|road|lane|sector|city|town|village|district|state|pin|pincode|postcode)/i.test(l));
      if (addrCandidate) result.address = addrCandidate.trim();
    }
  
    const dobMatch = full.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
    if (dobMatch) result.dob = dobMatch[1];
  
    return result;
  };
  