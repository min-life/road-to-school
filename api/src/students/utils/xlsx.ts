import * as zlib from 'node:zlib';

/**
 * Bảng CRC32 chuẩn ISO 3309 phục vụ nén ZIP
 */
const crcTable = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

interface ZipEntry {
  name: string;
  data: string | Buffer;
}

/**
 * Đóng gói danh sách file thành buffer định dạng PKZIP tiêu chuẩn
 */
export function createZipBuffer(files: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const uncompressedSize = dataBuf.length;
    const fileCrc = crc32(dataBuf);
    const compressedData = zlib.deflateRawSync(dataBuf);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + name + data)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // Signature
    lh.writeUInt16LE(20, 4);         // Version needed: 2.0
    lh.writeUInt16LE(0, 6);          // General purpose bit flag
    lh.writeUInt16LE(8, 8);          // Compression method: 8 (Deflate)
    lh.writeUInt16LE(0, 10);         // Mod time
    lh.writeUInt16LE(0, 12);         // Mod date
    lh.writeUInt32LE(fileCrc, 14);   // CRC32
    lh.writeUInt32LE(compressedSize, 18);   // Compressed size
    lh.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26);   // File name length
    lh.writeUInt16LE(0, 28);         // Extra field length

    localHeaders.push(lh, nameBuf, compressedData);

    // Central directory header (46 bytes + name)
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); // Signature
    ch.writeUInt16LE(20, 4);         // Version made by
    ch.writeUInt16LE(20, 6);         // Version needed
    ch.writeUInt16LE(0, 8);          // General purpose bit flag
    ch.writeUInt16LE(8, 10);         // Compression method: 8
    ch.writeUInt16LE(0, 12);         // Mod time
    ch.writeUInt16LE(0, 14);         // Mod date
    ch.writeUInt32LE(fileCrc, 16);   // CRC32
    ch.writeUInt32LE(compressedSize, 20);   // Compressed size
    ch.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    ch.writeUInt16LE(nameBuf.length, 28);   // File name length
    ch.writeUInt16LE(0, 30);         // Extra field length
    ch.writeUInt16LE(0, 32);         // File comment length
    ch.writeUInt16LE(0, 34);         // Disk number start
    ch.writeUInt16LE(0, 36);         // Internal file attributes
    ch.writeUInt32LE(0, 38);         // External file attributes
    ch.writeUInt32LE(offset, 42);    // Relative offset of local header

    centralHeaders.push(ch, nameBuf);
    offset += 30 + nameBuf.length + compressedSize;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const b of centralHeaders) {
    centralDirSize += b.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                // Disk number
  eocd.writeUInt16LE(0, 6);                // Start disk
  eocd.writeUInt16LE(files.length, 8);     // Entries on disk
  eocd.writeUInt16LE(files.length, 10);    // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);  // Central directory size
  eocd.writeUInt32LE(centralDirOffset, 16);// Central directory offset
  eocd.writeUInt16LE(0, 20);               // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Giải nén buffer PKZIP thành key-value files
 */
export function parseZipBuffer(buf: Buffer): Record<string, Buffer> {
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65536); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Tệp tải lên không phải là tệp nén ZIP hoặc Excel .xlsx hợp lệ');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const files: Record<string, Buffer> = {};
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (cur + 46 > buf.length || buf.readUInt32LE(cur) !== 0x02014b50) break;
    const method = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const nameLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const localHeaderOffset = buf.readUInt32LE(cur + 42);

    const name = buf.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;

    if (localHeaderOffset + 30 > buf.length) continue;
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawData = buf.subarray(dataOffset, dataOffset + compSize);

    let uncompressedData: Buffer;
    if (method === 0) {
      uncompressedData = rawData;
    } else if (method === 8) {
      uncompressedData = zlib.inflateRawSync(rawData);
    } else {
      throw new Error(`Phương thức nén không được hỗ trợ trong Excel: ${method}`);
    }
    files[name] = uncompressedData;
  }
  return files;
}

function escapeXml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function colToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function letterToCol(colStr: string): number {
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return col - 1;
}

/**
 * Sinh tệp Excel .xlsx chuẩn OpenXML không phụ thuộc thư viện ngoài
 */
export function generateXlsxBuffer(
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Buffer {
  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';

  // Hàng tiêu đề (Row 1)
  sheetXml += '<row r="1">';
  headers.forEach((h, colIdx) => {
    const ref = colToLetter(colIdx) + '1';
    sheetXml += `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  sheetXml += '</row>';

  // Các hàng dữ liệu (Bắt đầu từ Row 2)
  rows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2;
    sheetXml += `<row r="${rowNum}">`;
    row.forEach((val, colIdx) => {
      const ref = colToLetter(colIdx) + rowNum;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        // s="1" áp dụng numFmtId=49 (@ - Explicit text format) để bảo toàn số điện thoại và mã học sinh
        sheetXml += `<c r="${ref}" t="inlineStr" s="1"><is><t>${escapeXml(val)}</t></is></c>`;
      }
    });
    sheetXml += '</row>';
  });

  sheetXml += '</sheetData></worksheet>';

  const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  const rootRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const workbookRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';

  return createZipBuffer([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: rootRelsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
    { name: 'xl/styles.xml', data: stylesXml },
  ]);
}

export interface ParsedXlsxRow {
  rowNumber: number;
  cells: Record<number, string>;
}

/**
 * Đọc toàn bộ các dòng và ô dữ liệu từ tệp .xlsx
 */
export function parseXlsxBuffer(buf: Buffer): ParsedXlsxRow[] {
  const files = parseZipBuffer(buf);

  // Đọc danh sách chuỗi dùng chung (sharedStrings.xml) nếu có
  const sharedStrings: string[] = [];
  if (files['xl/sharedStrings.xml']) {
    const ssXml = files['xl/sharedStrings.xml'].toString('utf8');
    const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches
        .map((t) => unescapeXml(t.replace(/<t[^>]*>/, '').replace(/<\/t>/, '')))
        .join('');
      sharedStrings.push(text);
    }
  }

  // Tìm sheet đầu tiên
  let sheetKey = Object.keys(files).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k));
  if (!sheetKey) {
    sheetKey = Object.keys(files).find((k) => k.includes('sheet') && k.endsWith('.xml'));
  }
  if (!sheetKey || !files[sheetKey]) {
    throw new Error('Tệp Excel không chứa sheet dữ liệu nào');
  }

  const sheetXml = files[sheetKey].toString('utf8');
  const rows: ParsedXlsxRow[] = [];
  const rowMatches = sheetXml.match(/<row\s+[^>]*>[\s\S]*?<\/row>/g) || [];

  for (const rowXml of rowMatches) {
    const rMatch = rowXml.match(/r="(\d+)"/);
    const rowNum = rMatch ? parseInt(rMatch[1], 10) : rows.length + 1;
    const cellMatches = rowXml.match(/<c\s+[^>]*>[\s\S]*?<\/c>|<c\s+[^>]*\/>/g) || [];

    const rowData: ParsedXlsxRow = { rowNumber: rowNum, cells: {} };
    for (const cXml of cellMatches) {
      const refMatch = cXml.match(/r="([A-Z]+)(\d+)"/);
      if (!refMatch) continue;
      const colLetter = refMatch[1];
      const colIdx = letterToCol(colLetter);
      const isString = /t="s"/.test(cXml);
      const isInlineStr = /t="inlineStr"/.test(cXml);

      let val = '';
      if (isString) {
        const vMatch = cXml.match(/<v>(\d+)<\/v>/);
        if (vMatch) {
          const sIdx = parseInt(vMatch[1], 10);
          val = sharedStrings[sIdx] || '';
        }
      } else if (isInlineStr) {
        const tMatch = cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) val = unescapeXml(tMatch[1]);
      } else {
        const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) val = unescapeXml(vMatch[1]);
      }
      rowData.cells[colIdx] = val.trim();
    }
    rows.push(rowData);
  }

  return rows;
}

/**
 * Tạo tệp Excel mẫu để quản trị viên tải về nhập liệu
 */
export function getStudentImportTemplateBuffer(): Buffer {
  const headers = [
    'Họ và tên học sinh',
    'Số điện thoại phụ huynh',
    'Địa chỉ đón/trả',
    'Vĩ độ',
    'Kinh độ',
  ];
  const sampleRows = [
    [
      'Nguyễn Văn An',
      '0901234567',
      '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
      10.776889,
      106.700806,
    ],
    [
      'Trần Thị Bình',
      '0987654321',
      '',
      '',
      '',
    ],
  ];

  return generateXlsxBuffer('MauNhapHocSinh', headers, sampleRows);
}
