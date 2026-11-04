window.__ModuleLoader__.load({
  id: '@local/ielts-studio',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef } = React

    const NS = 'ielts-studio'
    const STORAGE_KEY = 'dsh.ielts-studio.v1'
    const BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0']
    const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

    const zh = {
      'panel.label': '雅思出题',
      'hero.eyebrow': 'IELTS READING · 七选五',
      'hero.title': '雅思七选五出题器',
      'hero.subtitle': '用学生今天学的单词，生成一篇约 500 词的雅思阅读填空题。选项原样填写，答案字母随机打乱，空格均匀分布。',
      'hero.badge': '模型',
      'hero.ready': '模型就绪',
      'hero.standalone': '独立网页',
      'setup.band': '选择雅思难度',
      'setup.bandHint': '决定文章长度、句式和词汇难度',
      'setup.words': '学生今日单词',
      'setup.wordsPlaceholder': '每行一个，或用逗号分隔。\n例如：\nsustainable, urbanization\ninfrastructure, resilient\nemission, conservation',
      'setup.wordsHint': '至少 5 个，最多 50 个。文中可以自然出现派生词，但选项和答案保持原形。',
      'setup.wordsCount': '{n} 个单词',
      'setup.sample': '填入示例',
      'setup.image': '拍照 / 上传单词表',
      'setup.imageHint': '拖入图片、粘贴截图，或点击选择',
      'setup.imageBusy': '正在识别图片…',
      'setup.imageFirst': '首次识别会在本机准备 OCR 组件，可能需要十几秒。',
      'setup.imageFound': '已识别 {n} 个单词',
      'setup.imagePreview': '查看识别原文',
      'setup.imageNone': '没有识别到单词，请换一张更清晰的图片。',
      'setup.imageBad': '请选择图片文件（PNG、JPG、WebP、GIF）。',
      'setup.imageLarge': '图片不能超过 20 MB。',
      'setup.topic': '文章主题（可选）',
      'setup.topicPlaceholder': '例如：城市可持续发展 / 人工智能与教育 / 远程办公',
      'setup.summary': '{words} 个单词 · 5 个空格 · 7 个选项 · 约 500 词',
      'setup.generate': '生成题目',
      'setup.generateAgain': '重新生成',
      'setup.tooFew': '请至少输入 5 个有效英文单词。',
      'setup.tooMany': '一次最多支持 50 个单词，请删除一些。',
      'setup.backToExercise': '返回上一题',
      'loading.title': '正在生成题目…',
      'loading.hint': '通常需要 30–90 秒。生成时会校验空格分布、选项数量和答案字母。',
      'loading.cancel': '取消',
      'error.title': '出了点问题',
      'error.details': '查看详细信息',
      'error.cancelled': '已取消本次生成。',
      'error.generate': '生成失败，请稍后重试。',
      'error.network': '无法连接到本机服务，请确认应用仍在运行。',
      'ex.back': '修改设置',
      'ex.regenerate': '换一篇',
      'ex.copy': '复制题目',
      'ex.copyAnswers': '复制答案',
      'ex.pdfExercise': '题目 PDF',
      'ex.pdfAnswers': '答案 PDF',
      'ex.pdfBusyExercise': '题目 PDF 生成中…',
      'ex.pdfBusyAnswers': '答案 PDF 生成中…',
      'ex.pdfDone': 'PDF 已开始下载',
      'ex.pdfFail': 'PDF 导出失败，请稍后重试。',
      'ex.redo': '重做',
      'ex.instructionsTitle': '作答说明',
      'ex.instructions': '从 A–G 中为每个空格选择最合适的单词。每个选项最多使用一次；填写时不需要改变单词形式。可以先点空格，再点选项。',
      'ex.wordbox': 'Word Box',
      'ex.wordboxHint': '点击选项填入当前空格',
      'ex.passage': 'Reading Passage',
      'ex.submit': '提交答案',
      'ex.submitHint': '还有空格未填写',
      'ex.showAnswers': '显示答案解析',
      'ex.hideAnswers': '隐藏答案解析',
      'ex.score': '答对 {correct} / {total}',
      'ex.scorePerfect': '全对！空格和词义都掌握得很好。',
      'ex.scoreGood': '不错，再看一下错题的上下文线索。',
      'ex.scoreLow': '建议先通读全文，再根据语法和语义排除干扰项。',
      'ex.answerKey': '答案与解析',
      'ex.distractors': '干扰项',
      'ex.vocabulary': '重点词汇',
      'ex.used': '已用',
      'ex.blank': '第 {n} 空',
      'ex.correct': '正确',
      'ex.wrong': '应为 {letter}',
      'ex.aiNote': '本题由 AI 生成，建议教师课前核对答案与解析。',
      'ex.copied': '已复制到剪贴板',
      'ex.copyFailed': '复制失败，请手动选择文本。',
      'ex.empty': '请先为 5 个空格选择答案。',
      'ex.unused': '未使用',
      'ex.backend': '生成服务',
      'ex.words': '{n} 词',
      'ex.gaps': '{n} 空',
      'ex.options': '{n} 选',
      'ex.noExplanation': '符合上下文语境。',
    }

    const en = {
      'panel.label': 'IELTS Studio',
      'hero.eyebrow': 'IELTS READING · FIVE GAPS, SEVEN OPTIONS',
      'hero.title': 'IELTS Gap-Fill Studio',
      'hero.subtitle': 'Turn today\'s vocabulary into a 500-word IELTS reading gap-fill. Options are copied unchanged, answer letters are shuffled, and the gaps are evenly spread.',
      'hero.badge': 'Model',
      'hero.ready': 'model ready',
      'hero.standalone': 'Standalone page',
      'setup.band': 'IELTS band',
      'setup.bandHint': 'Sets sentence complexity, vocabulary and length',
      'setup.words': 'Today\'s vocabulary',
      'setup.wordsPlaceholder': 'One word per line, or separate with commas.\nFor example:\nsustainable, urbanization\ninfrastructure, resilient\nemission, conservation',
      'setup.wordsHint': '5–50 words. Derived forms may appear in the passage, but options and answers keep their original form.',
      'setup.wordsCount': '{n} words',
      'setup.sample': 'Use a sample',
      'setup.image': 'Photo / upload a word list',
      'setup.imageHint': 'Drop an image, paste a screenshot, or click to choose',
      'setup.imageBusy': 'Recognising the image…',
      'setup.imageFirst': 'The first scan prepares a local OCR helper and may take a few seconds.',
      'setup.imageFound': '{n} words recognised',
      'setup.imagePreview': 'View recognised text',
      'setup.imageNone': 'No words found. Try a clearer photo.',
      'setup.imageBad': 'Please choose an image file (PNG, JPG, WebP, GIF).',
      'setup.imageLarge': 'Images must be 20 MB or smaller.',
      'setup.topic': 'Topic (optional)',
      'setup.topicPlaceholder': 'e.g. sustainable cities / AI and education / remote work',
      'setup.summary': '{words} words · 5 gaps · 7 options · about 500 words',
      'setup.generate': 'Generate exercise',
      'setup.generateAgain': 'Generate another',
      'setup.tooFew': 'Enter at least 5 valid English words.',
      'setup.tooMany': 'Up to 50 words are supported. Remove a few.',
      'setup.backToExercise': 'Back to the exercise',
      'loading.title': 'Writing your exercise…',
      'loading.hint': 'This usually takes 30–90 seconds. The result is checked for gap spacing, option count and shuffled answer letters.',
      'loading.cancel': 'Cancel',
      'error.title': 'Something went wrong',
      'error.details': 'Show details',
      'error.cancelled': 'Generation cancelled.',
      'error.generate': 'Generation failed. Please try again.',
      'error.network': 'Cannot reach the local service. Is the app still running?',
      'ex.back': 'Change settings',
      'ex.regenerate': 'Another one',
      'ex.copy': 'Copy exercise',
      'ex.copyAnswers': 'Copy answers',
      'ex.pdfExercise': 'Exercise PDF',
      'ex.pdfAnswers': 'Answers PDF',
      'ex.pdfBusyExercise': 'Preparing exercise PDF…',
      'ex.pdfBusyAnswers': 'Preparing answers PDF…',
      'ex.pdfDone': 'PDF download started',
      'ex.pdfFail': 'PDF export failed. Please try again.',
      'ex.redo': 'Redo',
      'ex.instructionsTitle': 'Instructions',
      'ex.instructions': 'Choose the best word from A–G for each gap. Use each option at most once and do not change its form. Click a gap, then an option.',
      'ex.wordbox': 'Word Box',
      'ex.wordboxHint': 'Click an option to fill the active gap',
      'ex.passage': 'Reading Passage',
      'ex.submit': 'Check answers',
      'ex.submitHint': 'Some gaps are still empty',
      'ex.showAnswers': 'Show answers and explanations',
      'ex.hideAnswers': 'Hide answers and explanations',
      'ex.score': '{correct} / {total} correct',
      'ex.scorePerfect': 'Perfect. The gaps and the vocabulary are both under control.',
      'ex.scoreGood': 'Nice work. Re-read the wrong gaps for their context clues.',
      'ex.scoreLow': 'Read the whole passage first, then use grammar and meaning to eliminate options.',
      'ex.answerKey': 'Answers and explanations',
      'ex.distractors': 'Distractors',
      'ex.vocabulary': 'Key vocabulary',
      'ex.used': 'used',
      'ex.blank': 'Blank {n}',
      'ex.correct': 'correct',
      'ex.wrong': 'expected {letter}',
      'ex.aiNote': 'AI-generated. Teachers should review the answers and explanations before class.',
      'ex.copied': 'Copied to clipboard',
      'ex.copyFailed': 'Copy failed. Select the text manually.',
      'ex.empty': 'Choose an answer for all five gaps first.',
      'ex.unused': 'unused',
      'ex.backend': 'Service',
      'ex.words': '{n} words',
      'ex.gaps': '{n} gaps',
      'ex.options': '{n} options',
      'ex.noExplanation': 'This word fits the context.',
    }

    const SAMPLE_WORDS = [
      'sustainable', 'urbanization', 'infrastructure', 'resilient', 'emission',
      'conservation', 'innovation', 'inevitable', 'allocate', 'deteriorate',
    ].join('\n')

    const CSS = `
.ieltsx-page{height:100%;overflow-y:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:inherit;}
.ieltsx-page *{box-sizing:border-box;}
.ieltsx-shell{max-width:1040px;margin:0 auto;padding:calc(28px + var(--dsh-frame-top-clearance,0px)) 36px 96px;}
.ieltsx-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;}
.ieltsx-eyebrow{font-size:11px;letter-spacing:.15em;font-weight:650;color:var(--dsw-alias-brand-primary);text-transform:uppercase;}
.ieltsx-title{font-size:30px;line-height:1.2;letter-spacing:-.025em;font-weight:680;margin:10px 0 8px;}
.ieltsx-subtitle{max-width:720px;margin:0;font-size:14.5px;line-height:1.75;color:var(--dsw-alias-label-secondary);}
.ieltsx-model{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.ieltsx-hero-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;padding-top:4px;}
.ieltsx-standalone{font-size:11.5px;font-weight:600;color:var(--dsw-alias-brand-primary);text-decoration:none;opacity:.9;}
.ieltsx-standalone:hover{text-decoration:underline;opacity:1;}
.ieltsx-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-success-primary);}
.ieltsx-dot.idle{background:var(--dsw-alias-state-idle-primary);}
.ieltsx-card{margin-top:20px;padding:22px 22px 20px;border:1px solid var(--dsw-alias-border-l1);border-radius:15px;background:var(--dsw-alias-bg-layer-1);}
.ieltsx-card + .ieltsx-card{margin-top:14px;}
.ieltsx-card-head{display:flex;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
.ieltsx-step{font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--dsw-alias-brand-primary);}
.ieltsx-card-head h2{font-size:15px;font-weight:650;margin:0;}
.ieltsx-hint{font-size:12px;color:var(--dsw-alias-label-secondary);}
.ieltsx-segmented{display:inline-flex;gap:4px;padding:4px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);}
.ieltsx-segmented button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;font-weight:600;padding:7px 15px;border-radius:8px;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s;}
.ieltsx-segmented button:hover{color:var(--dsw-alias-label-primary);}
.ieltsx-segmented button[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);}
.ieltsx-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(250px,.7fr);gap:16px;align-items:stretch;}
.ieltsx-field{display:flex;flex-direction:column;min-width:0;}
.ieltsx-field label{font-size:13px;font-weight:600;margin-bottom:7px;}
.ieltsx-textarea{width:100%;min-height:150px;resize:vertical;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:11px 13px;font:inherit;font-size:13.5px;line-height:1.65;outline:none;transition:border-color .15s,box-shadow .15s;}
.ieltsx-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);}
.ieltsx-field-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;flex-wrap:wrap;}
.ieltsx-count{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ieltsx-link{appearance:none;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:0;}
.ieltsx-link:hover{text-decoration:underline;}
.ieltsx-help{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin:7px 0 0;}
.ieltsx-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;min-height:182px;height:100%;padding:20px 16px;border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 70%,transparent);cursor:pointer;text-align:center;transition:border-color .15s,background .15s;}
.ieltsx-drop:hover,.ieltsx-drop.over{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent);}
.ieltsx-drop-title{font-size:13px;font-weight:650;}
.ieltsx-drop-hint{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);max-width:210px;}
.ieltsx-ocr{margin-top:10px;font-size:11.5px;color:var(--dsw-alias-state-success-primary);font-weight:600;}
.ieltsx-spinner{width:18px;height:18px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:ieltsx-spin .8s linear infinite;flex:none;}
.ieltsx-spinner.large{width:30px;height:30px;border-width:2.5px;}
.ieltsx-spinner.small{width:14px;height:14px;border-width:1.5px;}
@keyframes ieltsx-spin{to{transform:rotate(360deg);}}
.ieltsx-topic{width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:10px 13px;font:inherit;font-size:13.5px;outline:none;}
.ieltsx-topic:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);}
.ieltsx-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:20px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;}
.ieltsx-summary{font-size:12px;color:var(--dsw-alias-label-secondary);}
.ieltsx-primary{appearance:none;border:0;border-radius:9px;background:var(--dsw-alias-brand-primary);color:#fff;font:inherit;font-size:13.5px;font-weight:650;padding:10px 20px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:filter .15s,opacity .15s;}
.ieltsx-primary:hover{filter:brightness(1.06);}
.ieltsx-primary:disabled{opacity:.45;cursor:not-allowed;filter:none;}
.ieltsx-secondary{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;font-weight:600;padding:7px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.ieltsx-secondary:hover{background:var(--dsw-alias-bg-layer-2);}
.ieltsx-secondary:disabled{opacity:.5;cursor:not-allowed;background:transparent;}
.ieltsx-ghost{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;font-weight:600;padding:6px 4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.ieltsx-ghost:hover{color:var(--dsw-alias-label-primary);}
.ieltsx-error{margin-top:14px;padding:11px 13px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.6;}
.ieltsx-error details{margin-top:7px;color:var(--dsw-alias-label-secondary);}
.ieltsx-error pre{white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);padding:9px 10px;border-radius:7px;font-size:11px;line-height:1.5;}
.ieltsx-success{margin-top:14px;padding:11px 13px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,transparent);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);color:var(--dsw-alias-state-success-primary);font-size:12.5px;}
.ieltsx-loading{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:56px 24px;margin-top:24px;}
.ieltsx-loading h2{font-size:18px;font-weight:650;margin:4px 0 0;}
.ieltsx-loading p{margin:0;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary);max-width:460px;}
.ieltsx-loading .ieltsx-secondary{margin-top:10px;}
.ieltsx-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:22px 0 14px;}
.ieltsx-toolbar .grow{flex:1;}
.ieltsx-notice{font-size:12px;color:var(--dsw-alias-state-success-primary);font-weight:600;}
.ieltsx-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;}
.ieltsx-chip{padding:4px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:11.5px;color:var(--dsw-alias-label-secondary);font-weight:600;letter-spacing:.01em;}
.ieltsx-section{margin-top:22px;}
.ieltsx-section-head{display:flex;align-items:baseline;gap:9px;margin-bottom:10px;}
.ieltsx-section-head h2{font-size:15px;font-weight:650;margin:0;}
.ieltsx-section-head span{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ieltsx-instructions{padding:13px 15px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-brand-primary);border-radius:9px;background:var(--dsw-alias-bg-layer-2);font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary);}
.ieltsx-wordbox{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}
.ieltsx-option{display:flex;align-items:center;gap:9px;min-width:0;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;transition:border-color .15s,background .15s;}
.ieltsx-option:hover{border-color:var(--dsw-alias-border-l2);}
.ieltsx-option.used{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);}
.ieltsx-option.answer{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 55%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);}
.ieltsx-option.distractor{opacity:.62;border-style:dashed;}
.ieltsx-option:disabled{cursor:default;}
.ieltsx-letter{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;flex:none;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);font-size:11.5px;font-weight:750;}
.ieltsx-word{font-size:13.5px;font-weight:600;min-width:0;overflow-wrap:anywhere;}
.ieltsx-usedtag{margin-left:auto;font-size:10px;font-weight:650;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.ieltsx-passage{font-family:ui-serif,Georgia,'Times New Roman',serif;font-size:17px;line-height:1.95;letter-spacing:.005em;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:26px 30px;}
.ieltsx-passage p{margin:0 0 18px;}
.ieltsx-passage p:last-child{margin-bottom:0;}
.ieltsx-blankwrap{display:inline-flex;align-items:baseline;gap:5px;margin:0 3px;border-bottom:2px solid var(--dsw-alias-brand-primary);vertical-align:baseline;}
.ieltsx-blankwrap.correct{border-color:var(--dsw-alias-state-success-primary);}
.ieltsx-blankwrap.wrong{border-color:var(--dsw-alias-state-error-primary);}
.ieltsx-blank{appearance:none;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font-family:inherit;font-size:15px;font-weight:750;padding:1px 2px;width:52px;text-align:center;cursor:pointer;outline:none;}
.ieltsx-blank:focus{box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);border-radius:4px;}
.ieltsx-blank option{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:ui-sans-serif,system-ui,sans-serif;}
.ieltsx-mark{font-size:11px;font-weight:700;white-space:nowrap;color:var(--dsw-alias-state-success-primary);}
.ieltsx-mark.wrong{color:var(--dsw-alias-state-error-primary);}
.ieltsx-submitrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;}
.ieltsx-submitrow .ieltsx-hint{font-size:11.5px;}
.ieltsx-result{display:flex;align-items:center;gap:16px;padding:15px 17px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);margin-top:18px;flex-wrap:wrap;}
.ieltsx-score{font-size:24px;font-weight:750;letter-spacing:-.02em;color:var(--dsw-alias-brand-primary);}
.ieltsx-result p{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);flex:1;min-width:220px;}
.ieltsx-answer{padding:12px 0;border-top:1px solid var(--dsw-alias-border-l1);}
.ieltsx-answer:first-child{border-top:0;padding-top:0;}
.ieltsx-answer-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ieltsx-answer-word{font-size:13.5px;font-weight:650;}
.ieltsx-answer p{margin:5px 0 0;font-size:12.5px;line-height:1.75;color:var(--dsw-alias-label-secondary);}
.ieltsx-distractor{display:flex;gap:8px;align-items:baseline;padding:8px 0;border-top:1px solid var(--dsw-alias-border-l1);font-size:12.5px;line-height:1.7;}
.ieltsx-distractor:first-child{border-top:0;}
.ieltsx-distractor strong{font-weight:650;}
.ieltsx-distractor span{color:var(--dsw-alias-label-secondary);}
.ieltsx-vocab{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;}
.ieltsx-vocabitem{padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-base);}
.ieltsx-vocabitem strong{display:block;font-size:13px;font-weight:650;}
.ieltsx-vocabitem em{display:block;margin-top:2px;font-size:10.5px;font-style:normal;color:var(--dsw-alias-label-secondary);}
.ieltsx-vocabitem span{display:block;margin-top:3px;font-size:12px;color:var(--dsw-alias-label-secondary);}
.ieltsx-note{margin-top:30px;text-align:center;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary);}
.ieltsx-pre{white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);padding:9px 10px;border-radius:8px;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);margin:8px 0 0;}
.ieltsx-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
@media (max-width:860px){
  .ieltsx-shell{padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 22px 80px;}
  .ieltsx-grid{grid-template-columns:1fr;}
  .ieltsx-drop{min-height:150px;}
  .ieltsx-title{font-size:26px;}
}
@media (max-width:560px){
  .ieltsx-shell{padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 15px 70px;}
  .ieltsx-hero{flex-direction:column;gap:10px;}
  .ieltsx-hero-side{align-items:flex-start;}
  .ieltsx-title{font-size:23px;}
  .ieltsx-passage{padding:18px 17px;font-size:16px;}
  .ieltsx-wordbox{grid-template-columns:1fr 1fr;}
  .ieltsx-card{padding:17px 15px;}
  .ieltsx-actions{align-items:stretch;}
  .ieltsx-actions .ieltsx-primary{justify-content:center;}
}
`

    function normalizeSpace(value) {
      return String(value ?? '').replace(/\s+/g, ' ').trim()
    }

    function keyOf(value) {
      return normalizeSpace(value).toLowerCase().replace(/[\u2019]/g, "'")
    }

    function cleanWord(raw) {
      let value = normalizeSpace(raw)
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

    function mergeWords(left, right) {
      const seen = new Set()
      const merged = []
      for (const word of [...left, ...right]) {
        const key = keyOf(word)
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push(word)
      }
      return merged.slice(0, 50)
    }

    function filterOcrWords(list) {
      return (Array.isArray(list) ? list : []).filter(word => {
        const value = normalizeSpace(word)
        if (!value) return false
        return !/^(?:unit|lesson|module)\s*\d+|vocabulary|word\s*list|new\s*words|name\s*[:\uff1a]|date\s*[:\uff1a]/i.test(value)
      })
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
    }

    function loadSaved() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
      }
    }

    function useLocaleTick(ctx) {
      const [, setTick] = useState(0)
      useEffect(() => ctx.locale.subscribe(() => setTick(value => value + 1)), [ctx])
    }

    function Icon({ name, size = 15 }) {
      const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { flex: 'none', display: 'block' },
      }
      if (name === 'upload') {
        return h('svg', common,
          h('path', { d: 'M12 16V4' }),
          h('path', { d: 'm7 9 5-5 5 5' }),
          h('path', { d: 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3' }))
      }
      if (name === 'spark') {
        return h('svg', common,
          h('path', { d: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z' }),
          h('path', { d: 'm19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z' }))
      }
      if (name === 'copy') {
        return h('svg', common,
          h('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
          h('path', { d: 'M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3' }))
      }
      if (name === 'download') {
        return h('svg', common,
          h('path', { d: 'M12 4v11' }),
          h('path', { d: 'm7 10 5 5 5-5' }),
          h('path', { d: 'M4 20h16' }))
      }
      if (name === 'back') {
        return h('svg', common,
          h('path', { d: 'M19 12H5' }),
          h('path', { d: 'm11 18-6-6 6-6' }))
      }
      if (name === 'refresh') {
        return h('svg', common,
          h('path', { d: 'M20 11a8 8 0 1 0-2.34 5.66' }),
          h('path', { d: 'M20 4v7h-7' }))
      }
      if (name === 'check') {
        return h('svg', common, h('path', { d: 'm5 12 4.5 4.5L19 7' }))
      }
      return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8 }))
    }

    function PanelIcon({ size = 18, active = false }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', { d: 'M5 4.5h9.5L19 9v10.5H5z', fill: active ? 'color-mix(in srgb, currentColor 14%, transparent)' : 'none' }),
        h('path', { d: 'M14.5 4.5V9H19' }),
        h('path', { d: 'M8 13h6' }),
        h('path', { d: 'M8 16.5h3.5' }),
        h('path', { d: 'M8 9.5h2.5' })
      )
    }

    function splitParagraphs(passage) {
      return String(passage || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean)
    }

    function buildExerciseText(exercise, withAnswers) {
      const box = exercise.options.map(option => `${option.letter}. ${option.word}`).join('    ')
      const body = exercise.passage.replace(/\[\[(\d+)\]\]/g, (_, number) => `_____(${number})`)
      const header = `${exercise.title}\nIELTS ${exercise.band} · ${exercise.wordCount} words · 5 gaps / 7 options\n\nWord Box\n${box}\n\n${body}\n`
      if (!withAnswers) {
        return `${header}\nInstructions: Choose one word from the box for each gap and write its letter. Each option may be used once. Do not change the form of any word.\n`
      }
      const answers = exercise.answers.map(answer => `${answer.blank}. ${answer.letter}  ${answer.word}\n   ${answer.explanation || ''}`).join('\n')
      const distractors = exercise.distractors.map(item => `${item.letter}. ${item.word} — ${item.why || ''}`).join('\n')
      return `${header}\nAnswers\n${answers}\n\nDistractors\n${distractors}\n`
    }

    function StudioPage({ ctx, t }) {
      useLocaleTick(ctx)
      const savedRef = useRef(null)
      if (savedRef.current === null) {
        const loaded = loadSaved()
        savedRef.current = loaded && typeof loaded === 'object' ? loaded : {}
      }
      const saved = savedRef.current
      const pageRef = useRef(null)
      const fileInputRef = useRef(null)

      const [band, setBand] = useState(BANDS.includes(saved.band) ? saved.band : '5.5')
      const [wordsText, setWordsText] = useState(typeof saved.wordsText === 'string' ? saved.wordsText : '')
      const [topic, setTopic] = useState(typeof saved.topic === 'string' ? saved.topic : '')
      const [exercise, setExercise] = useState(saved.exercise && Array.isArray(saved.exercise.answers) ? saved.exercise : null)
      const [choices, setChoices] = useState(saved.choices && typeof saved.choices === 'object' ? saved.choices : {})
      const [submitted, setSubmitted] = useState(Boolean(saved.submitted && saved.exercise))
      const [showAnswers, setShowAnswers] = useState(Boolean(saved.showAnswers && saved.exercise))
      const [editing, setEditing] = useState(!saved.exercise)
      const [generating, setGenerating] = useState(false)
      const [error, setError] = useState('')
      const [errorDetail, setErrorDetail] = useState(null)
      const [notice, setNotice] = useState('')
      const [info, setInfo] = useState(null)
      const [ocrBusy, setOcrBusy] = useState(false)
      const [ocrLines, setOcrLines] = useState([])
      const [ocrCount, setOcrCount] = useState(0)
      const [dragOver, setDragOver] = useState(false)
      const [activeBlank, setActiveBlank] = useState(1)
      const [pdfBusy, setPdfBusy] = useState(null)
      const abortRef = useRef(null)

      const words = useMemo(() => parseWords(wordsText), [wordsText])
      const answerByBlank = useMemo(() => {
        const map = new Map()
        if (exercise) for (const answer of exercise.answers) map.set(answer.blank, answer)
        return map
      }, [exercise])
      const blanks = useMemo(() => (exercise ? exercise.answers.map(answer => answer.blank).sort((a, b) => a - b) : [1, 2, 3, 4, 5]), [exercise])
      const usedByLetter = useMemo(() => {
        const map = {}
        for (const [blank, letter] of Object.entries(choices)) {
          if (!letter) continue
          if (!map[letter]) map[letter] = []
          map[letter].push(Number(blank))
        }
        return map
      }, [choices])
      const correctCount = useMemo(() => {
        if (!exercise) return 0
        return exercise.answers.filter(answer => choices[answer.blank] === answer.letter).length
      }, [exercise, choices])
      const allAnswered = exercise ? exercise.answers.every(answer => Boolean(choices[answer.blank])) : false
      const answerLetters = useMemo(() => new Set(exercise ? exercise.answers.map(answer => answer.letter) : []), [exercise])
      const distractorLetters = useMemo(() => new Set(exercise ? exercise.distractors.map(item => item.letter) : []), [exercise])

      useEffect(() => {
        const payload = { band, wordsText, topic, exercise, choices, submitted, showAnswers }
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch { /* ignore quota */ }
      }, [band, wordsText, topic, exercise, choices, submitted, showAnswers])

      useEffect(() => {
        if (!notice) return undefined
        const timer = window.setTimeout(() => setNotice(''), 2400)
        return () => window.clearTimeout(timer)
      }, [notice])

      useEffect(() => {
        let alive = true
        fetch('/x-ielts-studio/info', { headers: { accept: 'application/json' } })
          .then(response => response.json())
          .then(data => { if (alive && data && data.ok) setInfo(data) })
          .catch(() => {})
        return () => { alive = false }
      }, [])

      useEffect(() => () => { if (abortRef.current) abortRef.current.abort() }, [])

      const scrollTop = () => {
        if (pageRef.current) pageRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }

      const setChoice = (blank, letter) => {
        setChoices(previous => {
          const next = { ...previous }
          if (!letter) {
            delete next[blank]
            return next
          }
          for (const [key, value] of Object.entries(next)) {
            if (value === letter && Number(key) !== blank) delete next[key]
          }
          next[blank] = letter
          return next
        })
        setActiveBlank(blank)
      }

      const nextBlank = (blank) => {
        const index = blanks.indexOf(blank)
        return blanks[(index + 1) % blanks.length]
      }

      const chooseForBlank = (blank, letter) => {
        setChoice(blank, letter)
        setActiveBlank(nextBlank(blank))
      }

      const chooseOption = (letter) => {
        if (submitted) return
        const target = !choices[activeBlank]
          ? activeBlank
          : (blanks.find(blank => !choices[blank]) || activeBlank)
        chooseForBlank(target, letter)
      }

      const resetAnswers = () => {
        setChoices({})
        setSubmitted(false)
        setShowAnswers(false)
        setActiveBlank(1)
      }

      const generate = async () => {
        if (words.length < 5) {
          setError(t('setup.tooFew'))
          setErrorDetail(null)
          return
        }
        if (words.length > 50) {
          setError(t('setup.tooMany'))
          setErrorDetail(null)
          return
        }
        setError('')
        setErrorDetail(null)
        setGenerating(true)
        const controller = new AbortController()
        abortRef.current = controller
        try {
          const response = await fetch('/x-ielts-studio/generate', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ band, words, topic }),
            signal: controller.signal,
          })
          let data = null
          try { data = await response.json() } catch { data = null }
          if (!response.ok || !data || !data.ok) {
            const failure = new Error(data?.error?.message || t('error.generate'))
            failure.detail = data?.error?.detail
            throw failure
          }
          setExercise(data.exercise)
          setChoices({})
          setSubmitted(false)
          setShowAnswers(false)
          setActiveBlank(1)
          setEditing(false)
          scrollTop()
        } catch (caught) {
          if (caught && caught.name === 'AbortError') {
            setError(t('error.cancelled'))
          } else if (caught && caught instanceof TypeError) {
            setError(t('error.network'))
            setErrorDetail(null)
          } else {
            setError((caught && caught.message) || t('error.generate'))
            setErrorDetail(caught ? caught.detail : null)
          }
        } finally {
          abortRef.current = null
          setGenerating(false)
        }
      }

      const cancel = () => {
        if (abortRef.current) abortRef.current.abort()
      }

      const handleImageFile = async (file) => {
        if (!file) return
        if (!String(file.type || '').startsWith('image/')) {
          setError(t('setup.imageBad'))
          setErrorDetail(null)
          return
        }
        if (file.size > 20 * 1024 * 1024) {
          setError(t('setup.imageLarge'))
          setErrorDetail(null)
          return
        }
        setOcrBusy(true)
        setError('')
        setErrorDetail(null)
        setOcrLines([])
        setOcrCount(0)
        try {
          const dataUrl = await readFileAsDataUrl(file)
          const response = await fetch('/x-ielts-studio/ocr', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ dataUrl }),
          })
          let data = null
          try { data = await response.json() } catch { data = null }
          if (!response.ok || !data || !data.ok) {
            const failure = new Error(data?.error?.message || t('setup.imageNone'))
            failure.detail = data?.error?.detail
            throw failure
          }
          const found = parseWords(filterOcrWords(data.words || []))
          setOcrLines(Array.isArray(data.lines) ? data.lines : [])
          setOcrCount(found.length)
          if (found.length === 0) {
            setError(t('setup.imageNone'))
            setErrorDetail(null)
            return
          }
          setWordsText(previous => mergeWords(parseWords(previous), found).join('\n'))
        } catch (caught) {
          setError((caught && caught.message) || t('setup.imageNone'))
          setErrorDetail(caught ? caught.detail : null)
        } finally {
          setOcrBusy(false)
        }
      }

      const onDrop = (event) => {
        event.preventDefault()
        setDragOver(false)
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
        if (file) handleImageFile(file)
      }

      const onPasteImage = (event) => {
        const items = event.clipboardData && event.clipboardData.items
        if (!items) return
        for (const item of items) {
          if (item.kind === 'file' && String(item.type || '').startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) handleImageFile(file)
            return
          }
        }
      }

      const copyText = async (text, successKey) => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
          } else {
            const area = document.createElement('textarea')
            area.value = text
            area.style.position = 'fixed'
            area.style.opacity = '0'
            document.body.appendChild(area)
            area.select()
            document.execCommand('copy')
            area.remove()
          }
          setNotice(t(successKey))
        } catch {
          setError(t('ex.copyFailed'))
        }
      }

      const downloadPdf = async (includeAnswers) => {
        if (!exercise || pdfBusy) return
        setPdfBusy(includeAnswers ? 'answers' : 'exercise')
        setError('')
        setErrorDetail(null)
        try {
          const response = await fetch('/x-ielts-studio/pdf', {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/pdf' },
            body: JSON.stringify({ exercise, includeAnswers }),
          })
          const contentType = String(response.headers.get('content-type') || '')
          if (!response.ok || !contentType.includes('application/pdf')) {
            let data = null
            try { data = await response.json() } catch { data = null }
            const failure = new Error(data?.error?.message || t('ex.pdfFail'))
            failure.detail = data?.error?.detail
            throw failure
          }
          const blob = await response.blob()
          if (!blob.size) throw new Error(t('ex.pdfFail'))
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `ielts-five-gaps-${exercise.band}-${includeAnswers ? 'answers' : 'exercise'}.pdf`
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          setNotice(t('ex.pdfDone'))
        } catch (caught) {
          setError((caught && caught.message) || t('ex.pdfFail'))
          setErrorDetail(caught ? caught.detail : null)
        } finally {
          setPdfBusy(null)
        }
      }

      const errorBox = error
        ? h('div', { className: 'ieltsx-error', role: 'alert' },
            h('div', null, error),
            errorDetail
              ? h('details', null,
                  h('summary', null, t('error.details')),
                  h('pre', null, typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail, null, 2)))
              : null)
        : null

      const header = h('header', { className: 'ieltsx-hero' },
        h('div', null,
          h('div', { className: 'ieltsx-eyebrow' }, t('hero.eyebrow')),
          h('h1', { className: 'ieltsx-title' }, t('hero.title')),
          h('p', { className: 'ieltsx-subtitle' }, t('hero.subtitle'))),
        h('div', { className: 'ieltsx-hero-side' },
          h('div', { className: 'ieltsx-model', title: info ? `${info.provider}/${info.model}` : t('hero.ready') },
            h('span', { className: `ieltsx-dot${info ? '' : ' idle'}` }),
            info ? `${info.model}` : t('hero.ready')),
          h('a', { className: 'ieltsx-standalone', href: '/ielts-studio', target: '_blank', rel: 'noreferrer' },
            t('hero.standalone'), ' ↗')))

      const footer = h('div', { className: 'ieltsx-note' }, t('ex.aiNote'))

      if (generating) {
        return h('div', { className: 'ieltsx-page', ref: pageRef },
          h('style', null, CSS),
          h('div', { className: 'ieltsx-shell' },
            header,
            h('section', { className: 'ieltsx-card ieltsx-loading' },
              h('div', { className: 'ieltsx-spinner large' }),
              h('h2', null, t('loading.title')),
              h('p', null, `${band} · 5 gaps · 7 options · ~500 words`),
              h('p', null, t('loading.hint')),
              h('button', { type: 'button', className: 'ieltsx-secondary', onClick: cancel }, t('loading.cancel'))),
            footer))
      }

      if (!exercise || editing) {
        const setup = h('div', null,
          exercise
            ? h('div', { style: { marginTop: '18px' } },
                h('button', { type: 'button', className: 'ieltsx-ghost', onClick: () => setEditing(false) },
                  h(Icon, { name: 'back', size: 14 }), t('setup.backToExercise')))
            : null,
          h('section', { className: 'ieltsx-card' },
            h('div', { className: 'ieltsx-card-head' },
              h('span', { className: 'ieltsx-step' }, '01'),
              h('h2', null, t('setup.band')),
              h('span', { className: 'ieltsx-hint' }, t('setup.bandHint'))),
            h('div', { className: 'ieltsx-segmented', role: 'group', 'aria-label': t('setup.band') },
              BANDS.map(value => h('button', {
                key: value,
                type: 'button',
                'aria-pressed': value === band,
                onClick: () => setBand(value),
              }, value)))),
          h('section', { className: 'ieltsx-card' },
            h('div', { className: 'ieltsx-card-head' },
              h('span', { className: 'ieltsx-step' }, '02'),
              h('h2', null, t('setup.words')),
              h('span', { className: 'ieltsx-hint' }, t('setup.wordsHint'))),
            h('div', { className: 'ieltsx-grid' },
              h('div', { className: 'ieltsx-field' },
                h('textarea', {
                  className: 'ieltsx-textarea',
                  value: wordsText,
                  placeholder: t('setup.wordsPlaceholder'),
                  onChange: event => setWordsText(event.target.value),
                  spellCheck: false,
                  'aria-label': t('setup.words'),
                }),
                h('div', { className: 'ieltsx-field-foot' },
                  h('span', { className: 'ieltsx-count' }, t('setup.wordsCount', { n: words.length })),
                  h('button', { type: 'button', className: 'ieltsx-link', onClick: () => setWordsText(SAMPLE_WORDS) }, t('setup.sample')))),
              h('div', { className: 'ieltsx-field' },
                h('div', {
                  className: `ieltsx-drop${dragOver ? ' over' : ''}`,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => { if (!ocrBusy) fileInputRef.current && fileInputRef.current.click() },
                  onKeyDown: event => {
                    if ((event.key === 'Enter' || event.key === ' ') && !ocrBusy) {
                      event.preventDefault()
                      fileInputRef.current && fileInputRef.current.click()
                    }
                  },
                  onDragOver: event => { event.preventDefault(); setDragOver(true) },
                  onDragLeave: () => setDragOver(false),
                  onDrop,
                  onPaste: onPasteImage,
                },
                  h('input', {
                    ref: fileInputRef,
                    type: 'file',
                    accept: 'image/*',
                    style: { display: 'none' },
                    onClick: event => event.stopPropagation(),
                    onChange: event => {
                      const file = event.target.files && event.target.files[0]
                      event.target.value = ''
                      if (file) handleImageFile(file)
                    },
                  }),
                  ocrBusy
                    ? h(React.Fragment, null,
                        h('div', { className: 'ieltsx-spinner' }),
                        h('div', { className: 'ieltsx-drop-title' }, t('setup.imageBusy')),
                        h('div', { className: 'ieltsx-drop-hint' }, t('setup.imageFirst')))
                    : h(React.Fragment, null,
                        h(Icon, { name: 'upload', size: 22 }),
                        h('div', { className: 'ieltsx-drop-title' }, t('setup.image')),
                        h('div', { className: 'ieltsx-drop-hint' }, t('setup.imageHint')),
                        ocrCount > 0 ? h('div', { className: 'ieltsx-ocr' }, t('setup.imageFound', { n: ocrCount })) : null)),
                ocrLines.length > 0
                  ? h('details', { style: { marginTop: '8px' } },
                      h('summary', { className: 'ieltsx-hint', style: { cursor: 'pointer' } }, t('setup.imagePreview')),
                      h('pre', { className: 'ieltsx-pre' }, ocrLines.join('\n')))
                  : null))),
          h('section', { className: 'ieltsx-card' },
            h('div', { className: 'ieltsx-card-head' },
              h('span', { className: 'ieltsx-step' }, '03'),
              h('h2', null, t('setup.topic'))),
            h('input', {
              className: 'ieltsx-topic',
              value: topic,
              placeholder: t('setup.topicPlaceholder'),
              onChange: event => setTopic(event.target.value),
              maxLength: 120,
            })),
          errorBox,
          h('div', { className: 'ieltsx-actions' },
            h('div', { className: 'ieltsx-summary' }, t('setup.summary', { words: words.length })),
            h('button', {
              type: 'button',
              className: 'ieltsx-primary',
              onClick: generate,
              disabled: words.length < 5 || words.length > 50,
            },
              h(Icon, { name: 'spark', size: 15 }),
              t(exercise ? 'setup.generateAgain' : 'setup.generate'))))

        return h('div', { className: 'ieltsx-page', ref: pageRef },
          h('style', null, CSS),
          h('div', { className: 'ieltsx-shell' }, header, setup, footer))
      }

      const paragraphNodes = splitParagraphs(exercise.passage).map((paragraph, paragraphIndex) => {
        const pieces = paragraph.split(/(\[\[\d+\]\])/g).filter(Boolean)
        return h('p', { key: `p-${paragraphIndex}` }, pieces.map((piece, pieceIndex) => {
          const marker = /^\[\[(\d+)\]\]$/.exec(piece)
          if (!marker) return h(React.Fragment, { key: `t-${paragraphIndex}-${pieceIndex}` }, piece)
          const blank = Number(marker[1])
          const chosen = choices[blank] || ''
          const answer = answerByBlank.get(blank)
          const correct = submitted && answer && chosen === answer.letter
          const wrong = submitted && answer && chosen !== answer.letter
          return h('span', {
            key: `b-${blank}`,
            className: `ieltsx-blankwrap${correct ? ' correct' : ''}${wrong ? ' wrong' : ''}`,
          },
            h('select', {
              className: 'ieltsx-blank',
              value: chosen,
              disabled: submitted,
              'aria-label': t('ex.blank', { n: blank }),
              onChange: event => {
                const letter = event.target.value
                if (letter) chooseForBlank(blank, letter)
                else setChoice(blank, '')
              },
            },
              h('option', { value: '' }, '___'),
              LETTERS.map(letter => h('option', { key: letter, value: letter }, letter))),
            submitted && answer
              ? h('span', { className: `ieltsx-mark${correct ? '' : ' wrong'}` }, correct ? '✓' : `✗ ${answer.letter}`)
              : null)
        }))
      })

      const optionNodes = exercise.options.map(option => {
        const used = usedByLetter[option.letter] || []
        const isAnswer = submitted && answerLetters.has(option.letter)
        const isDistractor = submitted && distractorLetters.has(option.letter)
        return h('button', {
          key: option.letter,
          type: 'button',
          className: `ieltsx-option${used.length ? ' used' : ''}${isAnswer ? ' answer' : ''}${isDistractor ? ' distractor' : ''}`,
          onClick: () => chooseOption(option.letter),
          disabled: submitted,
          'aria-pressed': used.length > 0,
        },
          h('span', { className: 'ieltsx-letter' }, option.letter),
          h('span', { className: 'ieltsx-word' }, option.word),
          used.length ? h('span', { className: 'ieltsx-usedtag' }, `${t('ex.used')} ${used.join(', ')}`) : null)
      })

      const resultText = correctCount === exercise.answers.length
        ? t('ex.scorePerfect')
        : correctCount >= 3 ? t('ex.scoreGood') : t('ex.scoreLow')

      const resultBanner = submitted
        ? h('div', { className: 'ieltsx-result' },
            h('div', { className: 'ieltsx-score' }, `${correctCount}/${exercise.answers.length}`),
            h('p', null, `${t('ex.score', { correct: correctCount, total: exercise.answers.length })} · ${resultText}`),
            h('button', {
              type: 'button',
              className: 'ieltsx-secondary',
              onClick: () => setShowAnswers(value => !value),
            }, showAnswers ? t('ex.hideAnswers') : t('ex.showAnswers')))
        : null

      const answerPanel = showAnswers
        ? h('div', null,
            h('section', { className: 'ieltsx-section' },
              h('div', { className: 'ieltsx-section-head' }, h('h2', null, t('ex.answerKey'))),
              h('div', null, exercise.answers.map(answer => h('div', { key: answer.blank, className: 'ieltsx-answer' },
                h('div', { className: 'ieltsx-answer-head' },
                  h('span', { className: 'ieltsx-letter' }, answer.letter),
                  h('span', { className: 'ieltsx-answer-word' }, `${answer.blank}. ${answer.word}`),
                  submitted
                    ? h('span', { className: 'ieltsx-hint' }, choices[answer.blank] === answer.letter ? `✓ ${t('ex.correct')}` : t('ex.wrong', { letter: answer.letter }))
                    : null),
                h('p', null, answer.explanation || t('ex.noExplanation')))))),
            h('section', { className: 'ieltsx-section' },
              h('div', { className: 'ieltsx-section-head' }, h('h2', null, t('ex.distractors'))),
              h('div', null, exercise.distractors.map(item => h('div', { key: item.letter, className: 'ieltsx-distractor' },
                h('span', { className: 'ieltsx-letter' }, item.letter),
                h('div', null,
                  h('strong', null, item.word),
                  h('span', null, ` — ${item.why || ''}`)))))),
            exercise.vocabulary && exercise.vocabulary.length
              ? h('section', { className: 'ieltsx-section' },
                  h('div', { className: 'ieltsx-section-head' }, h('h2', null, t('ex.vocabulary'))),
                  h('div', { className: 'ieltsx-vocab' }, exercise.vocabulary.map((item, index) => h('div', { key: `${item.word}-${index}`, className: 'ieltsx-vocabitem' },
                    h('strong', null, item.word),
                    item.form ? h('em', null, item.form) : null,
                    item.meaning ? h('span', null, item.meaning) : null))))
              : null)
        : null

      const exerciseView = h('div', null,
        h('div', { className: 'ieltsx-toolbar' },
          h('button', { type: 'button', className: 'ieltsx-ghost', onClick: () => setEditing(true) },
            h(Icon, { name: 'back', size: 14 }), t('ex.back')),
          h('button', { type: 'button', className: 'ieltsx-secondary', onClick: generate },
            h(Icon, { name: 'refresh', size: 14 }), t('ex.regenerate')),
          h('button', { type: 'button', className: 'ieltsx-secondary', onClick: () => copyText(buildExerciseText(exercise, false), 'ex.copied') },
            h(Icon, { name: 'copy', size: 14 }), t('ex.copy')),
          h('button', { type: 'button', className: 'ieltsx-secondary', onClick: () => copyText(buildExerciseText(exercise, true), 'ex.copied') },
            h(Icon, { name: 'copy', size: 14 }), t('ex.copyAnswers')),
          h('button', {
            type: 'button',
            className: 'ieltsx-secondary',
            disabled: Boolean(pdfBusy),
            onClick: () => downloadPdf(false),
          },
            pdfBusy === 'exercise'
              ? h('span', { className: 'ieltsx-spinner small' })
              : h(Icon, { name: 'download', size: 14 }),
            pdfBusy === 'exercise' ? t('ex.pdfBusyExercise') : t('ex.pdfExercise')),
          h('button', {
            type: 'button',
            className: 'ieltsx-secondary',
            disabled: Boolean(pdfBusy),
            onClick: () => downloadPdf(true),
          },
            pdfBusy === 'answers'
              ? h('span', { className: 'ieltsx-spinner small' })
              : h(Icon, { name: 'download', size: 14 }),
            pdfBusy === 'answers' ? t('ex.pdfBusyAnswers') : t('ex.pdfAnswers')),
          h('span', { className: 'grow' }),
          notice ? h('span', { className: 'ieltsx-notice' }, notice) : null),
        h('h2', { style: { fontSize: '24px', lineHeight: 1.3, letterSpacing: '-.02em', margin: '0 0 8px', fontWeight: 680 } }, exercise.title),
        h('div', { className: 'ieltsx-meta' },
          h('span', { className: 'ieltsx-chip' }, `IELTS ${exercise.band}`),
          h('span', { className: 'ieltsx-chip' }, t('ex.words', { n: exercise.wordCount })),
          h('span', { className: 'ieltsx-chip' }, t('ex.gaps', { n: 5 })),
          h('span', { className: 'ieltsx-chip' }, t('ex.options', { n: 7 }))),
        errorBox,
        h('section', { className: 'ieltsx-section' },
          h('div', { className: 'ieltsx-instructions' },
            h('strong', { style: { color: 'var(--dsw-alias-label-primary)' } }, `${t('ex.instructionsTitle')} · `),
            t('ex.instructions'))),
        h('section', { className: 'ieltsx-section' },
          h('div', { className: 'ieltsx-section-head' },
            h('h2', null, t('ex.wordbox')),
            h('span', null, t('ex.wordboxHint'))),
          h('div', { className: 'ieltsx-wordbox' }, optionNodes)),
        h('section', { className: 'ieltsx-section' },
          h('div', { className: 'ieltsx-section-head' }, h('h2', null, t('ex.passage'))),
          h('div', { className: 'ieltsx-passage' }, paragraphNodes)),
        h('div', { className: 'ieltsx-submitrow' },
          !submitted
            ? h('button', {
                type: 'button',
                className: 'ieltsx-primary',
                onClick: () => { setSubmitted(true); setShowAnswers(true) },
                disabled: !allAnswered,
              }, h(Icon, { name: 'check', size: 15 }), t('ex.submit'))
            : h('button', { type: 'button', className: 'ieltsx-secondary', onClick: resetAnswers },
                h(Icon, { name: 'refresh', size: 14 }), t('ex.redo')),
          !submitted && !allAnswered ? h('span', { className: 'ieltsx-hint' }, t('ex.submitHint')) : null),
        resultBanner,
        answerPanel,
        footer)

      return h('div', { className: 'ieltsx-page', ref: pageRef },
        h('style', null, CSS),
        h('div', { className: 'ieltsx-shell' }, header, exerciseView))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ielts-studio: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'ielts-studio',
          order: 20,
          label: () => t('panel.label'),
        }, PanelIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'ielts-studio',
        }, props => h(StudioPage, { ...props, ctx, t })))
      },
    }
  },
})
