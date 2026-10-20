import { createTip, claimTip } from './src/shared/tips.js';
export function setupTips() {
  const replay = document.getElementById('helpBtn');
  let card, stopped = false;
  const steps = [
    {target:()=>document.querySelector('.direction-panel'),title:'جهت متن، جدا برای هر بخش',text:()=> 'جهت پاسخ‌ها و کادر نوشتن را جدا تنظیم کنید؛ «خودکار» فارسی و انگلیسی را تشخیص می‌دهد.'},
    {target:()=>document.getElementById('fontSettings'),title:'فونت دلخواه شما',text:()=> 'فونت و وزن دلخواهتان را انتخاب کنید؛ از همین بخش می‌توانید فونت خودتان را هم اضافه کنید.'},
    {target:()=>document.getElementById('mathSwitch').closest('.control-row'),title:'فرمول‌های مرتب',text:()=>document.getElementById('mathSwitch').disabled?'در حالت راست‌چین، اصلاح فرمول‌های ریاضی همیشه روشن است.':'این گزینه ترتیب عددها و علامت‌های فرمول را اصلاح می‌کند.'},
  ];
  function close(focus=false) {
    card?.remove(); card=null; stopped=true;
    document.removeEventListener('keydown',onKey);
    if (focus) replay.focus({preventScroll:true});
  }
  function onKey(e) { if(e.key==='Escape'){e.preventDefault();close(true);} }
  function show(index=0,manual=false) {
    card?.remove();
    const step=steps[index];
    card=createTip({title:step.title,text:step.text(),step:index+1,total:steps.length,
      onClose:()=>close(true),onNext:()=>index===steps.length-1?close(true):show(index+1,true)});
    step.target().insertAdjacentElement('afterend',card);
    document.addEventListener('keydown',onKey);
    if(manual){card.scrollIntoView({block:'nearest',behavior:'instant'});card.querySelector('[data-tip-next]').focus({preventScroll:true});}
  }
  replay.addEventListener('click',()=>{stopped=true;show(0,true);});
  void claimTip('popup').then(showOnce=>{if(showOnce&&!stopped)show();});
}
