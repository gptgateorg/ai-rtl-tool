# GptGate store discovery and launch plan

Status: proposed experiments, not published campaigns or measured results.
Scope: the Chrome extension, not GptGate paid accounts or access services.
No search-volume, keyword-difficulty, conversion or ranking data was available.
The priorities below reflect product fit and effort, not measured demand.

## Positioning

For Persian speakers using AI chat tools, GptGate offers control over text
reading direction and fonts, plus local reuse of ChatGPT conversations as PDF
or editable Word. Lead with a recognizable problem and demonstrate the result.
Do not describe this as translating the service, providing a free AI account,
unlocking paid models, editing existing PDFs, or exporting from Gemini/Claude.

Store discovery and Google Search are distinct. Store metadata should describe
real capabilities; a separate public product page and practical guides can
answer Google queries. Neither path guarantees a ranking or a timetable.

## Query map

These are editorial targets, not a keyword-density checklist. Use natural
variants inside useful explanations; do not append a keyword list to the store.

| User query | Intent | Proposed destination | Priority |
|---|---|---|---|
| راست‌چین ChatGPT | Fix a reading problem | Store opening; direction guide | First |
| فونت فارسی ChatGPT | Improve readability | Store font section; font guide | First |
| تغییر فونت چت جی پی تی | How to | Font guide with real steps | First |
| افزونه فارسی ChatGPT | Find/install a tool | Dedicated extension page | First |
| خروجی Word از ChatGPT | Retain editable work | Export guide; store screenshot 3 | First |
| ذخیره گفتگو ChatGPT به PDF | Save a conversation | Export guide | First |
| ذخیره یک پاسخ ChatGPT | Save selected content | Export guide subsection | First |
| فارسی و انگلیسی در ChatGPT | Mixed-direction problem | Direction guide example | First |
| راست‌چین Gemini | Fix direction | Same direction guide, Gemini section | Next |
| فونت فارسی Claude | Choose a font | Same font guide, Claude section | Next |
| وزیرمتن در ChatGPT | Specific font choice | Font guide example | Next |
| ایران سنس ChatGPT | Specific font choice | Font guide example | Next |
| افزودن فونت به ChatGPT | Import a font | Font guide file/size instructions | Next |
| فرمول ریاضی فارسی ChatGPT | Math readability | Direction guide, limitations | Next |
| Persian RTL ChatGPT extension | Find a tool in English | English store listing | Next |
| ChatGPT Persian font | Improve readability | English store listing | Next |

## Prepared in this change

- Descriptive Persian/English manifest metadata, within store length limits.
- Persian and English listing copy; English copy explicitly identifies the
  Persian interface. Feature boundaries and local export limitations remain.
- Three 1280x800 screenshots, each focused on one outcome; 440x280 promo tile.
  UI is captured from the current code at double density before composition.
  Export content is a public educational sample, not a private user conversation.
- No analytics SDK, runtime dependency, remote font or content-script change.

## First month: suggested order

| When | Action | Effort estimate | Success signal | Dependency |
|---|---|---|---|---|
| Before release | Save current store metrics and listing as a baseline | 30 min | Comparable baseline, not assumed zeros | Owner dashboard |
| Release | Update the existing item, not a duplicate; review descriptions, screenshots, privacy and locale tabs | 1–2 h plus review wait | Approved listing, working install | Public privacy URL and final owner approval |
| Week 1 | Record a 20–30 second demo: mixed Persian/English text, choose font/direction, export one answer | 2–4 h | People can name the benefit after watching | Released build, public sample |
| Week 1 | Share two benefit-led posts in existing brand channels; ask suitable Persian AI educators to try it | 1–2 h | Relevant visits and voluntary installs | Owner approval to contact/publish |
| Week 2 | Publish one dedicated extension page and one complete direction/font guide | 1–2 days | Indexed useful pages; relevant search impressions | Separate site approval and deployment |
| Week 2 | Publish a PDF/Word guide showing selection, preview and file limitations | Half a day | Search visits and store clicks | Real screenshots; no keyword filler |
| Week 3 | Compare channels; test one change to the first image OR short description | 1–2 h | Better install yield without worse removals | Enough observations; comparable periods |
| Week 4 | Review installs, removals, support issues and search queries; prioritize the biggest user problem | 1–2 h | Evidence-based next iteration | Dashboard and optional Search Console access |

This is an experiment plan. Do not infer causality from a small before/after
sample or promise a percentage improvement. Extend the measurement window if
traffic is too low; record seasonality and channel changes.

## Product page brief (not implemented or deployed)

Suggested path: `/chrome-extension` on the approved public site.

Title: `افزونه فارسی ChatGPT؛ فونت، راست‌چین و خروجی Word | GptGate`

Description: `با GptGate جهت و فونت متن را در ChatGPT، Gemini و Claude تنظیم کنید و از گفتگوی ChatGPT خروجی PDF یا Word بگیرید. بدون حساب جداگانه.`

H1: `فارسی را در گفتگو با هوش مصنوعی راحت‌تر بخوانید`

Show a real before/after example, three benefits, one direct install link, a
short demo and these useful questions. Text must remain readable HTML, not
only words inside images. Add descriptive image alt text, the actual canonical
URL, internal links from the product area and inclusion in the site's sitemap.
Inspect indexing with the owner's Search Console before claiming Google visibility.
Do not imply FAQ markup guarantees a rich result.

FAQ copy candidates:

- `آیا برای GptGate حساب لازم دارم؟` → `نه. خود افزونه حساب جداگانه نمی‌خواهد؛ حساب ChatGPT، Gemini یا Claude مستقل است.`
- `خروجی Word و PDF در کدام سایت کار می‌کند؟` → `در ChatGPT. تنظیم فونت و جهت متن در Gemini و Claude هم در دسترس است.`
- `همهٔ پیام‌های گفتگو ذخیره می‌شوند؟` → `خروجی به پیام‌هایی محدود است که صفحه در دسترس قرار می‌دهد. پیش‌نمایش را قبل از ذخیره بررسی کنید.`
- `می‌توانم فونت خودم را اضافه کنم؟` → `بله؛ WOFF2، WOFF، TTF و OTF تا ۲ مگابایت پشتیبانی می‌شوند. فایل روی همان دستگاه می‌ماند.`
- `گفتگو برای خروجی به سرور شما می‌رود؟` → `نه. آماده‌سازی فایل محلی است؛ تنظیمات ممکن است با Chrome Sync همگام شوند.`

## Suggested launch copy (draft; not sent)

`فارسی و انگلیسی توی گفتگوهات قاطی می‌شن؟ با GptGate می‌تونی جهت متن و فونتش رو در ChatGPT، Gemini و Claude تنظیم کنی. از گفتگوی ChatGPT هم PDF یا Word بگیر؛ کل گفتگوی در دسترس یا فقط یک پاسخ. خود افزونه حساب جدا نمی‌خواد. این ویدیو نشون می‌ده چطور کار می‌کنه.`

Append the verified published store link after release. Publish no fake reviews,
incentivized installs, “five stars” requests, or rating-gated features. Invite
honest optional feedback after successful use and respond to support reports.

## Measurement without extension telemetry

Start with the existing store dashboard. Track listing impressions, installs
and uninstalls separately; dashboard users are not proof of active use. For
channel-level attribution, the owner can opt into the store's GA4 integration
and UTM support. This does not require adding a tracker to the extension.
Do not claim UTM attribution is available before that integration is verified.

Recommended UTM taxonomy after approval:

- Brand Telegram: source `telegram`, medium `social`, campaign `extension_launch`.
- Product site: source `gptgate_site`, medium `referral`, same campaign.
- Educator demo: source `<approved_creator_slug>`, medium `referral`, same campaign.

Use the same installed item URL, not duplicate listings. Never put names,
email addresses, chat content or private identifiers in tracking parameters.
Where both counts are available for the same period and segment, report
install events / listing views as a directional conversion indicator, with
raw counts. Do not call that retention or a per-person cohort conversion.

## Official sources

- [Listing quality and discoverability](https://developer.chrome.com/docs/webstore/best-listing): clear metadata and real images; ratings and install/uninstall trends also matter.
- [Store discovery](https://developer.chrome.com/docs/webstore/discovery): ranking and featuring are not guaranteed by keywords.
- [Listing localization](https://developer.chrome.com/docs/webstore/cws-dashboard-listing): locale-specific metadata and dashboard language selection.
- [Store metrics](https://developer.chrome.com/docs/webstore/metrics): verify available dashboard definitions before reporting results.
- [Store GA4 and UTM](https://developer.chrome.com/docs/webstore/google-analytics): optional attribution through the listing rather than extension telemetry.
- [Spam FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq): no artificial or incentivized installs/ratings.
- [Google Search SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): useful accessible content and descriptive titles/links.
