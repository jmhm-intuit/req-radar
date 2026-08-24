
/* Questline XLSX bridge
 * Uses the bundled JSZip library to create and read a compact, standards-compliant
 * Excel workbook without sending any data to a server.
 */
(() => {
  'use strict';

  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  const xmlEscape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const colName = (index) => {
    let name = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  };

  const normalizeCell = (value) => {
    if (value === null || value === undefined) return { type: 'inlineStr', value: '' };
    if (typeof value === 'number' && Number.isFinite(value)) return { type: 'n', value };
    if (typeof value === 'boolean') return { type: 'b', value: value ? 1 : 0 };
    return { type: 'inlineStr', value: String(value) };
  };

  const makeSheetXml = (rows, widths = []) => {
    const maxCols = Math.max(1, ...rows.map(r => r.length));
    const dimension = `${colName(0)}1:${colName(maxCols - 1)}${Math.max(rows.length, 1)}`;
    const cols = widths.length
      ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      : '';
    const body = rows.map((row, rIndex) => {
      const cells = row.map((raw, cIndex) => {
        const cell = normalizeCell(raw);
        const ref = `${colName(cIndex)}${rIndex + 1}`;
        const style = rIndex === 0 ? ' s="1"' : '';
        if (cell.type === 'n' || cell.type === 'b') {
          return `<c r="${ref}" t="${cell.type}"${style}><v>${cell.value}</v></c>`;
        }
        const preserve = /^\s|\s$|\n/.test(cell.value) ? ' xml:space="preserve"' : '';
        return `<c r="${ref}" t="inlineStr"${style}><is><t${preserve}>${xmlEscape(cell.value)}</t></is></c>`;
      }).join('');
      return `<row r="${rIndex + 1}">${cells}</row>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${NS}" xmlns:r="${REL_NS}">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  ${cols}
  <sheetData>${body}</sheetData>
  <autoFilter ref="A1:${colName(maxCols - 1)}${Math.max(rows.length, 1)}"/>
</worksheet>`;
  };

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}">
  <fonts count="2">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos Display"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF174B38"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFB59658"/></left><right style="thin"><color rgb="FFB59658"/></right><top style="thin"><color rgb="FFB59658"/></top><bottom style="thin"><color rgb="FFB59658"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

  const collectRecords = (state) => {
    const records = [];
    const add = (type, item, id = item?.id ?? 'singleton') => {
      records.push({
        type,
        id,
        updatedAt: item?.updatedAt || item?.createdAt || state.exportedAt || new Date().toISOString(),
        payload: JSON.stringify(item ?? {})
      });
    };
    add('profile', state.profile || {}, 'profile');
    add('settings', state.settings || {}, 'settings');
    add('appmeta', state.appmeta || {}, 'appmeta');
    ['actions', 'campaigns', 'habits', 'captures', 'decisions', 'events', 'reviews', 'resources', 'tombstones', 'trash'].forEach(type => {
      (state[type] || []).forEach(item => add(type, item));
    });
    return records;
  };

  const readableSheets = (state) => {
    const fmt = value => value || '';
    return [
      {
        name: 'README', widths: [24, 96], rows: [
          ['QUESTLINE V2 WORKBOOK', 'Local-first manual sync and readable data export'],
          ['App version', state.appVersion || '2.x'],
          ['Schema version', state.schemaVersion || ''],
          ['How to sync', '1. Export from one device. 2. Save to Google Drive. 3. Import the same workbook on another device. Questline merges by stable ID and last-modified time.'],
          ['Important', 'Do not delete the _QuestlineData sheet. It preserves relationships, histories, and Campaign evolution for reliable round-trip import.'],
          ['Privacy', 'The workbook is created inside your browser. Questline does not upload it to a server.'],
          ['Exported at', state.exportedAt || new Date().toISOString()]
        ]
      },
      {
        name: 'Actions', widths: [36,18,16,14,14,14,16,16,15,15,12,14,38], rows: [
          ['Action','Area','Mode','Status','Focus State','Importance','Urgency','Planned Date','Due Date','Planned Moves','Progress %','Estimate Min','Campaign'],
          ...(state.actions || []).map(a => [a.title,a.area,a.mode,a.status,a.focusState,a.importance,a.urgency,fmt(a.plannedDate),fmt(a.dueDate),(a.plannedDateHistory||[]).length,a.progress||0,a.estimateMinutes||0,(state.campaigns||[]).find(c=>c.id===a.campaignId)?.title||''])
        ]
      },
      {
        name: 'Campaigns', widths: [36,16,18,16,58,42,18,14,14], rows: [
          ['Campaign','Type','Area','Stage','Current Direction','Success Measure','Target Date','Ideas','Open Actions'],
          ...(state.campaigns || []).map(c => [c.title,c.type,c.area,c.stage,fmt(c.currentDirection),fmt(c.successMeasure),fmt(c.targetDate),(c.entries||[]).filter(e=>e.type==='Idea').length,(state.actions||[]).filter(a=>a.campaignId===c.id&&a.status!=='completed').length])
        ]
      },
      {
        name: 'Campaign Evolution', widths: [34,18,18,70,20,20], rows: [
          ['Campaign','Entry Type','Date','Entry','Pinned','Linked Actions'],
          ...(state.campaigns || []).flatMap(c => (c.entries||[]).map(e => [c.title,e.type,fmt((e.createdAt||'').slice(0,10)),e.text,e.pinned?'Yes':'No',(e.actionIds||[]).length]))
        ]
      },
      {
        name: 'Habits', widths: [34,18,14,18,18,34,34], rows: [
          ['Habit','Area','Direction','Maturity','Health','Target / Boundary','Minimum Version'],
          ...(state.habits || []).map(h => [h.title,h.area,h.direction,h.maturity,h.health,fmt(h.target),fmt(h.minimum)])
        ]
      },
      {
        name: 'Inbox', widths: [58,18,18,18,24], rows: [
          ['Captured Thought','Type','Area','Status','Created'],
          ...(state.captures || []).map(c => [c.text,c.type,c.area,c.status,fmt(c.createdAt)])
        ]
      },
      {
        name: 'Decisions', widths: [36,18,18,18,64,36], rows: [
          ['Decision / Campaign','Area','Date','Campaign ID','Outcome','Next Move'],
          ...(state.decisions || []).map(d => [d.title,d.area,fmt(d.date||d.createdAt),d.campaignId||'',fmt(d.outcome||d.text),fmt(d.next)])
        ]
      },
      {
        name: 'Reviews', widths: [18,54,28,50,54], rows: [
          ['Date','Proud Of','Difficulty','Focus Areas','Next Intention'],
          ...(state.reviews || []).map(r => [r.date,fmt(r.proud),fmt(r.difficulty),(r.focusAreas||[]).join(' | '),fmt(r.nextIntention)])
        ]
      },
      {
        name: 'Events', widths: [36,18,14,14,18,22,36], rows: [
          ['Event','Date','Start','End','Area','Source','Location'],
          ...(state.events || []).map(e => [e.title,fmt(e.date),fmt(e.start),fmt(e.end),e.area,fmt(e.source),fmt(e.location)])
        ]
      },
      {
        name: 'Trash', widths: [18,42,26,28], rows: [
          ['Record Type','Title','Deleted At','ID'],
          ...(state.trash || []).map(entry => [entry.kind,entry.record?.title||entry.record?.text||'',entry.deletedAt||'',entry.record?.id||''])
        ]
      },
      {
        name: '_QuestlineData', widths: [20,36,28,120], rows: [
          ['RecordType','ID','UpdatedAt','PayloadJSON'],
          ...collectRecords(state).map(r => [r.type,r.id,r.updatedAt,r.payload])
        ]
      }
    ];
  };

  const exportState = async (state, filename) => {
    if (!window.JSZip) throw new Error('JSZip is unavailable.');
    const zip = new JSZip();
    const sheets = readableSheets(state);
    const now = new Date().toISOString();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${NS}" xmlns:r="${REL_NS}">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000"/></bookViews>
  <sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}"${s.name==="_QuestlineData"?' state="veryHidden"':""} sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
  <calcPr calcId="191029"/>
</workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Questline</dc:creator><cp:lastModifiedBy>Questline</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
  <dc:title>Questline Local Data</dc:title><dc:subject>Manual sync workbook</dc:subject>
</cp:coreProperties>`;

    const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Questline</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map(s => `<vt:lpstr>${xmlEscape(s.name)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts>
  <Company>Questline</Company><AppVersion>1.0</AppVersion>
</Properties>`;

    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rootRels);
    zip.folder('docProps').file('core.xml', core).file('app.xml', app);
    zip.folder('xl').file('workbook.xml', workbook).file('styles.xml', stylesXml);
    zip.folder('xl').folder('_rels').file('workbook.xml.rels', workbookRels);
    const ws = zip.folder('xl').folder('worksheets');
    sheets.forEach((sheet, i) => ws.file(`sheet${i + 1}.xml`, makeSheetXml(sheet.rows, sheet.widths)));

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || `questline-sync-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    return { bytes: blob.size, sheets: sheets.length, records: collectRecords(state).length };
  };

  const parseXml = (text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const error = doc.querySelector('parsererror');
    if (error) throw new Error('Invalid Excel XML.');
    return doc;
  };

  const textOf = (node) => {
    if (!node) return '';
    return Array.from(node.querySelectorAll('t')).map(t => t.textContent || '').join('') || node.textContent || '';
  };

  const normalizeTarget = (target) => {
    const raw = target.replace(/^\//, '');
    if (raw.startsWith('xl/')) return raw;
    if (raw.startsWith('../')) return raw.replace(/^\.\.\//, '');
    return `xl/${raw}`.replace(/\/\.\//g, '/');
  };

  const importState = async (file) => {
    if (!window.JSZip) throw new Error('JSZip is unavailable.');
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const workbookFile = zip.file('xl/workbook.xml');
    const relsFile = zip.file('xl/_rels/workbook.xml.rels');
    if (!workbookFile || !relsFile) throw new Error('This is not a valid Questline Excel workbook.');

    const workbookDoc = parseXml(await workbookFile.async('text'));
    const relsDoc = parseXml(await relsFile.async('text'));
    const relMap = new Map(Array.from(relsDoc.getElementsByTagName('Relationship')).map(rel => [rel.getAttribute('Id'), rel.getAttribute('Target')]));
    const sheets = Array.from(workbookDoc.getElementsByTagName('sheet')).map(s => ({
      name: s.getAttribute('name'),
      relId: s.getAttribute('r:id') || s.getAttributeNS(REL_NS, 'id')
    }));
    const dataSheet = sheets.find(s => s.name === '_QuestlineData');
    if (!dataSheet) throw new Error('The workbook is missing the _QuestlineData sheet.');
    const target = relMap.get(dataSheet.relId);
    if (!target) throw new Error('The Questline data sheet could not be located.');
    const sheetPath = normalizeTarget(target);
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) throw new Error('The Questline data sheet is unavailable.');

    let sharedStrings = [];
    const shared = zip.file('xl/sharedStrings.xml');
    if (shared) {
      const sharedDoc = parseXml(await shared.async('text'));
      sharedStrings = Array.from(sharedDoc.getElementsByTagName('si')).map(si => textOf(si));
    }

    const sheetDoc = parseXml(await sheetFile.async('text'));
    const rows = Array.from(sheetDoc.getElementsByTagName('row')).map(row => {
      const cells = Array.from(row.getElementsByTagName('c'));
      const values = [];
      cells.forEach(cell => {
        const ref = cell.getAttribute('r') || 'A1';
        const letters = ref.match(/[A-Z]+/)?.[0] || 'A';
        let index = 0;
        for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
        index -= 1;
        const type = cell.getAttribute('t');
        let value = '';
        if (type === 'inlineStr') value = textOf(cell.querySelector('is'));
        else if (type === 's') value = sharedStrings[Number(cell.querySelector('v')?.textContent || 0)] || '';
        else if (type === 'b') value = cell.querySelector('v')?.textContent === '1';
        else value = cell.querySelector('v')?.textContent || '';
        values[index] = value;
      });
      return values;
    });

    if (!rows.length) throw new Error('The Questline data sheet is empty.');
    const header = rows[0].map(v => String(v || '').trim());
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    for (const required of ['RecordType', 'ID', 'UpdatedAt', 'PayloadJSON']) {
      if (!(required in idx)) throw new Error(`Missing required column: ${required}`);
    }

    const records = [];
    const errors = [];
    rows.slice(1).forEach((row, rowIndex) => {
      const type = String(row[idx.RecordType] || '').trim();
      const id = String(row[idx.ID] || '').trim();
      const updatedAt = String(row[idx.UpdatedAt] || '').trim();
      const payloadText = String(row[idx.PayloadJSON] || '');
      if (!type || !id || !payloadText) return;
      try {
        records.push({ type, id, updatedAt, payload: JSON.parse(payloadText) });
      } catch (error) {
        errors.push(`Row ${rowIndex + 2}: ${error.message}`);
      }
    });
    if (!records.length) throw new Error('No valid Questline records were found.');
    return { records, errors, filename: file.name, bytes: file.size };
  };

  window.QuestlineExcel = { exportState, importState };
})();

