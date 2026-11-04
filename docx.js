import { deflateRawSync } from 'node:zlib'

const FONT_LATIN = 'Helvetica'
const FONT_CJK = 'PingFang SC'
const BRAND = '1F3A8A'
const TEXT = '111827'
const MUTED = '4B5563'
const BORDER = 'D1D5DB'
const SOFT_BLUE = 'F3F6FC'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1)
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let value = 0xFFFFFFFF
  for (let index = 0; index < buffer.length; index += 1) {
    value = CRC_TABLE[(value ^ buffer[index]) & 0xFF] ^ (value >>> 8)
  }
  return (value ^ 0xFFFFFFFF) >>> 0
}

function zip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const raw = Buffer.isBuffer(file.data) ? file.data : Buffer.from(String(file.data), 'utf8')
    const compressed = deflateRawSync(raw, { level: 9 })
    const checksum = crc32(raw)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034B50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014B50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + compressed.length
  }

  const localBlock = Buffer.concat(localParts)
  const centralBlock = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054B50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBlock.length, 12)
  end.writeUInt32LE(localBlock.length, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([localBlock, centralBlock, end])
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function plain(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function run(text, options = {}) {
  const properties = []
  if (options.bold) properties.push('<w:b/>')
  if (options.italic) properties.push('<w:i/>')
  if (options.color) properties.push(`<w:color w:val="${options.color}"/>`)
  if (options.size) properties.push(`<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`)
  properties.push(`<w:rFonts w:ascii="${FONT_LATIN}" w:hAnsi="${FONT_LATIN}" w:eastAsia="${FONT_CJK}"/>`)
  const rPr = `<w:rPr>${properties.join('')}</w:rPr>`
  const content = String(text ?? '').replace(/[ \t\r\n]+/g, ' ')
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r>`
}

function paragraph(runs, options = {}) {
  const pPr = []
  if (options.align) pPr.push(`<w:jc w:val="${options.align}"/>`)
  if (options.keepNext) pPr.push('<w:keepNext/>')
  if (options.pageBreakBefore) pPr.push('<w:pageBreakBefore/>')
  if (options.border) pPr.push(options.border)
  const after = options.after === undefined ? 120 : options.after
  const line = options.line === undefined ? 300 : options.line
  pPr.push(`<w:spacing w:after="${after}" w:line="${line}" w:lineRule="auto"/>`)
  if (options.indent) pPr.push(`<w:ind w:left="${options.indent}"/>`)
  const pPrXml = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''
  const children = Array.isArray(runs) ? runs.join('') : run(runs, options)
  return `<w:p>${pPrXml}${children}</w:p>`
}

function heading(text, options = {}) {
  return paragraph([run(text, { bold: true, size: 28, color: BRAND })], {
    after: options.after === undefined ? 80 : options.after,
    line: 300,
    keepNext: true,
    border: '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="C7D2FE"/></w:pBdr>',
  })
}

function table(options) {
  const borders = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="${BORDER}"/>
  </w:tblBorders>`
  const cellMargins = `<w:tblCellMar>
    <w:top w:w="80" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>
    <w:bottom w:w="80" w:type="dxa"/><w:right w:w="90" w:type="dxa"/>
  </w:tblCellMar>`
  const grid = options.widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')
  const rows = options.rows.map(cells => `<w:tr>${cells.map((cell, index) => {
    const content = typeof cell === 'string' ? cell : cell.content
    const fill = typeof cell === 'string' ? SOFT_BLUE : (cell.fill || SOFT_BLUE)
    const span = typeof cell === 'object' && cell.span ? `<w:gridSpan w:val="${cell.span}"/>` : ''
    const width = typeof cell === 'object' && cell.width ? cell.width : options.widths[index]
    return `<w:tc>
    <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span}<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/></w:tcPr>
    ${content}
  </w:tc>`
  }).join('')}</w:tr>`).join('')
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/>${borders}${cellMargins}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`
}

function wordBox(exercise) {
  const cells = exercise.options.map(option => [
    paragraph([run(option.letter, { bold: true, size: 21, color: BRAND })], { align: 'center', after: 20, line: 240 }),
    paragraph([run(option.word, { size: 21, color: TEXT })], { align: 'center', after: 40, line: 240 }),
  ].join(''))
  return table({
    widths: [2409, 2409, 2409, 2411],
    rows: [
      cells.slice(0, 4),
      [cells[4], cells[5], { content: cells[6], span: 2, width: 4820 }],
    ],
  })
}

function passageParagraphs(passage) {
  const blocks = String(passage || '').split(/\n\s*\n/).map(block => block.trim()).filter(Boolean)
  return blocks.map(block => {
    const normalized = block.replace(/\s*\[\[(\d+)\]\]\s*/g, ' [[$1]] ').trim()
    const pieces = normalized.split(/(\[\[\d+\]\])/g).filter(Boolean)
    const runs = pieces.map(piece => {
      const marker = /^\[\[(\d+)\]\]$/.exec(piece)
      if (!marker) return run(piece, { size: 23, color: TEXT })
      return `${run(`(${marker[1]}) `, { bold: true, size: 23, color: BRAND })}${run('________________', { size: 23, color: '6B7280' })}`
    })
    return paragraph(runs, { after: 150, line: 360 })
  }).join('')
}

function answerBlock(exercise) {
  const rows = exercise.answers.map(answer => paragraph([
    run(`${answer.blank}. `, { bold: true, size: 23, color: TEXT }),
    run(answer.letter, { bold: true, size: 23, color: BRAND }),
    run(`  ${answer.word}`, { bold: true, size: 23, color: TEXT }),
    run(`  ${answer.explanation || ''}`, { size: 20, color: MUTED }),
  ], { after: 90, line: 300 })).join('')

  const distractorRows = exercise.distractors.map(item => paragraph([
    run(`${item.letter}. `, { bold: true, size: 21, color: TEXT }),
    run(item.word, { bold: true, size: 21, color: TEXT }),
    run(`  ${item.why || ''}`, { size: 19, color: MUTED }),
  ], { after: 70, line: 280 })).join('')

  const vocabularyRows = exercise.vocabulary && exercise.vocabulary.length
    ? exercise.vocabulary.map(item => paragraph([
        run(item.word, { bold: true, size: 21, color: TEXT }),
        run(`  ${[item.form, item.meaning].filter(Boolean).join(' · ')}`, { size: 19, color: MUTED }),
      ], { after: 55, line: 280 })).join('')
    : ''

  return [
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    heading('答案与解析  Answer Key'),
    paragraph([run(`Answers for: ${exercise.title}`, { size: 19, color: MUTED })], { after: 140, line: 260 }),
    rows,
    heading('干扰项  Distractors', { after: 60 }),
    distractorRows,
    vocabularyRows ? heading('重点词汇  Key Vocabulary', { after: 60 }) : '',
    vocabularyRows,
    paragraph([run('AI-generated. Teachers should review the answers and explanations before class.', { size: 17, color: MUTED, italic: true })], { after: 40, line: 260 }),
  ].join('')
}

/**
 * Build a Word document for one exercise.
 * @param {object} exercise normalized exercise
 * @param {boolean} includeAnswers whether to append the answer key
 * @returns {Buffer} DOCX bytes
 */
export function buildDocx(exercise, includeAnswers) {
  const title = plain(exercise.title) || 'IELTS Reading Practice'
  const meta = `IELTS ${plain(exercise.band)}  ·  ${Number(exercise.wordCount) || '—'} words  ·  5 gaps / 7 options  ·  ${includeAnswers ? "TEACHER'S COPY · ANSWER KEY INCLUDED" : 'STUDENT WORKSHEET'}`

  const body = []
  body.push(paragraph([run(title, { bold: true, size: 35, color: BRAND })], { after: 55, line: 300 }))
  body.push(paragraph([run(meta, { size: 19, color: MUTED })], { after: 110, line: 260 }))
  body.push(paragraph([run('Name: ______________________________    Date: ________________', { size: 21, color: MUTED })], { after: 190, line: 280 }))
  body.push(paragraph([
    run('Choose the best word from the box for each gap. Write its letter. Each option may be used once. Do not change the form of any word.', { size: 20, color: TEXT }),
    '<w:r><w:br/></w:r>',
    run('从方框中选择最合适的单词填入每个空格，填写字母；每个选项最多使用一次，不要改变单词形式。', { size: 19, color: MUTED }),
  ], {
    after: 180,
    line: 300,
    border: '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="C7D2FE"/><w:left w:val="single" w:sz="12" w:space="6" w:color="1F3A8A"/><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C7D2FE"/></w:pBdr>',
  }))

  body.push(paragraph([run('Word Box', { bold: true, size: 24, color: BRAND })], { after: 55, line: 280, keepNext: true }))
  body.push(wordBox(exercise))
  body.push(paragraph([run(' ', { size: 16 })], { after: 80, line: 200 }))
  body.push(heading('Reading Passage'))
  body.push(passageParagraphs(exercise.passage))

  if (includeAnswers) body.push(answerBlock(exercise))

  body.push(paragraph([run('Generated with IELTS Gap-Fill Studio · AI-assisted; please review before class.', { size: 16, color: '9CA3AF', italic: true })], { after: 0, line: 240 }))

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT_LATIN}" w:hAnsi="${FONT_LATIN}" w:eastAsia="${FONT_CJK}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  return zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: documentRels },
  ])
}
