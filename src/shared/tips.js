const STYLE = `
.gptgate-tip{position:relative;box-sizing:border-box;padding:12px;margin:12px 0;background:var(--surface,var(--bg,#fff));color:var(--text,var(--ink,#173D32));border:1px solid var(--border,var(--line,#DCE4E0));border-radius:12px;font-family:inherit;font-size:13px;font-weight:400;line-height:20px;direction:rtl;animation:tip-enter 150ms cubic-bezier(.32,.72,0,1)}
.gptgate-tip::before{content:"";position:absolute;top:-5px;right:var(--tip-arrow,28px);width:8px;height:8px;transform:rotate(-45deg);background:inherit;border-top:1px solid var(--border,var(--line,#DCE4E0));border-right:1px solid var(--border,var(--line,#DCE4E0))}
.gptgate-tip h2{margin:0 0 4px;font-family:inherit;font-size:13px;font-weight:500;line-height:20px;color:inherit}.gptgate-tip p{margin:0;font-size:12px;line-height:20px;color:var(--text-muted,var(--muted,#52665E))}
.gptgate-tip .tip-actions{display:flex;align-items:center;gap:8px;margin-top:8px}.gptgate-tip .tip-progress{font-size:12px;margin-inline-end:auto;color:var(--text-muted,var(--muted,#52665E))}
.gptgate-tip button{font:inherit;font-size:12px;min-height:44px;min-width:44px;padding:8px;border:0;border-radius:8px;cursor:pointer;color:inherit;background:transparent}.gptgate-tip button[data-tip-next]{background:var(--accent-soft,var(--hover,#EDF2F0))}.gptgate-tip button:focus-visible{outline:2px solid var(--accent,#145247);outline-offset:2px}
@keyframes tip-enter{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
html[data-motion=instant] .gptgate-tip,:host([data-keyboard]) .gptgate-tip{animation:none}
@media(prefers-reduced-motion:reduce){.gptgate-tip{animation:none}}
@media(forced-colors:active){.gptgate-tip,.gptgate-tip button{border:1px solid CanvasText}}
`;
export function createTip({title,text,step=1,total=1,onNext,onClose}) {
  const tip = document.createElement('section'); tip.className = 'gptgate-tip'; tip.setAttribute('aria-label','راهنمای افزونه');
  const style = document.createElement('style'); style.textContent = STYLE;
  const heading = document.createElement('h2'); heading.textContent = title;
  const copy = document.createElement('p'); copy.textContent = text;
  const actions = document.createElement('div'); actions.className = 'tip-actions';
  const progress = document.createElement('span'); progress.className = 'tip-progress'; progress.textContent = total>1?`${step.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`:'';
  const skip = document.createElement('button'); skip.type = 'button'; skip.textContent = 'رد کردن'; skip.addEventListener('click',onClose);
  const next = document.createElement('button'); next.type = 'button'; next.dataset.tipNext = ''; next.textContent = step===total?'تمام':'بعدی'; next.addEventListener('click',onNext);
  actions.append(progress,skip,next); tip.append(style,heading,copy,actions); return tip;
}

export async function claimTip(surface) {
  try { return (await chrome.runtime.sendMessage({type:'gptgate:claim-tip',surface}))?.show === true; }
  catch { return false; } // A guide must never block normal use when storage/worker is unavailable.
}
