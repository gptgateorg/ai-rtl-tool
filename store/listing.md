# Chrome Web Store listing draft

Status: local draft; not uploaded or submitted.
Product: GptGate, version 0.1.1
Primary listing language: Persian
Suggested category: Productivity / Tools (choose the equivalent available category).
Distribution: free, public; confirm dashboard countries and publishing timing before submission.

## Persian short description

فارسی روان‌تر در ChatGPT، Gemini و Claude؛ تنظیم جهت و فونت، و خروجی PDF و Word از ChatGPT.

## Persian detailed description

GptGate خواندن و نوشتن فارسی در ChatGPT، Gemini و Claude را ساده‌تر می‌کند.

• جهت پاسخ‌ها و کادر نوشتن را جداگانه انتخاب کنید: راست‌به‌چپ، چپ‌به‌راست یا خودکار.
• فونت و وزن دلخواهتان را انتخاب کنید، یا فایل فونت خودتان را از دستگاه وارد کنید.
• متن‌های ترکیبی فارسی و انگلیسی، کد و فرمول را خواناتر ببینید.
• در ChatGPT، عنوان گفتگوهای سایدبار و متن یادآورهای صفحهٔ اول را مرتب‌تر بخوانید.
• از کل گفتگوی در دسترس یا یک پاسخ در ChatGPT، خروجی PDF یا Word بگیرید.

بدون ساخت حساب GptGate و بدون سرور خروجی. آماده‌سازی فایل روی دستگاه شما انجام می‌شود. تنظیمات ممکن است با Chrome Sync همگام شوند؛ فایل فونت آپلودی روی همان دستگاه می‌ماند.

خروجی PDF از پنجرهٔ چاپ مرورگر ذخیره می‌شود. خروجی Word یک فایل قابل ویرایش .docx است؛ فونت‌ها داخل آن جاسازی نمی‌شوند و صفحه‌بندی آن می‌تواند با PDF فرق داشته باشد. خروجی گفتگو به پیام‌هایی محدود است که صفحه در دسترس قرار می‌دهد.

راهنمای کوتاه اولین استفاده، تنظیمات اصلی را معرفی می‌کند و هر وقت بخواهید دوباره در دسترس است.

GptGate یک ابزار مستقل است و محصول رسمی OpenAI، Google یا Anthropic نیست.
پشتیبانی: info@gptgate.ai

## Reviewer single-purpose explanation

Improve reading, writing and local reuse of Persian and mixed-direction AI
conversations on ChatGPT, Gemini and Claude. Direction/font controls improve
readability; ChatGPT PDF/DOCX export lets users retain that content locally.

## Permission justifications

- storage: Save direction/font/math preferences with Chrome Sync; retain uploaded
  font bytes and first-use guide completion locally; temporarily retain at most
  two export previews in session storage. No developer server receives this data.
- scripting: Apply the user's styles and initialize supported-site content
  scripts in already-open supported tabs when needed, including installation.
- Host access: Restricted to chatgpt.com, chat.openai.com, gemini.google.com and
  claude.ai. Read and format visible text/composers on these sites. ChatGPT content
  is read locally for export only when requested.
- Remote code: No. Executable code and the DOCX converter ship in the package.
  Font upload accepts font data only and does not load executable JavaScript.

## Data disclosure draft

The extension accesses website content and AI conversation messages locally.
Do not claim that it never accesses user data. It has no developer-operated
analytics, advertising, conversation upload, account or export service.
Chrome Sync may transmit preferences through the user's Chrome sync service.
Exports remain under the user's control; the optional support/community links
open external services only when chosen.

Review the dashboard's exact checkbox definitions before saving declarations.
Website content and personal communications are the relevant locally handled
categories. Do not certify unrelated identity, payment, health, location or
authentication collection. Do not make commercial/legal attestations for the
account holder without their confirmation.

## Reviewer test instructions

1. Install the extension and open ChatGPT, Gemini or Claude. No GptGate login is
   required. Host websites may require their own ordinary account.
2. Open the toolbar popup. Change response/composer direction independently and
   choose a font. A 400/500 interface weight remains independent of conversation
   font weight. Optional uploaded fonts stay local.
3. Open a ChatGPT conversation containing Persian, English, code and a formula.
   Use the header export menu to choose the conversation or select one response.
4. In the local preview choose Save as PDF (native print dialog) or Download Word.
   Word fonts are not embedded. Images unavailable to the page may be placeholders.
5. Replay the popup/export help. Settings require no subscription.

## Required before submission

- Add the supplied project's IRANSans license code and FontLicense.txt.
- Publish the reviewed extension-specific privacy policy and enter its real URL.
- Include bundled dependency notices in the upload ZIP.
- Confirm developer account identity, store listing, screenshots, distribution,
  data-use attestations and submit/publish timing with the account holder.

## Official reference pages

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/extensions/reference/api/tabs#permissions
