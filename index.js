import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access, chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { constants as fsConstants, existsSync } from 'node:fs'
import { createHash, randomInt } from 'node:crypto'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildDocx } from './docx.js'

const STANDALONE_PATH = fileURLToPath(new URL('./standalone.html', import.meta.url))

const execFileAsync = promisify(execFile)

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const BLANKS = 5
const OPTIONS = 7
const MAX_WORDS = 50
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const GENERATE_TIMEOUT_MS = 180_000
const OCR_CACHE_DIR = path.join(tmpdir(), 'dsh-ielts-studio')
const OCR_BINARY = path.join(OCR_CACHE_DIR, 'vision-ocr-v1')
const OCR_SOURCE = path.join(OCR_CACHE_DIR, 'vision-ocr-v1.swift')
const OCR_MODULE_CACHE = path.join(OCR_CACHE_DIR, 'module-cache')

const BAND_GUIDE = {
  '4.0': 'CEFR A2+/B1. Short, simple sentences and very common everyday words; clear, explicit paragraph structure with limited complex grammar.',
  '4.5': 'CEFR B1. Mostly simple and compound sentences, common everyday and academic words, explicit paragraph topics.',
  '5.0': 'CEFR B1+. Clear paragraph structure, some complex sentences, common academic vocabulary, explicit cohesive devices.',
  '5.5': 'CEFR B2. Clear academic prose, a mix of simple and complex sentences, some less common vocabulary, mostly explicit cohesion.',
  '6.0': 'CEFR B2+. Varied complex structures, less common vocabulary, some implicit cohesion, a clear academic tone.',
  '6.5': 'CEFR C1. Sophisticated syntax, precise and less common vocabulary, subtle cohesion, a consistently academic tone.',
  '7.0': 'CEFR C1+. Dense academic prose, nuanced lexical choices, complex cohesion, and a confident academic register.',
  '7.5': 'CEFR C2. Demanding academic prose, precise low-frequency vocabulary, complex embedding, and subtle argumentation.',
}

const SYSTEM_PROMPT = `You are a senior IELTS Academic Reading item writer and a meticulous editor.
You write original, coherent passages and you follow structural constraints exactly.
You return valid JSON only: no markdown fences, no headings, no commentary.`

const SWIFT_OCR = `import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let cg = bitmap.cgImage else {
  FileHandle.standardError.write("cannot load image\\n".data(using: .utf8)!)
  exit(2)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
let observations = request.results ?? []
let sorted = observations.sorted { a, b in
  let ay = a.boundingBox.midY
  let by = b.boundingBox.midY
  if abs(ay - by) > 0.015 { return ay > by }
  return a.boundingBox.minX < b.boundingBox.minX
}
var lines: [String] = []
for obs in sorted {
  if let top = obs.topCandidates(1).first { lines.append(top.string) }
}
let data = try JSONSerialization.data(withJSONObject: lines, options: [])
print(String(data: data, encoding: .utf8)!)
`

class StudioError extends Error {
  constructor(code, message, status = 500, detail) {
    super(message)
    this.name = 'StudioError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

function norm(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function keyOf(value) {
  return norm(value).toLowerCase().replace(/[\u2019]/g, "'")
}

function cleanWord(raw) {
  let value = norm(raw)
  if (!value) return ''
  value = value.replace(/^\s*(?:[-\u2022*\u00b7]|\d{1,3}\s*[.)\u3001:\uff1a])\s*/, '')
  const match = value.match(/^[A-Za-z][A-Za-z'\u2019-]*(?:\s+[A-Za-z][A-Za-z'\u2019-]*){0,3}/)
  return match ? match[0].trim() : ''
}

function parseWords(input) {
  const source = Array.isArray(input) ? input : String(input ?? '').split(/[\n,;\uff0c\uff1b\u3001|]+/)
  const words = []
  const seen = new Set()
  for (const item of source) {
    const word = cleanWord(item)
    if (!word) continue
    const key = keyOf(word)
    if (seen.has(key)) continue
    seen.add(key)
    words.push(word)
  }
  return words
}

function countWords(text) {
  const matches = String(text ?? '').match(/[A-Za-z]+(?:['\u2019-][A-Za-z]+)*/g)
  return matches ? matches.length : 0
}

function normalizeOption(value) {
  let option = norm(value).replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, '')
  option = option.replace(/[.,;:]+$/, '').trim()
  if (!option) return ''
  if (!/^[A-Za-z][A-Za-z'\u2019\-\s]*$/.test(option)) return ''
  return option.replace(/\s+/g, ' ')
}

function cleanExplanation(value) {
  const explanation = norm(value)
  return explanation ? explanation.slice(0, 800) : '该词与上下文语义和语法搭配最吻合。'
}

function normalizeBand(value) {
  const band = String(value ?? '').trim()
  if (BAND_GUIDE[band]) return band
  const numeric = Number.parseFloat(band)
  if (Number.isFinite(numeric)) {
    const rounded = Math.round(numeric * 2) / 2
    const key = rounded.toFixed(1)
    if (BAND_GUIDE[key]) return key
  }
  return '5.5'
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wordAppears(text, word) {
  const body = escapeRegExp(word).replace(/\s+/g, '\\s+')
  return new RegExp(`(^|[^A-Za-z])${body}(?![A-Za-z])`, 'i').test(text)
}

function extractJson(text) {
  let source = String(text ?? '').trim()
  if (!source) throw new ValidationError('The model returned an empty response.')
  const fence = source.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) source = fence[1].trim()
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start === -1 || end <= start) throw new ValidationError('The response did not contain a JSON object.')
  return JSON.parse(source.slice(start, end + 1))
}

function validateExercise(raw, { words, band }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('The JSON root must be an object.')
  }

  const title = norm(raw.title).slice(0, 140) || 'IELTS Reading Practice'
  const passage = String(raw.passage ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\[\[\s*(\d+)\s*\]\]/g, '[[$1]]')
    .trim()

  if (!passage) throw new ValidationError('The passage is empty.')

  const markers = [...passage.matchAll(/\[\[(\d+)\]\]/g)]
  const markerNumbers = markers.map(match => Number(match[1]))
  if (markerNumbers.length !== BLANKS || markerNumbers.some((number, index) => number !== index + 1)) {
    throw new ValidationError(`The passage must contain exactly [[1]] through [[5]] in order; found ${markerNumbers.length} marker(s) (${markerNumbers.join(', ') || 'none'}).`)
  }

  const paragraphs = passage.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean)
  if (paragraphs.length < 5 || paragraphs.length > 6) {
    throw new ValidationError(`The passage must contain 5 or 6 paragraphs; found ${paragraphs.length}.`)
  }
  const gapsPerParagraph = paragraphs.map(part => (part.match(/\[\[\d+\]\]/g) || []).length)
  if (gapsPerParagraph.some(count => count > 1)) {
    throw new ValidationError('At most one gap may appear in each paragraph; two gaps landed in the same paragraph.')
  }
  if (gapsPerParagraph.filter(count => count === 1).length !== BLANKS) {
    throw new ValidationError('Each gap must sit in its own paragraph.')
  }

  const wordCount = countWords(passage.replace(/\[\[\d+\]\]/g, ' '))
  if (wordCount < 430 || wordCount > 570) {
    throw new ValidationError(`The passage must be about 500 words (430-570); found ${wordCount}.`)
  }

  const positions = markers.map(match => countWords(passage.slice(0, match.index)))
  if (positions[0] < 30) {
    throw new ValidationError('The first gap is too close to the beginning; leave at least 30 words before it.')
  }
  if (positions[BLANKS - 1] > wordCount - 25) {
    throw new ValidationError('The last gap is too close to the end; leave at least 25 words after it.')
  }
  for (let index = 1; index < positions.length; index += 1) {
    const distance = positions[index] - positions[index - 1]
    if (distance < 55 || distance > 150) {
      throw new ValidationError(`Gaps must be evenly spaced (55-150 words apart); gap ${index} to ${index + 1} is ${distance} words apart.`)
    }
  }

  if (!Array.isArray(raw.options) || raw.options.length !== OPTIONS) {
    throw new ValidationError(`Provide exactly ${OPTIONS} options; found ${Array.isArray(raw.options) ? raw.options.length : 'none'}.`)
  }
  const optionWords = raw.options.map(option => normalizeOption(typeof option === 'string' ? option : option?.word))
  if (optionWords.some(word => !word)) {
    throw new ValidationError('Every option must be an English word or short phrase (letters, spaces, apostrophes, and hyphens only).')
  }
  const optionKeys = optionWords.map(keyOf)
  if (new Set(optionKeys).size !== OPTIONS) {
    throw new ValidationError('All seven options must be different words.')
  }

  if (!Array.isArray(raw.answers) || raw.answers.length !== BLANKS) {
    throw new ValidationError(`Provide exactly ${BLANKS} answers; found ${Array.isArray(raw.answers) ? raw.answers.length : 'none'}.`)
  }
  const answers = raw.answers.map(answer => {
    const blank = Number(answer?.blank)
    const word = normalizeOption(answer?.word)
    if (!Number.isInteger(blank) || blank < 1 || blank > BLANKS || !word) {
      throw new ValidationError('Each answer needs a blank number from 1 to 5 and a word.')
    }
    return { blank, word, explanation: cleanExplanation(answer?.explanation) }
  })
  const blankNumbers = answers.map(answer => answer.blank).sort((a, b) => a - b)
  if (blankNumbers.join(',') !== '1,2,3,4,5') {
    throw new ValidationError('Answers must cover blanks 1, 2, 3, 4, and 5 exactly once each.')
  }
  const answerKeys = new Set(answers.map(answer => keyOf(answer.word)))
  if (answerKeys.size !== BLANKS) {
    throw new ValidationError('Each correct answer must be a different option.')
  }

  const studentKeys = new Set(words.map(keyOf))
  for (const answer of answers) {
    const answerKey = keyOf(answer.word)
    if (!studentKeys.has(answerKey)) {
      throw new ValidationError(`The correct answer "${answer.word}" is not copied exactly from the student list. Every correct answer must be one of the student's words, unchanged.`)
    }
    if (!optionKeys.includes(answerKey)) {
      throw new ValidationError(`The correct answer "${answer.word}" is missing from the seven options.`)
    }
    if (wordAppears(passage, answer.word)) {
      throw new ValidationError(`The answer word "${answer.word}" also appears in the passage. Remove that occurrence so the gap is not given away.`)
    }
  }

  if (!Array.isArray(raw.distractors) || raw.distractors.length !== OPTIONS - BLANKS) {
    throw new ValidationError(`Provide exactly ${OPTIONS - BLANKS} distractors; found ${Array.isArray(raw.distractors) ? raw.distractors.length : 'none'}.`)
  }
  const distractors = raw.distractors.map(distractor => {
    const word = normalizeOption(distractor?.word)
    if (!word) throw new ValidationError('Every distractor needs a word.')
    return { word, why: norm(distractor?.why).slice(0, 500) || '该词与所有空格的语法或语义不匹配。' }
  })
  const distractorKeys = new Set(distractors.map(distractor => keyOf(distractor.word)))
  if (distractorKeys.size !== OPTIONS - BLANKS) {
    throw new ValidationError('The two distractors must be different words.')
  }
  for (const distractor of distractors) {
    const distractorKey = keyOf(distractor.word)
    if (answerKeys.has(distractorKey)) {
      throw new ValidationError(`The distractor "${distractor.word}" is also marked as a correct answer.`)
    }
    if (!optionKeys.includes(distractorKey)) {
      throw new ValidationError(`The distractor "${distractor.word}" is missing from the seven options.`)
    }
  }
  const allOptionKeys = new Set([...answerKeys, ...distractorKeys])
  if (allOptionKeys.size !== OPTIONS || optionKeys.some(optionKey => !allOptionKeys.has(optionKey))) {
    throw new ValidationError('The seven options must be exactly the five correct answers plus the two distractors.')
  }

  if (words.length >= OPTIONS) {
    for (const optionKey of optionKeys) {
      if (!studentKeys.has(optionKey)) {
        throw new ValidationError('All seven options must come from the student list when it contains at least seven words.')
      }
    }
  }

  let vocabulary = []
  if (Array.isArray(raw.vocabulary)) {
    vocabulary = raw.vocabulary.slice(0, 8).map(item => ({
      word: normalizeOption(item?.word),
      form: norm(item?.form).slice(0, 80),
      meaning: norm(item?.meaning).slice(0, 160),
    })).filter(item => item.word)
  }
  if (vocabulary.length === 0) {
    vocabulary = answers.map(answer => ({ word: answer.word, form: answer.word, meaning: '' }))
  }

  return { title, passage, wordCount, band, optionsWords: optionWords, answers, distractors, vocabulary }
}

function isAscending(letters) {
  for (let index = 1; index < letters.length; index += 1) {
    if (letters[index].charCodeAt(0) <= letters[index - 1].charCodeAt(0)) return false
  }
  return true
}

function isDescending(letters) {
  for (let index = 1; index < letters.length; index += 1) {
    if (letters[index].charCodeAt(0) >= letters[index - 1].charCodeAt(0)) return false
  }
  return true
}

function shuffle(values) {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const temporary = copy[index]
    copy[index] = copy[swap]
    copy[swap] = temporary
  }
  return copy
}

function assignLetters({ optionsWords, answers, distractors }) {
  const answerByBlank = new Map(answers.map(answer => [answer.blank, keyOf(answer.word)]))

  const build = (order) => {
    const letterByKey = new Map(order.map((word, index) => [keyOf(word), LETTERS[index]]))
    const sequence = [1, 2, 3, 4, 5].map(blank => letterByKey.get(answerByBlank.get(blank)))
    if (sequence.some(letter => !letter) || isAscending(sequence) || isDescending(sequence)) return undefined
    return {
      options: order.map((word, index) => ({ letter: LETTERS[index], word })),
      answers: answers
        .map(answer => ({
          blank: answer.blank,
          letter: letterByKey.get(keyOf(answer.word)),
          word: answer.word,
          explanation: answer.explanation,
        }))
        .sort((a, b) => a.blank - b.blank),
      distractors: distractors.map(distractor => ({
        letter: letterByKey.get(keyOf(distractor.word)),
        word: distractor.word,
        why: distractor.why,
      })),
    }
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = build(shuffle(optionsWords))
    if (result) return result
  }

  let order = [...optionsWords]
  for (let rotation = 0; rotation < OPTIONS; rotation += 1) {
    order = [...order.slice(1), order[0]]
    const result = build(order)
    if (result) return result
  }

  throw new StudioError('LETTER_ASSIGNMENT_FAILED', '无法生成非顺序的答案字母，请重试。', 500)
}

function buildUserPrompt({ band, words, topic, feedback }) {
  const guide = BAND_GUIDE[band] || BAND_GUIDE['5.5']
  const wordList = words.map((word, index) => `${index + 1}. ${word}`).join('\n')
  const topicLine = topic || 'a general academic topic suitable for IELTS Academic Reading'

  let prompt = `Write one IELTS Academic Reading vocabulary gap-fill exercise in the "five gaps, seven options" format.

LEVEL: IELTS band ${band} (${guide})
LENGTH: about 500 words (acceptable range 470-540).
TOPIC: ${topicLine}

STUDENT VOCABULARY (today's words, preserve each spelling exactly):
${wordList}

STRUCTURE — every point must hold:
1. The passage has exactly five paragraphs and 470-540 words. Each paragraph contains exactly one gap. Mark the gaps [[1]], [[2]], [[3]], [[4]], and [[5]] in passage order. Space them evenly: roughly 70-120 words apart, with at least 30 words before gap 1 and at least 25 words after gap 5.
2. Each gap replaces one word or one fixed multi-word expression. The surrounding grammar must require exactly the form in the box: the test-taker will not change tense, number, or word class. Do not make a gap where two options are both grammatically possible.
3. The box has exactly seven options. Five are correct answers (one per gap); two are distractors. Every correct answer must be copied exactly from the student list, unchanged. The passage may also use derived or inflected forms of the student's words elsewhere, but a derived form is never an option or an answer.
4. If the student list has at least seven words, all seven options must come from that list (five answers plus two distractors). If the list has fewer than seven words, fill the remaining option slots with same-level academic words.
5. The two distractors must be plausible but grammatically or semantically incompatible with every gap; they must not be interchangeable with any correct answer.
6. Never write an answer word itself elsewhere in the passage: the gap is the only place where that exact word belongs. Do not place a definition, synonym, or apposition next to a gap that gives the answer away.
7. Use original content. Do not copy a known IELTS passage. Do not use proper nouns as options.

ANSWERS AND EXPLANATIONS:
- One option per gap, each option used at most once.
- Do not include option letters anywhere in the JSON: the platform assigns A-G letters randomly.
- Each explanation is 1-2 sentences in Simplified Chinese, explaining why the word fits the context; do not refer to option letters.
- Add 5-8 useful vocabulary items from the passage with their form and a short Chinese meaning.

Return exactly this JSON object and nothing else (no markdown fences):
{
  "title": "a short title for the passage",
  "passage": "paragraph 1 ... [[1]] ...\\n\\nparagraph 2 ... [[2]] ...\\n\\n...",
  "options": ["word1", "word2", "word3", "word4", "word5", "word6", "word7"],
  "answers": [
    { "blank": 1, "word": "exact student word", "explanation": "中文解析" }
  ],
  "distractors": [
    { "word": "distractor word", "why": "中文说明" }
  ],
  "vocabulary": [
    { "word": "word from the passage", "form": "part of speech / form", "meaning": "中文释义" }
  ]
}`

  if (feedback) {
    prompt += `\n\nYOUR PREVIOUS OUTPUT WAS REJECTED BY THE STRUCTURAL VALIDATOR:\n${feedback}\n\nRewrite the complete exercise and fix this exact problem. Check all requirements again before answering. Return JSON only.`
  }

  return prompt
}

function mapLlmFailure(failure) {
  const code = failure?.code || 'LLM_ERROR'
  const messages = {
    NO_ADAPTER: '当前模型服务未就绪，请稍后重试。',
    MISSING_CREDENTIAL: '模型账号尚未登录或缺少凭证，请到设置中检查。',
    INVALID_CREDENTIAL: '模型凭证无效，请到设置中检查。',
    AUTH: '模型账号认证失败，请到设置中重新登录。',
    RATE_LIMIT: '模型请求过于频繁，请稍后再试。',
    QUOTA: '模型额度已用完，请稍后再试。',
    ACCOUNT_QUOTA: '账户额度不足，请充值或更换模型。',
    CONTEXT_WINDOW_EXCEEDED: '输入内容超过模型上下文长度，请减少单词数量。',
    ABORTED: '请求已取消。',
  }
  return new StudioError(code, messages[code] || `模型调用失败：${failure?.message || '未知错误'}`, code === 'ABORTED' ? 499 : 502, { providerCode: code })
}

async function readJson(req, limit = 2 * 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new StudioError('PAYLOAD_TOO_LARGE', '请求内容过大，请压缩图片后重试。', 413)
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new StudioError('BAD_JSON', '请求数据格式错误。', 400)
  }
}

function sendJson(res, status, value) {
  if (res.writableEnded || res.destroyed) return
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

function isOcrSupported() {
  return process.platform === 'darwin' && (existsSync('/usr/bin/swiftc') || existsSync(OCR_BINARY))
}

let ocrBinaryPromise

async function ensureOcrBinary() {
  if (process.platform !== 'darwin') {
    throw new StudioError('OCR_UNAVAILABLE', '图片识别仅支持 macOS，请手动输入单词。', 503)
  }
  try {
    await access(OCR_BINARY, fsConstants.X_OK)
    return OCR_BINARY
  } catch {
    // Compile the helper below.
  }
  if (!existsSync('/usr/bin/swiftc')) {
    throw new StudioError('OCR_UNAVAILABLE', '未找到 Swift 编译工具，无法启用图片识别。请手动输入单词。', 503)
  }
  await mkdir(OCR_CACHE_DIR, { recursive: true })
  await mkdir(OCR_MODULE_CACHE, { recursive: true })
  await writeFile(OCR_SOURCE, SWIFT_OCR, 'utf8')
  try {
    await execFileAsync('/usr/bin/swiftc', [
      '-O',
      '-module-cache-path', OCR_MODULE_CACHE,
      OCR_SOURCE,
      '-o', OCR_BINARY,
    ], {
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, TMPDIR: OCR_CACHE_DIR },
    })
    await chmod(OCR_BINARY, 0o755)
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).slice(0, 1200)
    throw new StudioError('OCR_UNAVAILABLE', '本地图片识别组件准备失败，请手动输入单词。', 503, { detail })
  }
  return OCR_BINARY
}

function getOcrBinary() {
  if (!ocrBinaryPromise) {
    ocrBinaryPromise = ensureOcrBinary().catch(error => {
      ocrBinaryPromise = undefined
      throw error
    })
  }
  return ocrBinaryPromise
}

async function runOcr(imagePath) {
  const binary = await getOcrBinary()
  try {
    const { stdout } = await execFileAsync(binary, [imagePath], {
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    })
    const parsed = JSON.parse(String(stdout || '[]'))
    return Array.isArray(parsed) ? parsed.map(line => String(line)) : []
  } catch (error) {
    if (error instanceof StudioError) throw error
    throw new StudioError('OCR_FAILED', '图片识别失败，请换一张更清晰的图片，或手动输入单词。', 422)
  }
}

function wordsFromLines(lines) {
  const words = []
  const seen = new Set()
  const push = (word) => {
    if (!word || word.length < 2) return
    const key = keyOf(word)
    if (!key || seen.has(key)) return
    seen.add(key)
    words.push(word)
  }
  for (const rawLine of lines) {
    const line = String(rawLine ?? '').replace(/^\s*(?:[-\u2022*\u00b7]|\d{1,3}\s*[.)\u3001:\uff1a])\s*/, '')
    if (!line) continue
    if (/^(?:unit|lesson|module)\s*\d+|vocabulary|word\s*list|new\s*words|name\s*[:\uff1a]|date\s*[:\uff1a]/i.test(line)) continue
    const tokens = line.match(/[A-Za-z][A-Za-z'\u2019-]*/g) || []
    if (tokens.length > 5) {
      for (const token of tokens) push(token)
    } else {
      for (const part of line.split(/[,;\uff0c\uff1b\u3001|]+/)) {
        const word = cleanWord(part)
        if (word) push(word)
      }
    }
    if (words.length >= 80) break
  }
  return words.slice(0, 80)
}

function parseImageDataUrl(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(String(value ?? ''))
  if (!match) throw new StudioError('BAD_IMAGE', '请上传 PNG、JPG、WebP 或 GIF 图片。', 400)
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length) throw new StudioError('BAD_IMAGE', '图片内容为空。', 400)
  if (buffer.length > MAX_IMAGE_BYTES) throw new StudioError('IMAGE_TOO_LARGE', '图片不能超过 20 MB。', 413)
  const subtype = match[1].toLowerCase().split('/')[1]
  const extension = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif', heic: 'heic', heif: 'heif' }[subtype] || 'img'
  return { buffer, extension }
}

function normalizePdfExercise(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StudioError('BAD_EXERCISE', '题目数据无效，请重新生成后再导出。', 400)
  }
  const title = norm(value.title).slice(0, 200) || 'IELTS Reading Practice'
  const band = norm(value.band).slice(0, 10) || '5.5'
  const passage = String(value.passage ?? '').replace(/\r\n/g, '\n').trim()
  if (!passage || passage.length > 16000) {
    throw new StudioError('BAD_EXERCISE', '文章内容为空或过长，无法导出 PDF。', 400)
  }
  const markers = [...passage.matchAll(/\[\[(\d+)\]\]/g)].map(match => Number(match[1]))
  if (markers.length !== BLANKS || markers.some((number, index) => number !== index + 1)) {
    throw new StudioError('BAD_EXERCISE', '文章空格标记不完整，无法导出 PDF。', 400)
  }

  if (!Array.isArray(value.options) || value.options.length !== OPTIONS) {
    throw new StudioError('BAD_EXERCISE', '选项数量不正确，无法导出 PDF。', 400)
  }
  const letters = new Set()
  const options = value.options.map(item => {
    const letter = norm(item?.letter).toUpperCase()
    const word = normalizeOption(item?.word)
    if (!/^[A-G]$/.test(letter) || letters.has(letter) || !word || word.length > 80) {
      throw new StudioError('BAD_EXERCISE', '选项内容不正确，无法导出 PDF。', 400)
    }
    letters.add(letter)
    return { letter, word }
  })
  if (letters.size !== OPTIONS) {
    throw new StudioError('BAD_EXERCISE', '选项字母不完整，无法导出 PDF。', 400)
  }
  const optionByLetter = new Map(options.map(option => [option.letter, option]))

  if (!Array.isArray(value.answers) || value.answers.length !== BLANKS) {
    throw new StudioError('BAD_EXERCISE', '答案数量不正确，无法导出 PDF。', 400)
  }
  const answers = value.answers.map(item => {
    const blank = Number(item?.blank)
    const letter = norm(item?.letter).toUpperCase()
    const word = normalizeOption(item?.word)
    if (!Number.isInteger(blank) || blank < 1 || blank > BLANKS || !optionByLetter.has(letter) || !word) {
      throw new StudioError('BAD_EXERCISE', '答案内容不正确，无法导出 PDF。', 400)
    }
    const option = optionByLetter.get(letter)
    if (keyOf(option.word) !== keyOf(word)) {
      throw new StudioError('BAD_EXERCISE', '答案与选项不匹配，无法导出 PDF。', 400)
    }
    return {
      blank,
      letter,
      word: option.word,
      explanation: norm(item?.explanation).slice(0, 1200) || '该词与上下文语义和语法搭配最吻合。',
    }
  }).sort((a, b) => a.blank - b.blank)
  if (answers.map(answer => answer.blank).join(',') !== '1,2,3,4,5' || new Set(answers.map(answer => answer.letter)).size !== BLANKS) {
    throw new StudioError('BAD_EXERCISE', '答案编号不正确，无法导出 PDF。', 400)
  }

  if (!Array.isArray(value.distractors) || value.distractors.length !== OPTIONS - BLANKS) {
    throw new StudioError('BAD_EXERCISE', '干扰项数量不正确，无法导出 PDF。', 400)
  }
  const distractors = value.distractors.map(item => {
    const letter = norm(item?.letter).toUpperCase()
    const word = normalizeOption(item?.word)
    if (!optionByLetter.has(letter) || !word) {
      throw new StudioError('BAD_EXERCISE', '干扰项内容不正确，无法导出 PDF。', 400)
    }
    const option = optionByLetter.get(letter)
    if (keyOf(option.word) !== keyOf(word)) {
      throw new StudioError('BAD_EXERCISE', '干扰项与选项不匹配，无法导出 PDF。', 400)
    }
    return { letter, word: option.word, why: norm(item?.why).slice(0, 600) || '该词与所有空格的语法或语义不匹配。' }
  })
  const usedLetters = new Set([...answers, ...distractors].map(item => item.letter))
  if (usedLetters.size !== OPTIONS || options.some(option => !usedLetters.has(option.letter))) {
    throw new StudioError('BAD_EXERCISE', '选项与答案不完整，无法导出 PDF。', 400)
  }

  const vocabulary = Array.isArray(value.vocabulary)
    ? value.vocabulary.slice(0, 12).map(item => ({
        word: normalizeOption(item?.word).slice(0, 80),
        form: norm(item?.form).slice(0, 80),
        meaning: norm(item?.meaning).slice(0, 160),
      })).filter(item => item.word)
    : []

  const computedWords = countWords(passage.replace(/\[\[\d+\]\]/g, ' '))
  const wordCount = Number.isFinite(Number(value.wordCount)) ? Number(value.wordCount) : computedWords

  return { title, band, wordCount: wordCount || computedWords, passage, options, answers, distractors, vocabulary }
}

function sendPdf(res, bytes, filename) {
  if (res.writableEnded || res.destroyed) return
  res.writeHead(200, {
    'content-type': 'application/pdf',
    'content-length': bytes.length,
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store',
  })
  res.end(bytes)
}

export const inject = ['llm', 'webServer', 'agentDefaultModel']

export function apply(ctx, config = {}) {
  const settings = config && typeof config === 'object' ? config : {}
  let activeGenerations = 0

  const route = (handler) => async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      if (res.writableEnded || res.destroyed) return
      const status = error instanceof StudioError ? error.status : 500
      const code = error instanceof StudioError ? error.code : 'INTERNAL'
      const message = error instanceof StudioError ? error.message : '服务内部错误，请稍后重试。'
      sendJson(res, status, { ok: false, error: { code, message, detail: error instanceof StudioError ? error.detail : undefined } })
    }
  }

  const handleInfo = route(async (req, res) => {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET。' } })
      return
    }
    const selection = ctx.agentDefaultModel.currentSelection()
    sendJson(res, 200, {
      ok: true,
      provider: settings.provider || selection.provider,
      model: settings.model || selection.model,
      ocr: isOcrSupported(),
      limits: { minWords: 5, maxWords: MAX_WORDS, blanks: BLANKS, options: OPTIONS },
    })
  })

  const handleOcr = route(async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST。' } })
      return
    }
    if (!isOcrSupported()) {
      throw new StudioError('OCR_UNAVAILABLE', '图片识别仅支持 macOS，请手动输入单词。', 503)
    }
    const body = await readJson(req, 32 * 1024 * 1024)
    const { buffer, extension } = parseImageDataUrl(body.dataUrl)
    await mkdir(OCR_CACHE_DIR, { recursive: true })
    const imagePath = path.join(OCR_CACHE_DIR, `image-${Date.now()}-${randomInt(1_000_000_000)}.${extension}`)
    try {
      await writeFile(imagePath, buffer)
      const lines = await runOcr(imagePath)
      const words = wordsFromLines(lines)
      sendJson(res, 200, { ok: true, lines, words })
    } finally {
      await rm(imagePath, { force: true }).catch(() => {})
    }
  })

  const handleGenerate = route(async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST。' } })
      return
    }
    if (activeGenerations >= 2) {
      throw new StudioError('BUSY', '已有两道题正在生成，请稍后再试。', 429)
    }
    const body = await readJson(req, 2 * 1024 * 1024)
    const words = parseWords(body.words)
    if (words.length < 5) {
      throw new StudioError('WORDS_TOO_FEW', '请至少输入 5 个学生单词。', 400)
    }
    if (words.length > MAX_WORDS) {
      throw new StudioError('WORDS_TOO_MANY', `一次最多支持 ${MAX_WORDS} 个单词。`, 400)
    }
    const band = normalizeBand(body.band)
    const topic = norm(body.topic).replace(/[\r\n]+/g, ' ').slice(0, 120)

    const selection = ctx.agentDefaultModel.currentSelection()
    const provider = settings.provider || selection.provider
    const model = settings.model || selection.model
    const reasoningEffort = settings.reasoningEffort === undefined ? selection.reasoningEffort : settings.reasoningEffort

    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, GENERATE_TIMEOUT_MS)
    const onClose = () => {
      if (!res.writableEnded) controller.abort()
    }
    res.once('close', onClose)
    activeGenerations += 1

    try {
      let lastError = ''
      let lastRaw = ''
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const userPrompt = buildUserPrompt({ band, words, topic, feedback: lastError })
        let text = ''
        let finish
        try {
          for await (const chunk of ctx.llm.stream({
            provider,
            model,
            ...(reasoningEffort ? { reasoningEffort } : {}),
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: [{ type: 'text', text: userPrompt }] }],
            temperature: 0.9,
            signal: controller.signal,
          })) {
            if (chunk.type === 'text-delta') text += chunk.text
            else if (chunk.type === 'finish') finish = chunk.reason
          }
        } catch (error) {
          if (timedOut) throw new StudioError('TIMEOUT', '生成超时（180 秒）。请把模型换成 flash 档，或稍后重试。', 504)
          if (controller.signal.aborted) throw new StudioError('ABORTED', '请求已取消。', 499)
          throw new StudioError('LLM_ERROR', `模型调用失败：${error?.message || '未知错误'}`, 502)
        }
        if (timedOut) {
          throw new StudioError('TIMEOUT', '生成超时（180 秒）。请把模型换成 flash 档，或稍后重试。', 504)
        }
        if (finish?.kind === 'error' || finish?.kind === 'aborted') {
          throw mapLlmFailure(finish.failure)
        }
        if (!text.trim()) {
          throw new StudioError('EMPTY_RESPONSE', '模型没有返回内容，请重试。', 502)
        }
        lastRaw = text

        try {
          const raw = extractJson(text)
          const validated = validateExercise(raw, { words, band })
          const lettered = assignLetters(validated)
          sendJson(res, 200, {
            ok: true,
            exercise: {
              title: validated.title,
              band,
              wordCount: validated.wordCount,
              passage: validated.passage,
              options: lettered.options,
              answers: lettered.answers,
              distractors: lettered.distractors,
              vocabulary: validated.vocabulary,
              model: `${provider}/${model}`,
              attempts: attempt,
              generatedAt: new Date().toISOString(),
            },
          })
          return
        } catch (error) {
          if (!(error instanceof ValidationError)) throw error
          lastError = error.message
        }
      }
      throw new StudioError('MODEL_OUTPUT_INVALID', '模型生成的内容没有通过结构校验，请重试。', 502, {
        reason: lastError,
        raw: lastRaw.slice(0, 4000),
      })
    } finally {
      clearTimeout(timeout)
      activeGenerations -= 1
      res.off('close', onClose)
    }
  })

  const handlePdf = route(async (req, res) => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST。' } })
      return
    }
    const officeToPdf = ctx.get('officeToPdf')
    if (!officeToPdf) {
      throw new StudioError('PDF_UNAVAILABLE', '当前环境未启用 PDF 导出服务。', 503)
    }
    const body = await readJson(req, 2 * 1024 * 1024)
    const exercise = normalizePdfExercise(body.exercise)
    const includeAnswers = Boolean(body.includeAnswers)
    const docx = buildDocx(exercise, includeAnswers)
    if (!docx || docx.length < 1000) {
      throw new StudioError('PDF_BUILD_FAILED', 'PDF 文档生成失败，请重试。', 500)
    }
    const version = createHash('sha256').update(docx).digest('hex')
    const controller = new AbortController()
    const onClose = () => {
      if (!res.writableEnded) controller.abort()
    }
    res.once('close', onClose)

    try {
      const result = await officeToPdf.convert({
        extension: 'docx',
        priority: 'foreground',
        source: {
          key: 'ielts-studio',
          version,
          bytes: docx.length,
          read: async () => ({ bytes: docx, version }),
        },
      }, controller.signal)

      const pdf = Buffer.from(result.pdf)
      if (pdf.length < 100 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new StudioError('PDF_INVALID', 'PDF 生成结果无效，请重试。', 502)
      }
      const filename = `ielts-five-gaps-${exercise.band.replace(/[^0-9.]/g, '') || '5.5'}-${includeAnswers ? 'answers' : 'exercise'}.pdf`
      sendPdf(res, pdf, filename)
    } catch (error) {
      if (controller.signal.aborted) throw new StudioError('ABORTED', '请求已取消。', 499)
      if (error instanceof StudioError) throw error
      throw new StudioError('PDF_FAILED', `PDF 生成失败：${error?.message || '未知错误'}`, 502)
    } finally {
      res.off('close', onClose)
    }
  })

  const handleStandalone = route(async (req, res) => {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET。' } })
      return
    }
    const pathname = new URL(req.url, 'http://localhost').pathname
    if (pathname !== '/ielts-studio' && pathname !== '/ielts-studio/') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const html = await readFile(STANDALONE_PATH, 'utf8')
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': Buffer.byteLength(html),
      'cache-control': 'no-store',
    })
    res.end(html)
  })

  ctx.effect(() => {
    const disposeInfo = ctx.webServer.register({ kind: 'exact', path: '/x-ielts-studio/info', handler: handleInfo })
    const disposeOcr = ctx.webServer.register({ kind: 'exact', path: '/x-ielts-studio/ocr', handler: handleOcr })
    const disposeGenerate = ctx.webServer.register({ kind: 'exact', path: '/x-ielts-studio/generate', handler: handleGenerate })
    const disposePdf = ctx.webServer.register({ kind: 'exact', path: '/x-ielts-studio/pdf', handler: handlePdf })
    const disposeStandalone = ctx.webServer.register({ kind: 'prefix', path: '/ielts-studio', handler: handleStandalone })
    return () => {
      disposeInfo()
      disposeOcr()
      disposeGenerate()
      disposePdf()
      disposeStandalone()
    }
  }, 'ielts-studio: HTTP routes')
}
