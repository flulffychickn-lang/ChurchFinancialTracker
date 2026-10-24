const KEY="churchFinancePrototypeV1";
let data = JSON.parse(localStorage.getItem(KEY) || "null") || {
  accounts:[],
  bankRecords:[],
  cashBalance:0,
  cashRecords:[],
  activities:[],
  members:[
    
  ],
  savingsRecords:[],
  auditLog:[]
};
// Normalize older saved records so rendering never fails on missing collections.
data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
data.bankRecords = Array.isArray(data.bankRecords) ? data.bankRecords : [];
data.members = Array.isArray(data.members) ? data.members : [];
data.savingsRecords = Array.isArray(data.savingsRecords) ? data.savingsRecords : [];
data.auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];
data.cashRecords = Array.isArray(data.cashRecords) ? data.cashRecords : [];
data.activities = Array.isArray(data.activities) ? data.activities : [];
data.cashBalance = Number(data.cashBalance) || 0;
data.accounts = data.accounts.map((a,i)=>({id:a.id ?? (Date.now()+i),name:String(a.name||a.accountName||"Unnamed account"),balance:Number(a.balance)||0}));
data.bankRecords = data.bankRecords.map(r=>({...r,account:String(r.account||r.accountName||""),date:String(r.date||today()),amount:Number(r.amount)||0,note:String(r.note||"")}));
function persist(){
  try { localStorage.setItem(KEY,JSON.stringify(data)); }
  catch(e) { toast("Could not save in this browser. Check storage settings or export a backup."); }
  renderAll();
}
function peso(n){const value=Number(n||0);if(!Number.isFinite(value))return "₱0.00";return "₱"+value.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}
function pesoCompact(n){const value=Number(n||0);if(!Number.isFinite(value))return "₱0.00";const abs=Math.abs(value);if(abs>=1e9)return "₱"+(value/1e9).toLocaleString("en-PH",{maximumFractionDigits:2})+"B";if(abs>=1e6)return "₱"+(value/1e6).toLocaleString("en-PH",{maximumFractionDigits:2})+"M";if(abs>=1e4)return "₱"+(value/1e3).toLocaleString("en-PH",{maximumFractionDigits:1})+"K";return peso(value)}
const MAX_MONEY_AMOUNT=1000000000;
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.className="toast show";setTimeout(()=>t.className="toast",2800)}
function go(page){if(page==="dashboard"||page==="cash")page="activities";document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(page)?.classList.add("active");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
function openModal(id){document.getElementById(id).classList.add("open")}
function closeModal(id){document.getElementById(id).classList.remove("open")}
function removeAccount(id){
  const a=data.accounts.find(x=>String(x.id)===String(id)); if(!a)return toast("Bank account not found.");
  const balance=Number(a.balance)||0;
  const balanceWarning=Math.abs(balance)>0.000001?`\n\nCurrent balance: ${peso(balance)}. Removing this account will remove that amount from the active bank total. Historical transactions will be kept.`:"\n\nHistorical transactions will be kept.";
  if(!confirm(`First confirmation: Remove bank account “${a.name}”?${balanceWarning}`))return;
  const typed=prompt(`Final confirmation for “${a.name}”\n\nType DELETE (all caps) to remove this account:`);
  if(typed!=="DELETE")return toast("Removal cancelled. You must type DELETE exactly.");
  data.accounts=data.accounts.filter(x=>String(x.id)!==String(id)); data.bankRecords=data.bankRecords.filter(r=>String(r.account)!==String(a.name) && !String(r.note||"").includes("To "+a.name) && !String(r.note||"").includes("From "+a.name)); data.activities=data.activities.filter(r=>String(r.source||"")!==String(a.name)); persist(); toast("Bank account and its recent bank records were removed.");
}
function renameAccount(id){
  const a=data.accounts.find(x=>String(x.id)===String(id)); if(!a)return toast("Bank account not found.");
  const oldName=a.name;
  const next=prompt(`Update bank account name\n\nCurrent name: ${oldName}\n\nEnter the correct account name:`);
  if(next===null)return;
  const name=String(next).trim();
  if(!name)return toast("Account name cannot be empty.");
  if(name.toLowerCase()===oldName.toLowerCase())return toast("No account name change was made.");
  if(data.accounts.some(x=>String(x.id)!==String(id)&&String(x.name||"").trim().toLowerCase()===name.toLowerCase()))return toast("That bank account name already exists.");
  a.name=name;
  data.bankRecords.forEach(r=>{if(String(r.account||"")===oldName)r.account=name;});
  data.activities.forEach(r=>{if(String(r.source||"")===oldName)r.source=name;});
  persist(); toast("Bank account name updated.");
}
function addAccount(){
  const nameEl=document.getElementById("newAccountName");
  const balanceEl=document.getElementById("newAccountBalance");
  const name=String(nameEl?.value||"").trim();
  const raw=String(balanceEl?.value??"").trim();
  const bal=raw===""?0:Number(raw);
  if(!name){toast("Please enter an account name.");nameEl?.focus();return;}
  if(!Number.isFinite(bal)||bal<0){toast("Enter a valid starting balance of zero or more.");balanceEl?.focus();return;}
  data.accounts=Array.isArray(data.accounts)?data.accounts:[];
  data.bankRecords=Array.isArray(data.bankRecords)?data.bankRecords:[];
  if(data.accounts.some(a=>String(a.name||"").trim().toLowerCase()===name.toLowerCase())){toast("That bank account name already exists.");return;}
  const id=Date.now()+Math.floor(Math.random()*100000);
  data.accounts.push({id,name,balance:bal});
  data.bankRecords.unshift({id:Date.now()+Math.random(),date:today(),type:"Account Created",account:name,amount:bal,note:raw===""||bal===0?"Account created with zero balance":"Starting balance recorded"});
  if(nameEl)nameEl.value="";if(balanceEl)balanceEl.value="";
  closeModal("accountModal");persist();
  toast("Account added. Check Bank Accounts and Recent Bank Records.");
}

function fillAccountSelects(){
  const opts=data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
  ["bankAccount","bankDestination"].forEach(id=>{const el=document.getElementById(id);if(el){const old=el.value;el.innerHTML=(id==="bankAccount"||id==="bankDestination"?`<option value="cash">Grace Giving – Cash on Hand</option>`:"")+opts;if([...el.options].some(o=>o.value===old))el.value=old;}});
  const activitySource=document.getElementById("activitySource");
  if(activitySource){const old=activitySource.value;activitySource.innerHTML='<option value="cash">Grace Giving – Cash on Hand</option>'+data.accounts.map(a=>`<option value="bank:${a.id}">${esc(a.name)}</option>`).join("");if([...activitySource.options].some(o=>o.value===old))activitySource.value=old;}
  const memberOpts=data.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  ["savingsMember","memberRecordSelect"].forEach(id=>{const el=document.getElementById(id);if(el){const old=el.value;el.innerHTML=(id==="memberRecordSelect"?'<option value="">Select a registered member</option>':'<option value="">Select a member</option>')+memberOpts;if([...el.options].some(o=>o.value===old))el.value=old;}});
}
function openBankTx(type){
  fillAccountSelects();document.getElementById("bankTxDate").value=today();document.getElementById("bankTxType").value=type;document.getElementById("bankModalTitle").textContent=type==="Transfer"?"Fast Bank Transfer":type+" Bank Balance";toggleDest();openModal("bankModal")
}
document.getElementById("bankTxType").addEventListener("change",toggleDest);
document.getElementById("bankAccount").addEventListener("change",toggleDest);
function toggleDest(){
  const type=document.getElementById("bankTxType").value,source=document.getElementById("bankAccount"),dest=document.getElementById("bankDestination");
  document.getElementById("destWrap").style.display=type==="Transfer"?"flex":"none";
  if(!dest||!source)return;
  const old=dest.value, opts=data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("");
  dest.innerHTML=(source.value!=="cash"?'<option value="cash">Grace Giving – Cash on Hand</option>':"")+opts;
  if([...dest.options].some(o=>o.value===old))dest.value=old;else if(dest.options.length)dest.selectedIndex=0;
}
function money2(value){const n=Math.round((Number(value)||0)*100)/100;return Math.abs(n)<0.005?0:n;}
function saveBankTx(){
  const type=document.getElementById("bankTxType")?.value||"Deposit";
  const rawId=document.getElementById("bankAccount")?.value||"";
  const id=Number(rawId),rawDest=document.getElementById("bankDestination")?.value||"",dest=Number(rawDest);
  const rawAmount=String(document.getElementById("bankAmount")?.value??"").trim();
  const amt=rawAmount===""?NaN:Number(rawAmount);
  const note=String(document.getElementById("bankNote")?.value||"").trim();
  const date=document.getElementById("bankTxDate")?.value||"";
  if(!date)return toast("Select the transaction date.");
  if(type==="Adjustment"&&!note)return toast("Adjustment note is required.");
  if(!rawId)return toast("Add or select a bank account first.");
  if(rawId==="cash"&&type!=="Transfer")return toast("Cash on Hand can be used here only for a Fast Transfer to a bank.");
  if(!Number.isFinite(amt)||amt<0||(amt===0&&type!=="Adjustment"))return toast("Please enter a valid amount greater than zero.");
  if(amt>MAX_MONEY_AMOUNT)return toast("Amount cannot exceed ₱1,000,000,000.00.");
  if(type==="Transfer"&&rawId==="cash"){
    const d=data.accounts.find(x=>Number(x.id)===dest);if(!d)return toast("Choose a destination bank account.");if(amt>Number(data.cashBalance||0))return toast("Transfer exceeds Cash on Hand.");data.cashBalance=money2(data.cashBalance-amt);d.balance=money2((Number(d.balance)||0)+amt);const linkId=Date.now()+Math.random();data.cashRecords.unshift({id:linkId,date,type:"Cash Transferred to Bank",amount:-amt,note:note||"Transferred to "+d.name,linkedBankAccount:d.name});data.bankRecords.unshift({id:Date.now()+Math.random(),linkId,date,type:"Cash Deposit",account:d.name,amount:amt,note:note||"Transferred from Cash on Hand"});document.getElementById("bankAmount").value="";document.getElementById("bankNote").value="";closeModal("bankModal");persist();toast("Cash transferred to bank and both records updated.");return;
  }
  const a=data.accounts.find(x=>Number(x.id)===id);
  if(!a)return toast("Selected bank account was not found. Please reopen the form.");
  a.balance=Number(a.balance)||0;
  if(type==="Deposit"){
    a.balance=money2(a.balance+amt);data.bankRecords.unshift({id:Date.now()+Math.random(),date,type,account:a.name,amount:amt,note:note||"Bank deposit"});
  }else if(type==="Withdrawal"){
    if(a.balance+0.000001<amt)return toast("Withdrawal is greater than the bank balance.");
    a.balance=money2(a.balance-amt);data.bankRecords.unshift({id:Date.now()+Math.random(),date,type,account:a.name,amount:-amt,note:note||"Bank withdrawal"});
  }else if(type==="Transfer"){
    if(rawDest==="cash"){
      if(a.balance+0.000001<amt)return toast("Transfer is greater than the source bank balance.");
      a.balance=money2(a.balance-amt);data.cashBalance=money2((Number(data.cashBalance)||0)+amt);
      const linkId=Date.now()+Math.random();
      data.bankRecords.unshift({id:linkId,date,type:"Transfer to Cash on Hand",account:a.name,amount:-amt,note:note||"Transferred to Grace Giving – Cash on Hand"});
      data.cashRecords.unshift({id:Date.now()+Math.random(),linkId,date,type:"Bank Transfer Received",amount:amt,note:note||"Transferred from "+a.name,linkedBankAccount:a.name});
    }else{
      const d=data.accounts.find(x=>Number(x.id)===dest);if(!d||Number(d.id)===Number(a.id))return toast("Choose a different destination account.");
      if(a.balance+0.000001<amt)return toast("Transfer is greater than the source balance.");
      d.balance=Number(d.balance)||0;a.balance=money2(a.balance-amt);d.balance=money2(d.balance+amt);
      data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Transfer Out",account:a.name,amount:-amt,note:"To "+d.name+(note?" — "+note:"")});
      data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Transfer In",account:d.name,amount:amt,note:"From "+a.name+(note?" — "+note:"")});
    }
  }else if(type==="Adjustment"){
    const diff=money2(amt-a.balance);a.balance=money2(amt);
    data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Balance Adjustment",account:a.name,amount:diff,note});
  }else return toast("Unknown transaction type.");
  document.getElementById("bankAmount").value="";document.getElementById("bankNote").value="";document.getElementById("bankTxDate").value=today();
  closeModal("bankModal");persist();toast("Bank transaction saved with account, amount, date, and note.");
}

function saveCash(){
  const type=document.getElementById("cashRecordType")?.value||"Offering";
  const raw=String(document.getElementById("cashAmount")?.value??"").trim(),amt=Number(raw);
  const date=document.getElementById("cashDate")?.value,note=String(document.getElementById("cashNote")?.value||"").trim();
  if(!date)return toast("Select the collection date.");
  if(!raw||!Number.isFinite(amt)||amt<=0)return toast("Enter a collection amount greater than zero.");
  if(amt>MAX_MONEY_AMOUNT)return toast("Amount cannot exceed ₱1,000,000,000.00.");
  data.cashBalance=money2((Number(data.cashBalance)||0)+amt);
  const rec={id:Date.now()+Math.random(),date,type,amount:amt,note,allocationShares:{}};
  data.cashRecords.unshift(rec);
  if(type==="Offering"){
    data.collectionBalance=(Number(data.collectionBalance)||0)+amt;
    let allocated=0;
    COLLECTION_SPLITS.forEach(([name,pct],i)=>{
      const share=i===COLLECTION_SPLITS.length-1?Math.round((amt-allocated)*100)/100:Math.round((amt*pct/100)*100)/100;
      allocated+=share;rec.allocationShares[name]=share;
      data.collectionAllocations[name]=(Number(data.collectionAllocations[name])||0)+share;
      data.collectionRecords.unshift({id:Date.now()+Math.random(),cashRecordId:rec.id,date,type:"Collection Allocation",category:name,amount:share,note:`${type} distribution (${pct}%)`});
    });
  }else{
    data.collectionRecords.unshift({id:Date.now()+Math.random(),cashRecordId:rec.id,date,type:"Donation Received (not auto-allocated)",category:"Donation",amount:amt,note:note||"Donation awaiting manual allocation"});
  }
  document.getElementById("cashAmount").value="";document.getElementById("cashNote").value="";
  persist();toast(type==="Offering"?"Offering recorded and distributed by fixed percentages.":"Donation recorded to Cash on Hand. Choose an allocation and use Override Amount if needed.");
}
function selectActivity(name){const el=document.getElementById("activityType");if(el)el.value=name;updateActivityFormHint();document.getElementById("activityAmount")?.focus()}
function updateActivityFormHint(){const type=document.getElementById("activityType")?.value||"";const optionalPurpose=["Pastor’s Allocation","Music Director","Church Administrator"].includes(type);const takeaway=["Pastor’s Allocation","Music Director"].includes(type);const label=document.getElementById("activityPurposeLabel");if(label){const oldInput=label.querySelector("input");const previousValue=oldInput?oldInput.value:"";label.innerHTML=optionalPurpose?'Description (optional)<input id="activityNote" maxlength="250" placeholder="Optional description">':'<span class="required-label-text">Purpose</span><input id="activityNote" required maxlength="250" placeholder="What was this expense for?">';const nextInput=label.querySelector("input");if(nextInput)nextInput.value=previousValue;}const source=document.getElementById("activitySource");if(takeaway&&source)source.value="cash";const hint=document.getElementById("activityFormHint");if(hint)hint.textContent=takeaway?"Record the withdrawal date and amount taken from this allocation. Fund source is Cash on Hand; description is optional.":type==="Church Administrator"?"Enter the date and amount. A description is optional.":optionalPurpose?"Enter the date and amount. Description is optional.":"Enter the purpose, date, amount, and fund source. The selected activity allocation balance will decrease.";}
function saveActivity(){
  const type=document.getElementById("activityType").value,raw=String(document.getElementById("activityAmount").value??"").trim(),amt=money2(Number(raw)),note=document.getElementById("activityNote").value.trim(),date=document.getElementById("activityDate")?.value,source=document.getElementById("activitySource")?.value||"cash";
  const special=["Pastor’s Allocation","Music Director","Church Administrator"].includes(type);
  if(!date)return toast("Select the activity date.");
  if(!raw||!Number.isFinite(amt)||amt<=0)return toast("Enter an expense or takeaway amount greater than zero.");
  if(amt>MAX_MONEY_AMOUNT)return toast("Amount cannot exceed ₱1,000,000,000.00.");
  if(!special&&!note)return toast("Purpose is required for activity expenses.");
  const usesAllocation=(source==="cash"||source==="collection");const available=Number(data.collectionAllocations[type]||0);if(usesAllocation&&amt>available)return toast("Amount exceeds the available allocation for this activity.");
  if(source==="cash"&&money2(amt)>money2(data.cashBalance||0))return toast("Amount exceeds Grace Giving – Cash on Hand.");
  if(source.startsWith("bank:") ){const account=data.accounts.find(a=>String(a.id)===source.slice(5));if(!account)return toast("Select a valid bank account.");if(money2(amt)>money2(account.balance||0))return toast("Amount exceeds the selected bank account balance.");}
  if(usesAllocation)data.collectionAllocations[type]=available-amt;
  if(usesAllocation)data.collectionBalance-=amt;if(source==="cash")data.cashBalance=money2((Number(data.cashBalance)||0)-amt);
  let sourceLabel="Grace Giving – Cash on Hand";
  const activityId=Date.now()+Math.random();
  if(source.startsWith("bank:")){const account=data.accounts.find(a=>String(a.id)===source.slice(5));account.balance=money2((Number(account.balance)||0)-amt);sourceLabel=account.name;data.bankRecords.unshift({id:Date.now()+Math.random(),activityId,date,type:"Activity Expense",account:account.name,amount:-amt,note:note||type});}
  const r={id:activityId,date,activity:type,amount:-amt,source:sourceLabel,sourceKey:source,note,recordType:special?"Takeaway / Withdrawal":"Activity Expense"};
  data.activities.unshift(r);data.collectionRecords.unshift({id:Date.now()+Math.random(),activityId:r.id,date,type:r.recordType,category:type,amount:-amt,note:note||"Takeaway recorded"});
  document.getElementById("activityAmount").value="";document.getElementById("activityNote").value="";persist();toast(special?"Takeaway recorded and allocation updated.":"Activity expense recorded and allocation updated.");
}

function removeMember(id){
  const m=data.members.find(x=>String(x.id)===String(id)); if(!m)return toast("Member not found.");
  const balance=Number(m.balance)||0;
  if(!confirm(`First confirmation: Remove member “${m.name}”?\n\n${balance!==0?`Current savings balance: ${peso(balance)}. Removing the member will remove this balance from active member totals.\n`:""}Transaction history will be retained for audit purposes.`))return;
  const typed=prompt(`Final confirmation for “${m.name}”\n\nType DELETE (all caps) to remove this member:`);
  if(typed!=="DELETE")return toast("Removal cancelled. You must type DELETE exactly.");
  // Preserve the member name on historical transactions before removing the profile.
  data.savingsRecords.forEach(r=>{if(String(r.memberId)===String(id)&&!r.memberName)r.memberName=m.name;});
  data.members=data.members.filter(x=>String(x.id)!==String(id)); persist(); toast("Member removed. Historical transactions were retained.");
}
function renameMember(id){
  const m=data.members.find(x=>String(x.id)===String(id)); if(!m)return toast("Member not found.");
  const oldName=m.name;
  const next=prompt(`Update member name\n\nCurrent name: ${oldName}\n\nEnter the correct member name:`);
  if(next===null)return;
  const name=String(next).trim();
  if(!name)return toast("Member name cannot be empty.");
  if(name.toLowerCase()===oldName.toLowerCase())return toast("No member name change was made.");
  if(data.members.some(x=>String(x.id)!==String(id)&&String(x.name||"").trim().toLowerCase()===name.toLowerCase()))return toast("That member already exists.");
  m.name=name;
  data.savingsRecords.forEach(r=>{if(String(r.memberId)===String(id))r.memberName=name;});
  persist(); toast("Member name updated.");
}
function addMember(){
  const name=document.getElementById("newMemberName").value.trim();if(!name)return toast("Enter the member name.");
  if(data.members.some(m=>m.name.toLowerCase()===name.toLowerCase()))return toast("That member already exists.");
  data.members.push({id:Date.now(),name,balance:0});document.getElementById("newMemberName").value="";closeModal("memberModal");persist();toast("Fun Savings member added.")
}
function fillMemberSelect(){document.getElementById("savingsMember").innerHTML=data.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}
function saveSavings(){
  const rawMid=document.getElementById("savingsMember").value,mid=Number(rawMid),type=document.getElementById("savingsTransactionType").value,rawAmount=document.getElementById("savingsAmount").value,amt=Number(rawAmount),m=data.members.find(x=>x.id===mid);
  if(!rawMid||!m)return toast("Select a member first.");
  if(rawAmount.trim()===""||!Number.isFinite(amt)||amt<=0)return toast("Enter a savings amount greater than ₱0.00.");
  if(type==="Withdrawal"){if(m.balance<amt)return toast("Withdrawal is greater than the member's available savings balance.");m.balance-=amt}else m.balance+=amt;
  data.savingsRecords.unshift({date:document.getElementById("savingsDate")?.value||today(),memberId:mid,type,amount:type==="Withdrawal"?-amt:amt,balance:m.balance,note:document.getElementById("savingsNote")?.value.trim()||""});
  document.getElementById("savingsAmount").value="";document.getElementById("savingsTransactionType")?.addEventListener("change",()=>{const t=document.getElementById("savingsTransactionType").value;document.getElementById("saveSavingsButton").textContent=t==="Withdrawal"?"− Record Withdrawal":"＋ Save Weekly Savings";});
if(document.getElementById("savingsDate"))document.getElementById("savingsDate").value=today();if(document.getElementById("savingsNote"))document.getElementById("savingsNote").value="";persist();toast(type==="Withdrawal"?"Withdrawal recorded.":"Weekly savings recorded.")
}
function setTextIfPresent(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function setHtmlIfPresent(id,value){const el=document.getElementById(id);if(el)el.innerHTML=value}
function renderAll(){
  fillAccountSelects();
  const bank=data.accounts.reduce((sum,a)=>sum+(Number(a.balance)||0),0),savings=data.members.reduce((sum,m)=>sum+(Number(m.balance)||0),0);
  const collected=data.cashRecords.filter(r=>["Offering","Donation"].includes(r.type)).reduce((sum,r)=>sum+(Number(r.amount)||0),0);
  ["dashBank","bankTotal","reportBank"].forEach(id=>setTextIfPresent(id,peso(bank)));
  ["dashCash","cashTotal","reportCash"].forEach(id=>setTextIfPresent(id,peso(data.cashBalance)));
  ["dashCollected","cashCollectedTotal"].forEach(id=>setTextIfPresent(id,peso(collected)));
  const now=new Date();const day=(now.getDay()+6)%7;const monday=new Date(now);monday.setDate(now.getDate()-day);monday.setHours(0,0,0,0);const weekStart=`${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,"0")}-${String(monday.getDate()).padStart(2,"0")}`;const weekCashIn=data.cashRecords.filter(r=>r.date>=weekStart&&r.date<=today()&&["Offering","Donation"].includes(r.type)).reduce((sum,r)=>sum+(Number(r.amount)||0),0);const weekTransfers=data.cashRecords.filter(r=>r.date>=weekStart&&r.date<=today()&&r.type==="Cash Transferred to Bank").reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);const weekExpenses=data.activities.filter(r=>r.date>=weekStart&&r.date<=today()&&(r.sourceKey||"cash")==="cash").reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);const weekAvailable=Math.max(0,weekCashIn-weekTransfers-weekExpenses);setTextIfPresent("cashWeekCollected",peso(weekCashIn));setTextIfPresent("cashWeekAvailable",peso(weekAvailable));
  ["dashSavings","savingsTotal","reportSavings"].forEach(id=>setTextIfPresent(id,peso(savings)));
  setTextIfPresent("memberCount",data.members.length);
  setHtmlIfPresent("bankAccounts",data.accounts.map(a=>`<div class="account-row"><div><strong>${esc(a.name)}</strong><small>Current balance</small></div><strong>${peso(a.balance)}</strong><div class="button-row"><button class="btn secondary" onclick="renameAccount(${JSON.stringify(a.id)})" title="Update account name" aria-label="Update account name">✎</button><button class="btn secondary" onclick="removeAccount(${JSON.stringify(a.id)})">Remove</button></div></div>`).join("")||`<p class="empty-state">No bank accounts registered yet. Select <strong>Add Bank Account</strong> to create one.</p>`);
  setHtmlIfPresent("bankRecords",data.bankRecords.slice(0,50).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td>${esc(r.account||"")}</td><td class="${Number(r.amount)>=0?"positive":"negative"}">${Number(r.amount)>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openBankEdit(${i})">Update</button> <button class="btn danger" onclick="deleteBankRecord(${i})">Delete</button></td></tr>`).join("")||emptyRow(6));
  setHtmlIfPresent("cashRecords",data.cashRecords.slice(0,100).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td class="${Number(r.amount)>=0?"positive":"negative"}">${Number(r.amount)>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td><td><div class="button-row"><button class="btn secondary" onclick="openCashEdit(${i})">Update</button><button class="btn danger" onclick="deleteCashRecord(${i})">Delete</button></div></td></tr>`).join("")||emptyRow(5));
  setHtmlIfPresent("activityRecords",data.activities.slice(0,100).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.activity||"")}</td><td class="negative">${peso(r.amount)}</td><td>${esc(r.source||"")}</td><td>${esc(r.note||"")}</td><td><div class="button-row"><button class="btn secondary" onclick="openActivityEdit(${i})">Update</button><button class="btn danger" onclick="deleteActivityRecord(${i})">Delete</button></div></td></tr>`).join("")||emptyRow(6));
  renderSavings();toggleDest();renderCollectionPanels();renderReports();renderLiveOverview();
}

function setSavingsView(view){
  const memberTab=document.getElementById("tabMember"),allTab=document.getElementById("tabAll");
  memberTab?.classList.toggle("active",view==="selected");allTab?.classList.toggle("active",view==="all");
  const memberTable=document.querySelector("#memberSavingsRecords")?.closest(".savings-card");
  if(memberTable)memberTable.style.display=view==="all"?"none":"block";
  const allTable=document.querySelector("#allSavingsRecords")?.closest(".savings-card");
  if(allTable)allTable.style.display=view==="all"?"block":"none";
  renderSavings();
}
function renderSavings(){
  const selected=Number(document.getElementById("memberRecordSelect")?.value)||0;
  const m=data.members.find(x=>x.id===selected);
  document.getElementById("selectedMemberSummary").innerHTML=m?`<div><strong>${esc(m.name)}</strong><small>Member savings balance</small></div><strong>${peso(m.balance)}</strong><div class="button-row"><button class="btn secondary" onclick="renameMember(${JSON.stringify(m.id)})" title="Update account name" aria-label="Update account name">✎</button><button class="btn secondary" onclick="removeMember(${JSON.stringify(m.id)})">Remove Member</button></div>`:"<span>Select a member to see their record.</span>";
  const single=data.savingsRecords.filter(r=>r.memberId===selected);
  document.getElementById("memberSavingsRecords").innerHTML=single.map(r=>{const i=data.savingsRecords.indexOf(r);return `<tr><td>${esc(r.date||"")}</td><td>${esc(r.type)}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${peso(r.balance)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openSavingsEdit(${i})">Update</button></td></tr>`}).join("")||emptyRow(6);
  document.getElementById("allSavingsRecords").innerHTML=data.savingsRecords.map(r=>{const i=data.savingsRecords.indexOf(r),member=data.members.find(x=>x.id===r.memberId);return `<tr><td>${esc(r.date||"")}</td><td>${esc(member?.name||r.memberName||"Removed member")}</td><td>${esc(r.type)}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${peso(r.balance)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openSavingsEdit(${i})">Update</button></td></tr>`}).join("")||emptyRow(7);
}
function selectSavingsMember(id){const sel=document.getElementById("memberRecordSelect");if(sel)sel.value=String(id);const entry=document.getElementById("savingsMember");if(entry)entry.value=String(id);setSavingsView("selected");}
function emptyRow(n){return `<tr><td colspan="${n}" style="opacity:.45;text-align:center">No records yet.</td></tr>`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function sortChronological(records){
  return [...records].sort((a,b)=>{
    const da=String(a.date||""); const db=String(b.date||"");
    return da.localeCompare(db) || String(a.id||"").localeCompare(String(b.id||""));
  });
}
function exportCSV(section){
  let rows=[];
  if(section==="bank"){
    const records=sortChronological(data.bankRecords);
    rows=[["Date","Type","Account","Amount","Note"],...records.map(r=>[r.date,r.type,r.account,r.amount,r.note])];
  }
  if(section==="cash"){
    const records=sortChronological(data.cashRecords);
    rows=[["Date","Type","Amount","Purpose"],...records.map(r=>[r.date,r.type,r.amount,r.note])];
  }
  if(section==="activities"){
    const records=sortChronological(data.activities);
    rows=[["Date","Activity","Amount","Paid From","Description"],...records.map(r=>[r.date,r.activity,r.amount,r.source,r.note])];
  }
  if(section==="allocations"){
    const splits=[["Pastor’s Allocation",40],["Church Administrator",5],["Music Director",5],["Church Anniversary",20],["Food Ministry",10],["Maintenance",10],["Other’s",10]];
    rows=[["Allocation","Fixed Percentage","Assigned Share (PHP)","Spent (PHP)"],...splits.map(([name,pct])=>{const assigned=Number(data.collectionAllocations?.[name])||0;const spent=data.activities.filter(r=>r.activity===name).reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);return [name,pct+"%",assigned.toFixed(2),spent.toFixed(2)]})];
  }
  if(section==="audit"){
    rows=[["Date","Time","Action","Section"],...(data.auditLog||[]).map(r=>[r.date,r.time,r.action,r.section])];
  }
  if(section==="savings"){
    const records=sortChronological(data.savingsRecords);
    const total=data.members.reduce((sum,m)=>sum+(Number(m.balance)||0),0);
    rows=[["Date","Member","Type","Amount (PHP)","Note","Balance (PHP)"],...records.map(r=>{const m=data.members.find(x=>x.id===r.memberId);return [r.date,m?.name||r.memberName||"Removed member",r.type,r.amount,r.note||"",r.balance]})];
    rows.push([],["TOTAL SAVINGS (ALL MEMBERS)","","","",total,total]);
  }
  downloadExcelOrCSV(rows,`church_${section}_report`);
}
function downloadExcelOrCSV(rows,baseName){
  if(window.XLSX){
    const ws=XLSX.utils.aoa_to_sheet(rows);
    const columnCount=Math.max(1,...rows.map(r=>r.length));
    const endCol=XLSX.utils.encode_col(columnCount-1);
    ws['!autofilter']={ref:`A1:${endCol}${Math.max(1,rows.length)}`};
    ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};
    ws['!cols']=Array.from({length:columnCount},(_,i)=>({wch:Math.min(34,Math.max(12,...rows.slice(0,100).map(r=>String(r[i]??'').length+2)))}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Report');
    XLSX.writeFile(wb,`${baseName}.xlsx`);return;
  }
  const csv=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(csv,`${baseName}.csv`,"text/csv;charset=utf-8");
  toast('Excel filter support was unavailable, so a CSV backup was exported instead. Connect to the internet and retry for a filter-enabled .xlsx file.');
}
function renderReports(){
  const host=document.getElementById('financialReportCharts');
  if(host){
    const splits=COLLECTION_SPLITS||[];
    const items=[];
    const totalOfferings=data.cashRecords.filter(r=>r.type==='Offering').reduce((a,r)=>a+(Number(r.amount)||0),0);
    const totalDonations=data.cashRecords.filter(r=>r.type==='Donation').reduce((a,r)=>a+(Number(r.amount)||0),0);
    items.push({label:'Offerings',value:totalOfferings,color:'blue'},{label:'Donations',value:totalDonations,color:'green'});
    splits.forEach(([name])=>items.push({label:name+' expenses',value:data.activities.filter(r=>r.activity===name).reduce((a,r)=>a+Math.abs(Number(r.amount)||0),0),color:'orange'}));
    data.accounts.forEach(a=>items.push({label:'Bank: '+a.name,value:Number(a.balance)||0,color:'purple'}));
    const max=Math.max(1,...items.map(x=>Math.abs(x.value)));
    host.innerHTML=items.map(x=>`<div class="report-bar-row"><div class="report-bar-label" title="${esc(x.label)}">${esc(x.label)}</div><div class="report-bar-track"><div class="report-bar-fill ${x.color}" style="width:${Math.max(x.value===0?0:2,Math.min(100,Math.abs(x.value)/max*100))}%"></div></div><strong>${peso(x.value)}</strong></div>`).join('')||'<p class="empty-state">No financial records to chart yet.</p>';
  }
  const logRows=document.getElementById('auditLogRows');
  if(logRows){const logs=(data.auditLog||[]).slice(0,200);logRows.innerHTML=logs.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.time||'')}</td><td>${esc(r.action||'')}</td><td>${esc(r.section||'')}</td></tr>`).join('')||emptyRow(4,'No actions logged yet.');}
}
function exportAllWorkbook(){
 if(!window.XLSX){toast('Excel workbook export needs an internet connection to load the spreadsheet library. Please reconnect and try again.');return;}
 const wb=XLSX.utils.book_new();
 const addSheet=(name,rows)=>{const ws=XLSX.utils.aoa_to_sheet(rows.length?rows:[['No records']]);const cols=Math.max(1,...rows.map(r=>r.length));ws['!autofilter']={ref:`A1:${XLSX.utils.encode_col(cols-1)}${Math.max(1,rows.length)}`};ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activePane:'bottomLeft',state:'frozen'};ws['!cols']=Array.from({length:cols},(_,i)=>({wch:Math.min(36,Math.max(12,...rows.slice(0,100).map(r=>String(r[i]??'').length+2)))}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));};
 const splits=COLLECTION_SPLITS||[];
 addSheet('Summary',[['Metric','Amount (PHP)'],['Cash on Hand',Number(data.cashBalance)||0],['Total Bank Balance',data.accounts.reduce((a,x)=>a+(Number(x.balance)||0),0)],['Total Savings',data.members.reduce((a,x)=>a+(Number(x.balance)||0),0)],['Total Offerings',data.cashRecords.filter(r=>r.type==='Offering').reduce((a,r)=>a+(Number(r.amount)||0),0)],['Total Donations',data.cashRecords.filter(r=>r.type==='Donation').reduce((a,r)=>a+(Number(r.amount)||0),0)]]);
 addSheet('Bank Accounts',[['Account','Current Balance'],...data.accounts.map(a=>[a.name,a.balance])]);
 addSheet('Bank Transactions',[['Date','Type','Account','Amount','Note'],...sortChronological(data.bankRecords).map(r=>[r.date,r.type,r.account,r.amount,r.note])]);
 addSheet('Cash Collections',[['Date','Type','Amount','Notes'],...sortChronological(data.cashRecords).map(r=>[r.date,r.type,r.amount,r.note])]);
 addSheet('Allocation Balances',[['Allocation','Fixed Percentage','Available Share (PHP)','Spent (PHP)'],...splits.map(([name,pct])=>[name,pct+'%',Number(data.collectionAllocations?.[name])||0,data.activities.filter(r=>r.activity===name).reduce((a,r)=>a+Math.abs(Number(r.amount)||0),0)])]);
 addSheet('Allocation Records',[['Date','Allocation / Activity','Amount','Record'],...(data.collectionRecords||[]).map(r=>[r.date,r.category||r.activity||r.type||'',r.amount,r.note||r.description||''])]);
 addSheet('Activity Expenses',[['Date','Activity','Amount','Fund Source','Description'],...sortChronological(data.activities).map(r=>[r.date,r.activity,r.amount,r.source,r.note])]);
 addSheet('Savings Members',[['Member','Current Balance'],...data.members.map(m=>[m.name,m.balance])]);
 addSheet('Savings Transactions',[['Date','Member','Type','Amount','Note','Balance'],...sortChronological(data.savingsRecords).map(r=>[r.date,data.members.find(m=>m.id===r.memberId)?.name||r.memberName||'Removed member',r.type,r.amount,r.note||'',r.balance])]);
 addSheet('Action Log',[['Date','Time','Action','Section'],...(data.auditLog||[]).map(r=>[r.date,r.time,r.action,r.section])]);
 XLSX.writeFile(wb,`church_finance_all_records_${today()}.xlsx`);toast('All records exported into one Excel workbook with separate sheets.');
}
function exportBackup(){downloadBlob(JSON.stringify(data,null,2),`church_finance_backup_${today()}.json`,"application/json")}
function importBackup(e){const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(!incoming.accounts||!incoming.members)throw Error();if(!confirm("Restore this backup? Current prototype data will be replaced."))return;data=incoming;persist();toast("Backup restored.")}catch{toast("Invalid backup file.")}};reader.readAsText(f)}
function downloadBlob(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.getElementById("memberView")?.addEventListener("change",renderAll);
document.getElementById("memberRecordSelect")?.addEventListener("change",()=>{const sel=document.getElementById("savingsMember");if(sel)sel.value=document.getElementById("memberRecordSelect").value;renderSavings();});
function exportMemberCSV(){
 const mid=Number(document.getElementById("memberRecordSelect").value),m=data.members.find(x=>x.id===mid);
 if(!m)return toast("Select a member first.");
 const records=sortChronological(data.savingsRecords.filter(r=>r.memberId===mid));
 const total=records.reduce((sum,r)=>sum+(Number(r.amount)||0),0);
 const rows=[["Date","Member","Transaction","Amount (PHP)","Note","Balance (PHP)"],...records.map(r=>[r.date,m.name,r.type,r.amount,r.note||"",r.balance])];
 rows.push([],["TOTAL SAVINGS",m.name,"","", "", total]);
 downloadExcelOrCSV(rows,`fun_savings_${m.name.replace(/[^a-z0-9_-]+/gi,"_")}_report`);
}
function openSavingsEdit(i){
 const r=data.savingsRecords[i];if(!r)return;document.getElementById("editSavingsIndex").value=i;
 document.getElementById("editSavingsMember").innerHTML=data.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
 document.getElementById("editSavingsMember").value=r.memberId;document.getElementById("editSavingsDate").value=r.date||today();
 document.getElementById("editSavingsType").value=r.type;document.getElementById("editSavingsAmount").value=Math.abs(Number(r.amount));document.getElementById("editSavingsNote").value="";openModal("savingsEditModal");
}
function saveSavingsEdit(){
 const i=Number(document.getElementById("editSavingsIndex").value),r=data.savingsRecords[i];if(!r)return;
 const note=document.getElementById("editSavingsNote").value.trim(),mid=Number(document.getElementById("editSavingsMember").value),type=document.getElementById("editSavingsType").value,amt=Number(document.getElementById("editSavingsAmount").value),date=document.getElementById("editSavingsDate").value;
 if(!note)return toast("Correction note is required.");if(!date||!Number.isFinite(amt)||amt<=0)return toast("Enter a valid date and amount.");
 const oldSigned=Number(r.amount)||0,newSigned=type==="Withdrawal"?-amt:amt,oldMember=data.members.find(m=>m.id===r.memberId),newMember=data.members.find(m=>m.id===mid);
 if(!newMember)return toast("Select a member.");
 if(oldMember)oldMember.balance-=oldSigned;newMember.balance+=newSigned;
 r.memberId=mid;r.type=type;r.amount=newSigned;r.date=date;r.note=(r.note?`${r.note} | `:"")+`Correction: ${note}`;
 // Refresh each saved balance for the affected member using chronological transaction order.
 for(const m of data.members){let running=0;const memberRows=data.savingsRecords.filter(x=>x.memberId===m.id).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));for(const x of memberRows){running+=Number(x.amount)||0;x.balance=running;}m.balance=running;}
 closeModal("savingsEditModal");persist();toast("Savings record corrected.");
}
document.getElementById("savingsTransactionType")?.addEventListener("change",()=>{const t=document.getElementById("savingsTransactionType").value;document.getElementById("saveSavingsButton").textContent=t==="Withdrawal"?"− Record Withdrawal":"＋ Save Weekly Savings";});
if(document.getElementById("savingsDate"))document.getElementById("savingsDate").value=today();

function clearData(){
  if(!confirm("Clear ALL church finance records saved in this browser? This cannot be undone. Download a backup first if you may need these records.")) return;
  localStorage.removeItem(KEY);
  data={accounts:[],bankRecords:[],cashBalance:0,cashRecords:[],activities:[],members:[],savingsRecords:[],collectionBalance:0,collectionAllocations:Object.fromEntries(COLLECTION_SPLITS.map(([n])=>[n,0])),collectionRecords:[]};
  persist();
  toast("All local data cleared.");
}

// Church collection allocation workflow. Percentages are applied to each amount allocated.
let COLLECTION_SPLITS=[['Pastor’s Allocation',40],['Church Anniversary',20],['Music Director',5],['Maintenance',10],['Food Ministry',10],['Church Administrator',5],['Other’s',10]];
data.collectionBalance=Number(data.collectionBalance)||0;
data.collectionAllocations=data.collectionAllocations||Object.fromEntries(COLLECTION_SPLITS.map(([n])=>[n,0]));
// Add newly introduced allocation keys without overwriting existing saved balances.
COLLECTION_SPLITS.forEach(([name])=>{if(!Number.isFinite(Number(data.collectionAllocations[name])))data.collectionAllocations[name]=0;else data.collectionAllocations[name]=Number(data.collectionAllocations[name])||0;});
if(data.collectionAllocations['Christmas and Anniversary']!==undefined && data.collectionAllocations['Church Anniversary']===undefined){data.collectionAllocations['Church Anniversary']=Number(data.collectionAllocations['Christmas and Anniversary'])||0;delete data.collectionAllocations['Christmas and Anniversary'];}
data.collectionRecords=Array.isArray(data.collectionRecords)?data.collectionRecords:[];
const SECTION_INFO = {
  dashboard: {
    title: "Dashboard Information",
    body: "<p>View a summary of the church’s recorded finances, including bank balances, Grace Giving cash, collected money, and Fun Savings totals.</p><ul><li>Use the menu to open a section and enter or review its records.</li><li>Use Backup before major changes and Restore to load a previously saved backup.</li><li>Clear Data permanently removes this browser’s saved tracker data after confirmation.</li></ul>"
  },
  cash: {
    title: "Grace Giving – Cash on Hand",
    body: "<p>Record counted offerings and donations received by the church, including the date and amount.</p><ul><li>Cash collections update the Cash on Hand balance and collection totals.</li><li>Use Transfer to Bank only after physically depositing the cash; the matching cash and bank records are created.</li><li>Correct an existing record through its edit action and provide the required correction note.</li></ul>"
  },
  bank: {
    title: "Bank Management Information",
    body: "<p>Manage church bank accounts and record deposits, withdrawals, transfers, and balance adjustments.</p><ul><li>Choose the correct account and transaction date before saving.</li><li>Verify amounts against the bank statement or receipt.</li><li>Use account records to review activity. Keep a backup before major account changes.</li></ul>"
  },
  activities: {
    title: "Church Activities Information",
    body: "<p>Review allocation balances and record church expenses or approved takeaways.</p><ul><li>Select the correct activity/category, date, amount, and Paid From source.</li><li>Grace Giving – Cash on Hand and eligible allocation sources are shown where applicable.</li><li>When correcting a saved activity record, enter a clear correction note.</li></ul>"
  },
  savings: {
    title: "Fun Savings Cooperative Information",
    body: "<p>Manage cooperative members and record their weekly savings or withdrawals.</p><ul><li>Select the member and verify the transaction date and amount.</li><li>Review member-specific records and the all-members transaction history.</li><li>Use the correction workflow for edits and keep exported records as needed.</li></ul>"
  },
  reports: {
    title: "Reports Information",
    body: "<p>Review and export recorded financial activity for checking, filing, and sharing with authorized church leaders.</p><ul><li>Confirm the selected date range and totals before relying on a report.</li><li>Export a backup regularly and store it in a secure location.</li><li>Reports reflect records entered into this browser-based tracker.</li></ul>"
  },
  loans: {
    title: "Loans Information",
    body: "<p>The Loans section is reserved for a future feature and is not currently active. Do not record loan transactions here.</p>"
  },
  services: {
    title: "Load / GCash / Mart Information",
    body: "<p>This section is reserved for a future feature and is not currently active. Do not record transactions here yet.</p>"
  }
};
function showSectionInfo(requestedPage){
  const active=document.querySelector(".nav-btn.active");
  const page=requestedPage||active?.dataset.page||"dashboard";
  const info=SECTION_INFO[page]||SECTION_INFO.dashboard;
  document.getElementById("sectionInfoTitle").textContent=info.title;
  document.getElementById("sectionInfoContent").innerHTML=info.body;
  openModal("instructionsModal");
}
function showInstructions(){showSectionInfo();}
document.addEventListener("keydown",event=>{
  if(event.key!=="Escape") return;
  // Close the topmost open dialog, regardless of which feature opened it.
  const openModals=[...document.querySelectorAll(".modal.open")];
  if(openModals.length){
    closeModal(openModals[openModals.length-1].id);
    return;
  }
  // Also dismiss the inline Activity Allocation Balances help tooltip.
  const tip=document.getElementById("allocationInfoTip");
  const button=document.querySelector("#activities .heading-info-icon");
  if(tip&&!tip.hidden){tip.hidden=true;button?.setAttribute("aria-expanded","false");}
});
function transferCashToBank(){
  const id=Number(document.getElementById('cashTransferBank').value),raw=String(document.getElementById('cashTransferAmount').value||'').trim(),amt=Number(raw),a=data.accounts.find(x=>Number(x.id)===id),date=document.getElementById('cashTransferDate').value,note=document.getElementById('cashTransferNote').value.trim();
  if(!date)return toast('Select the transfer date.');if(!a)return toast('Select a bank account.');if(!raw||!Number.isFinite(amt)||amt<=0||amt>data.cashBalance)return toast('Enter an amount within Cash on Hand.');if(amt>MAX_MONEY_AMOUNT)return toast('Transfer amount cannot exceed ₱1,000,000,000.00.');
  const linkId=Date.now()+Math.random();data.cashBalance-=amt;a.balance=(Number(a.balance)||0)+amt;
  data.cashRecords.unshift({id:linkId,date,type:'Cash Transferred to Bank',amount:-amt,note:note||'Deposited to '+a.name,linkedBankAccount:a.name});
  data.bankRecords.unshift({id:Date.now()+Math.random(),linkId,date,type:'Cash Deposit',account:a.name,amount:amt,note:note||'Transferred from Cash on Hand'});
  document.getElementById('cashTransferAmount').value='';document.getElementById('cashTransferNote').value='';persist();toast('Cash transfer recorded in both cash and bank records.');
}
function openAllocationOverride(name){
  if(!COLLECTION_SPLITS.some(([n])=>n===name))return toast("Allocation not found.");
  document.getElementById("overrideAllocationName").value=name;
  document.getElementById("overrideAllocationHelp").textContent=`${name}: current remaining balance is ${peso(data.collectionAllocations[name]||0)}. This changes the allocation balance only; physical Cash on Hand is unchanged.`;
  document.getElementById("overrideAllocationAmount").value=(Number(data.collectionAllocations[name])||0).toFixed(2);
  document.getElementById("overrideAllocationReason").value="";
  openModal("allocationOverrideModal");
}
function saveAllocationOverride(){
  const name=document.getElementById("overrideAllocationName").value,raw=String(document.getElementById("overrideAllocationAmount").value||"").trim(),next=Number(raw),reason=document.getElementById("overrideAllocationReason").value.trim();
  if(!COLLECTION_SPLITS.some(([n])=>n===name))return toast("Allocation not found.");
  if(!raw||!Number.isFinite(next)||next<0)return toast("Enter a valid amount of zero or more.");
  if(!reason)return toast("Reason for override is required.");
  const before=Number(data.collectionAllocations[name])||0,delta=Math.round((next-before)*100)/100;
  data.collectionAllocations[name]=Math.round(next*100)/100;
  data.collectionBalance=Math.round(((Number(data.collectionBalance)||0)+delta)*100)/100;
  data.collectionRecords.unshift({id:Date.now()+Math.random(),date:today(),type:"Allocation Override",category:name,amount:delta,note:`Balance changed from ${peso(before)} to ${peso(next)}. Reason: ${reason}`});
  closeModal("allocationOverrideModal");persist();toast("Allocation amount overridden and records refreshed.");
}
function deleteActivityRecord(i){
  const r=data.activities[i];if(!r)return;
  const amount=Math.abs(Number(r.amount)||0),type=r.activity,sourceKey=r.sourceKey||(r.source==="Church Collection"?"collection":"cash");
  if(!confirm(`Delete this ${r.recordType||"activity"} record for ${peso(amount)}? Related balances will be reversed.`))return;
  if(sourceKey==="cash"||sourceKey==="collection"){data.collectionAllocations[type]=(Number(data.collectionAllocations[type])||0)+amount;data.collectionBalance=(Number(data.collectionBalance)||0)+amount;}
  if(sourceKey==="cash")data.cashBalance=(Number(data.cashBalance)||0)+amount;
  else if(sourceKey.startsWith("bank:")){const account=data.accounts.find(a=>String(a.id)===sourceKey.slice(5));if(account)account.balance=(Number(account.balance)||0)+amount;}
  else if(r.source&&r.source!=="Church Collection"){const account=data.accounts.find(a=>a.name===r.source);if(account)account.balance=(Number(account.balance)||0)+amount;}
  data.bankRecords=data.bankRecords.filter(br=>br.activityId!==r.id);
  data.collectionRecords.unshift({id:Date.now()+Math.random(),date:r.date||today(),type:"Activity Record Deleted",category:type,amount,note:`Deleted record reversed. ${r.note||""}`});
  data.activities.splice(i,1);persist();toast("Activity record deleted and related balances refreshed.");
}
function deleteCashRecord(i){
  const r=data.cashRecords[i];if(!r)return;
  if(!confirm(`Delete this ${r.type||"cash"} record for ${peso(r.amount)}? Related balances will be reversed.`))return;
  const amount=Number(r.amount)||0;
  if(r.type==="Donation"){
    if(data.cashBalance-amount < -0.005)return toast("Cannot delete this donation because Cash on Hand would become negative.");data.cashBalance=Math.round((data.cashBalance-amount)*100)/100;data.collectionRecords=data.collectionRecords.filter(cr=>cr.cashRecordId!==r.id);data.collectionRecords.unshift({id:Date.now()+Math.random(),date:r.date||today(),type:"Donation Record Deleted",category:"Donation",amount:-amount,note:"Donation deleted; no allocation shares were reversed because it was not auto-allocated."});
  }else if(r.type==="Cash Transferred to Bank"){
    const transferAmount=Math.abs(amount),account=data.accounts.find(a=>a.name===r.linkedBankAccount);
    if(!account){
      const linked=data.bankRecords.filter(br=>String(br.linkId)===String(r.id));
      if(!confirm(`The linked bank account “${r.linkedBankAccount||"(missing account reference)"}” was not found. Delete this orphaned transfer anyway? Cash on Hand will be restored by ${peso(transferAmount)}, any matching bank transaction history will be removed, and a reconciliation note will be recorded. No missing account balance can be adjusted.`))return;
      data.cashBalance=Math.round(((Number(data.cashBalance)||0)+transferAmount)*100)/100;
      data.bankRecords=data.bankRecords.filter(br=>String(br.linkId)!==String(r.id));
      data.collectionRecords.unshift({id:Date.now()+Math.random(),date:r.date||today(),type:"Orphaned Transfer Deleted",category:"Bank Transfer",amount:transferAmount,note:`Transfer deleted and Cash on Hand restored. Linked account “${r.linkedBankAccount||"unknown"}” was missing; bank-side balance could not be adjusted.`});
    }else{
      if(Number(account.balance||0)<transferAmount)return toast("Cannot delete this transfer because the bank account does not have enough balance to reverse it.");
      data.cashBalance=(Number(data.cashBalance)||0)+transferAmount;account.balance=(Number(account.balance)||0)-transferAmount;
      const linked=data.bankRecords.find(br=>String(br.linkId)===String(r.id));if(linked)data.bankRecords=data.bankRecords.filter(br=>String(br.linkId)!==String(r.id));
    }
  }else{
    const shares=r.allocationShares||(()=>{const s={};let allocated=0;COLLECTION_SPLITS.forEach(([name,pct],idx)=>{const part=idx===COLLECTION_SPLITS.length-1?Math.round((amount-allocated)*100)/100:Math.round((amount*pct/100)*100)/100;allocated+=part;s[name]=part;});return s;})();
    const shortfalls=[];
    for(const [name,shareRaw] of Object.entries(shares)){const share=Number(shareRaw)||0;const available=Number(data.collectionAllocations[name])||0;if(available-share < -0.005)shortfalls.push(`${name}: ${peso(share-available)}`);}
    const cashShortfall=(Number(data.cashBalance)||0)-amount < -0.005;
    const collectionShortfall=(Number(data.collectionBalance)||0)-amount < -0.005;
    if(shortfalls.length||cashShortfall||collectionShortfall){
      const details=[...shortfalls,...(cashShortfall?[`Cash on Hand shortfall: ${peso(amount-(Number(data.cashBalance)||0))}`]:[]),...(collectionShortfall?[`Collection balance shortfall: ${peso(amount-(Number(data.collectionBalance)||0))}`]:[])].join("\n");
      if(!confirm(`This collection has already been partly used, so a normal reversal would make one or more balances negative.\n\nDelete anyway and reconcile automatically?\n${details}\n\nThe collection and linked history will be removed, available balances will be floored at ₱0.00 where needed, and a reconciliation note will preserve the shortfall details.`))return;
      data.cashBalance=Math.max(0,Math.round(((Number(data.cashBalance)||0)-amount)*100)/100);
      data.collectionBalance=Math.max(0,Math.round(((Number(data.collectionBalance)||0)-amount)*100)/100);
      for(const [name,shareRaw] of Object.entries(shares)){const share=Number(shareRaw)||0;const before=Number(data.collectionAllocations[name])||0;data.collectionAllocations[name]=Math.max(0,Math.round((before-share)*100)/100);}
      if(r.id!==undefined)data.collectionRecords=data.collectionRecords.filter(cr=>String(cr.cashRecordId)!==String(r.id));
      data.collectionRecords.unshift({id:Date.now()+Math.random(),date:r.date||today(),type:"Collection Deletion Reconciliation",category:r.type||"Collection",amount:-amount,note:`Collection deleted with reconciliation. ${details}`});
    }else{
      data.cashBalance=Math.round(((Number(data.cashBalance)||0)-amount)*100)/100;
      data.collectionBalance=Math.round(((Number(data.collectionBalance)||0)-amount)*100)/100;
      for(const [name,shareRaw] of Object.entries(shares))data.collectionAllocations[name]=Math.round(((Number(data.collectionAllocations[name])||0)-(Number(shareRaw)||0))*100)/100;
      if(r.id!==undefined)data.collectionRecords=data.collectionRecords.filter(cr=>String(cr.cashRecordId)!==String(r.id));
      data.collectionRecords.unshift({id:Date.now()+Math.random(),date:r.date||today(),type:"Cash Record Deleted",category:r.type||"Collection",amount:-amount,note:"Collection deleted and allocation balances reversed."});
    }
  }
  data.cashRecords.splice(i,1);persist();toast("Cash record deleted and Activity Allocation Balances refreshed.");
}
function deleteCollectionRecord(i){
  const r=data.collectionRecords[i];if(!r)return;
  if(r.type==="Collection Allocation" && r.cashRecordId!==undefined){
    const cashIndex=data.cashRecords.findIndex(cr=>String(cr.id)===String(r.cashRecordId));
    if(cashIndex<0)return toast("The original cash record could not be found; this history row was not deleted.");
    return deleteCashRecord(cashIndex);
  }
  if(r.activityId!==undefined){
    const activityIndex=data.activities.findIndex(ar=>String(ar.id)===String(r.activityId));
    if(activityIndex>=0)return deleteActivityRecord(activityIndex);
  }
  if(r.type==="Allocation Override"){
    if(!confirm("Delete this allocation override history record and reverse its balance adjustment?"))return;
    const delta=Number(r.amount)||0;
    data.collectionAllocations[r.category]=(Number(data.collectionAllocations[r.category])||0)-delta;
    data.collectionBalance=(Number(data.collectionBalance)||0)-delta;
    data.collectionRecords.splice(i,1);persist();toast("Allocation override removed and balances refreshed.");return;
  }
  if(!confirm("Delete this history record? This removes the history row only; it will not change balances because no linked source record is available."))return;
  data.collectionRecords.splice(i,1);persist();toast("History record deleted.");
}
function toggleOperationInfo(event, tipId){
 const button=event.currentTarget;
 const tip=document.getElementById(tipId);
 if(!button||!tip)return;
 const willOpen=tip.hidden;
 document.querySelectorAll('.operation-info-tip').forEach(el=>{el.hidden=true;});
 document.querySelectorAll('.operation-title .heading-info-icon').forEach(el=>el.setAttribute('aria-expanded','false'));
 tip.hidden=!willOpen;
 button.setAttribute('aria-expanded',String(willOpen));
}
function toggleAllocationInfo(event){
 const button=event.currentTarget;
 const tip=document.getElementById('allocationInfoTip');
 if(!button||!tip)return;
 const open=tip.hidden;
 tip.hidden=!open;
 button.setAttribute('aria-expanded',String(open));
}
function renderCollectionPanels(){
 const allocationDisplayOrder=['Pastor’s Allocation','Church Administrator','Music Director','Church Anniversary','Food Ministry','Maintenance','Other’s'];
 const displaySplits=[...COLLECTION_SPLITS].sort((a,b)=>allocationDisplayOrder.indexOf(a[0])-allocationDisplayOrder.indexOf(b[0]));
 const alloc=document.getElementById('collectionAllocations');if(alloc)alloc.innerHTML=displaySplits.map(([name,pct])=>{const balance=Number(data.collectionAllocations[name])||0;const spent=data.activities.filter(r=>r.activity===name).reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);const assigned= Math.round(balance*100)/100;return `<div class="allocation-item"><div class="allocation-card-head"><strong>${esc(name)}</strong><span class="allocation-percent">${pct}%</span></div><div class="allocation-metrics"><div><small>Assigned share (${pct}%) · available</small><b title="${peso(assigned)}">${pesoCompact(assigned)}</b></div><div><small>Spent · recorded expenses</small><b class="spent-value" title="${peso(spent)}">${pesoCompact(spent)}</b></div></div><div class="allocation-actions"><button class="btn secondary" data-allocation-name="${esc(name)}" onclick="openAllocationOverride(this.dataset.allocationName)">Override amount</button></div></div>`}).join('');
 const rec=document.getElementById('collectionRecords');if(rec)rec.innerHTML=data.collectionRecords.slice(0,60).map((r,i)=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.category||r.type||'')}</td><td class="${Number(r.amount)>=0?'positive':'negative'}">${Number(r.amount)>=0?'+':''}${peso(r.amount)}</td><td>${esc(r.type||'')} — ${esc(r.note||'')}</td><td><button class="btn danger" onclick="deleteCollectionRecord(${i})">Delete</button></td></tr>`).join('')||emptyRow(5);
 const bankSel=document.getElementById('cashTransferBank');if(bankSel){const old=bankSel.value;bankSel.innerHTML='<option value="">Select bank account</option>'+data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');if([...bankSel.options].some(o=>o.value===old))bankSel.value=old;}
}
function openCashEdit(i){const r=data.cashRecords[i];if(!r)return;if(r.type==='Cash Transferred to Bank'&&!r.linkedBankAccount)return toast('This older transfer has no linked bank reference; edit its note/date only by contacting your administrator.');document.getElementById('editCashIndex').value=i;document.getElementById('editCashDate').value=r.date||today();document.getElementById('editCashType').value=['Offering','Donation'].includes(r.type)?r.type:'Cash Transferred to Bank';document.getElementById('editCashAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editCashCorrection').value='';openModal('cashEditModal')}
function saveCashEdit(){const i=Number(document.getElementById('editCashIndex').value),r=data.cashRecords[i];if(!r)return;const date=document.getElementById('editCashDate').value,amt=Number(document.getElementById('editCashAmount').value),correction=document.getElementById('editCashCorrection').value.trim(),newType=document.getElementById('editCashType').value;if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the cash record date.');if(!Number.isFinite(amt)||amt<=0)return toast('Enter a valid amount.');const oldAmt=Number(r.amount)||0;
 if(r.type==='Cash Transferred to Bank'){const delta=amt-Math.abs(oldAmt);const account=data.accounts.find(a=>a.name===r.linkedBankAccount);if(!account)return toast('Linked bank account was not found.');if(delta>data.cashBalance)return toast('Not enough cash to increase this transfer.');data.cashBalance-=delta;account.balance+=delta;const br=data.bankRecords.find(x=>x.linkId===r.id);if(br){br.amount+=delta;br.date=date;br.note=(br.note||'')+` | Correction: ${correction}`;}r.amount=-amt;}
 else {const delta=amt-oldAmt;if(data.cashBalance+delta<0||data.collectionBalance+delta<0)return toast('Correction would make a cash or collection balance negative.');if(delta<0){for(const [name,pct] of COLLECTION_SPLITS){const reduction=Math.round((-delta*pct/100)*100)/100;if((Number(data.collectionAllocations[name])||0)<reduction)return toast('Cannot reduce this collection: some allocated funds have already been used.');}}data.cashBalance+=delta;data.collectionBalance+=delta;COLLECTION_SPLITS.forEach(([name,pct])=>{const share=Math.round((delta*pct/100)*100)/100;data.collectionAllocations[name]=(Number(data.collectionAllocations[name])||0)+share;});r.amount=amt;r.type=newType;}
 r.date=date;r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;closeModal('cashEditModal');persist();toast('Cash record updated with correction note.')}
function deleteBankRecord(i){const r=data.bankRecords[i];if(!r)return;if(!confirm(`Delete this bank record (${r.type||"transaction"}) for ${peso(r.amount)}? The linked account balance will be adjusted.`))return;const account=data.accounts.find(a=>String(a.name)===String(r.account));if(account){const delta=-(Number(r.amount)||0);if(Number(account.balance)+delta < -0.005)return toast("This record cannot be deleted because it would make the bank balance negative.");account.balance=Math.round((Number(account.balance)+delta)*100)/100;}if(r.activityId){const ai=data.activities.findIndex(a=>String(a.id)===String(r.activityId));if(ai>=0){const activity=data.activities[ai];const amount=Math.abs(Number(activity.amount)||0);const source=activity.sourceKey||"";if(source==="cash"){data.cashBalance+=amount;data.collectionBalance+=amount;data.collectionAllocations[activity.activity]=(Number(data.collectionAllocations[activity.activity])||0)+amount;}data.activities.splice(ai,1);}}if(r.linkId){const cashRec=data.cashRecords.find(cr=>String(cr.id)===String(r.linkId));if(cashRec&&cashRec.type==="Cash Transferred to Bank"){data.cashBalance+=Math.abs(Number(cashRec.amount)||0);data.cashRecords=data.cashRecords.filter(cr=>cr!==cashRec);}data.bankRecords=data.bankRecords.filter(x=>x.linkId!==r.linkId);}else{data.bankRecords.splice(i,1);}persist();toast("Bank record deleted and balances refreshed.")}
function openBankEdit(i){const r=data.bankRecords[i];if(!r)return;document.getElementById('editBankIndex').value=i;document.getElementById('editBankDate').value=r.date||today();document.getElementById('editBankAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editBankDirection').value=Number(r.amount)<0?'out':'in';document.getElementById('editBankCorrection').value='';openModal('bankEditModal')}
function saveBankEdit(){const i=Number(document.getElementById('editBankIndex').value),r=data.bankRecords[i];if(!r)return;const date=document.getElementById('editBankDate').value,amount=Number(document.getElementById('editBankAmount').value),direction=document.getElementById('editBankDirection').value,correction=document.getElementById('editBankCorrection').value.trim();if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the record date.');if(!Number.isFinite(amount)||amount<=0)return toast('Enter an amount greater than ₱0.00.');const newAmount=direction==='out'?-amount:amount;const account=data.accounts.find(a=>a.name===r.account);const delta=newAmount-(Number(r.amount)||0);if(account&&Number(account.balance)+delta<0)return toast('Correction would make the bank balance negative.');if(account)account.balance=Number(account.balance)+delta;r.amount=newAmount;r.date=date;r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;persist();closeModal('bankEditModal');toast('Bank record updated with correction note.')}
function openActivityEdit(i){const r=data.activities[i];if(!r)return;document.getElementById('editActivityIndex').value=i;document.getElementById('editActivityType').value=r.activity;document.getElementById('editActivityDate').value=r.date||today();document.getElementById('editActivityAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editActivitySource').value=r.sourceKey||(r.source==='Church Collection'?'collection':'cash');document.getElementById('editActivityCorrection').value='';openModal('activityEditModal')}
function saveActivityEdit(){const i=Number(document.getElementById('editActivityIndex').value),r=data.activities[i];if(!r)return;const type=document.getElementById('editActivityType').value,date=document.getElementById('editActivityDate').value,amt=Number(document.getElementById('editActivityAmount').value),source=document.getElementById('editActivitySource').value,correction=document.getElementById('editActivityCorrection').value.trim();if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the activity record date.');if(!Number.isFinite(amt)||amt<=0)return toast('Enter a valid amount.');const oldType=r.activity,oldAmt=Math.abs(Number(r.amount)||0),oldSource=r.sourceKey||'cash';data.collectionAllocations[oldType]=(Number(data.collectionAllocations[oldType])||0)+oldAmt;data.collectionBalance+=oldAmt;if(oldSource==='cash')data.cashBalance+=oldAmt;if(amt>Number(data.collectionAllocations[type]||0)){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds available allocation.');}if(source==='cash'&&amt>data.cashBalance){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds Cash on Hand.');}if(source==='collection'&&amt>data.collectionBalance){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds Church Collection.');}data.collectionAllocations[type]-=amt;data.collectionBalance-=amt;if(source==='cash')data.cashBalance-=amt;r.activity=type;r.date=date;r.amount=-amt;r.sourceKey=source;r.source=source==='cash'?'Grace Giving – Cash on Hand':'Church Collection';r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;persist();closeModal('activityEditModal');toast('Activity record updated with correction note.')}


function toggleLiveOverview(){
 const backdrop=document.getElementById('liveOverviewBackdrop');
 if(!backdrop)return;
 if(backdrop.hidden)openLiveOverview();else closeLiveOverview();
}
function openLiveOverview(){
 const backdrop=document.getElementById('liveOverviewBackdrop');if(!backdrop)return;
 backdrop.hidden=false;backdrop.setAttribute('aria-hidden','false');
 document.getElementById('liveOverviewToggle')?.setAttribute('aria-expanded','true');
 renderLiveOverview();
}
function closeLiveOverview(){
 const backdrop=document.getElementById('liveOverviewBackdrop');if(!backdrop)return;
 backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');
 document.getElementById('liveOverviewToggle')?.setAttribute('aria-expanded','false');
}
function setLiveOverviewTab(tab){
 document.querySelectorAll('[data-overview-tab]').forEach(b=>b.classList.toggle('active',b.dataset.overviewTab===tab));
 document.querySelectorAll('[data-overview-section]').forEach(s=>s.classList.toggle('active',s.dataset.overviewSection===tab));
}
function renderLiveOverview(){
 const backdrop=document.getElementById('liveOverviewBackdrop');if(!backdrop)return;
 const order=['Pastor’s Allocation','Church Administrator','Music Director','Church Anniversary','Food Ministry','Maintenance','Other’s'];
 const splitMap=new Map((typeof COLLECTION_SPLITS!=='undefined'?COLLECTION_SPLITS:[]));
 const names=order.filter(n=>splitMap.has(n));
 const total=names.reduce((sum,n)=>sum+(Number(data.collectionAllocations?.[n])||0),0);
 const alloc=document.getElementById('liveOverviewAllocations');
 if(alloc)alloc.innerHTML=`<div class="live-section-heading"><h3>♟ Allocation Balances</h3><strong>Total Available: ${peso(total)}</strong></div><div class="live-allocation-list">${names.map(name=>{const pct=splitMap.get(name)||0;const amount=Number(data.collectionAllocations?.[name])||0;const spent=(data.activities||[]).filter(r=>r.activity===name).reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);const width=total>0?Math.max(0,Math.min(100,amount/total*100)):0;return `<div class="live-allocation-row"><span class="live-category-icon">${name.includes('Pastor')?'♟':name.includes('Administrator')?'▦':name.includes('Music')?'♫':name.includes('Anniversary')?'▤':name.includes('Food')?'♨':name.includes('Maintenance')?'⚒':'•••'}</span><div class="live-allocation-name"><b>${esc(name)}</b><small>Spent ${peso(spent)}</small></div><div class="live-progress"><span style="width:${width}%"></span></div><span class="live-percent">${pct}%</span><strong class="live-money">${peso(amount)}</strong></div>`}).join('')||'<p class="empty-state">No allocation balances available.</p>'}</div>`;
 const banks=document.getElementById('liveOverviewBanks');const bankTotal=(data.accounts||[]).reduce((sum,a)=>sum+(Number(a.balance)||0),0);
 if(banks)banks.innerHTML=`<div class="live-section-heading"><h3>▤ Bank Accounts</h3><strong>Total Bank Balance: ${peso(bankTotal)}</strong></div><div class="live-bank-list">${(data.accounts||[]).map(a=>`<div class="live-bank-row"><span class="live-category-icon">▤</span><b>${esc(a.name)}</b><strong>${peso(a.balance)}</strong></div>`).join('')||'<p class="empty-state">No bank accounts registered yet.</p>'}</div><div class="live-cash-balance"><span>Cash on Hand</span><strong>${peso(data.cashBalance)}</strong></div>`;
 const activity=document.getElementById('liveOverviewActivity');
 const logs=(data.auditLog||[]).slice(0,100);
 if(activity)activity.innerHTML=`<div class="live-section-heading"><h3>◷ Recent Activity <span class="live-pill">Live</span></h3><span>${logs.length} recent actions</span></div><div class="live-activity-list">${logs.map(r=>`<div class="live-activity-row"><i class="live-status-dot"></i><time>${esc(r.date||'')} ${esc(r.time||'')}</time><span>${esc(r.action||'Action recorded')}</span><small>${esc(r.section||'Application')}</small></div>`).join('')||'<p class="empty-state">Actions will appear here as you use the tracker.</p>'}</div>`;
}

function toggleSidebar(forceState){
 const layout=document.querySelector('.layout');
 const buttons=document.querySelectorAll('#sidebarToggle');
 const sidebar=document.getElementById('mainSidebar');
 if(!layout||!buttons.length||!sidebar)return;
 const compact=typeof forceState==='boolean'?!forceState:!layout.classList.contains('sidebar-collapsed');
 layout.classList.toggle('sidebar-collapsed',compact);
 buttons.forEach(button=>{button.textContent='◧';button.setAttribute('aria-expanded',String(!compact));button.title=compact?'Expand sidebar':'Collapse sidebar';button.setAttribute('aria-label',button.title)});
 sidebar.querySelectorAll('.nav-btn').forEach(nav=>{
   if(!nav.dataset.fullLabel)nav.dataset.fullLabel=nav.innerText.trim();
   const full=nav.dataset.fullLabel;
   const icon=(full.match(/^[^\s]+/)||['•'])[0];
   nav.innerHTML=compact?`<span class="nav-icon-only">${icon}</span>`:full;
   nav.title=compact?full:'';
   nav.setAttribute('aria-label',full);
 });
 const info=sidebar.querySelector('.sidebar-help');if(info)info.style.display=compact?'none':'';
 try{localStorage.setItem('churchFinanceSidebarCollapsed',compact?'1':'0')}catch(_){}
}
function restoreSidebarState(){
 try{if(localStorage.getItem('churchFinanceSidebarCollapsed')==='1')toggleSidebar(false)}catch(_){}
}

document.addEventListener("DOMContentLoaded",()=>{
  restoreSidebarState();
  updateActivityFormHint();
  ["cashDate","cashTransferDate","activityDate","bankTxDate","savingsDate"].forEach(id=>{const el=document.getElementById(id);if(el&&!el.value)el.value=today();});
  // Add an obvious, keyboard-accessible calendar button beside every date field,
  // including date fields inside edit modals that are created in the page markup.
  document.querySelectorAll('input[type="date"]').forEach((input)=>{
    if(input.dataset.calendarButtonAdded) return;
    input.dataset.calendarButtonAdded='true';
    const label=input.closest('label');
    if(label) label.classList.add('date-field-label');
    const button=document.createElement('button');
    button.type='button'; button.className='date-picker-button';
    button.setAttribute('aria-label','Open date picker'); button.title='Choose date';
    button.innerHTML='<span aria-hidden="true">▦</span><span class="date-picker-button-text">Choose date</span>';
    button.addEventListener('click',()=>{
      try {
        if(typeof input.showPicker==='function') input.showPicker();
        else { input.focus(); input.click(); }
      } catch (_) { input.focus(); input.click(); }
    });
    input.insertAdjacentElement('afterend',button);
  });
});
renderAll();setSavingsView("selected");


document.addEventListener('click',event=>{
 const wrap=document.querySelector('#activities .allocation-heading-wrap');
 const tip=document.getElementById('allocationInfoTip');
 const button=wrap?.querySelector('.heading-info-icon');
 if(wrap&&tip&&button&&!wrap.contains(event.target)){tip.hidden=true;button.setAttribute('aria-expanded','false');}
});

// Timestamped audit trail for user-triggered controls. Stored with the local prototype data and included in backups/exports.
document.addEventListener('click',function(event){
 const control=event.target.closest('button, input[type="submit"], input[type="button"]');if(!control)return;
 const label=(control.innerText||control.value||control.getAttribute('aria-label')||control.title||'App control').replace(/\s+/g,' ').trim();
 if(!label||label==='×')return;
 const page=document.querySelector('.page.active');const section=page?.querySelector('.page-head h1')?.innerText?.trim()||page?.id||'Application';
 const now=new Date();const entry={date:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,time:now.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}),action:label,section};
 data.auditLog=Array.isArray(data.auditLog)?data.auditLog:[];data.auditLog.unshift(entry);data.auditLog=data.auditLog.slice(0,5000);
 try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){};
 const body=document.getElementById('auditLogRows');if(body)body.innerHTML=data.auditLog.slice(0,200).map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.time||'')}</td><td>${esc(r.action||'')}</td><td>${esc(r.section||'')}</td></tr>`).join('')||emptyRow(4);
 renderLiveOverview();
});

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('liveOverviewBackdrop')?.hidden)closeLiveOverview();});
// The live overview launcher is draggable and remembers its position locally.
(function makeLiveOverviewLauncherMovable(){
 const fab=document.getElementById('liveOverviewToggle');if(!fab)return;
 try{const saved=JSON.parse(localStorage.getItem('churchFinanceOverviewFabPosition')||'null');if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.top)){fab.style.left=`${Math.max(0,Math.min(innerWidth-54,saved.left))}px`;fab.style.top=`${Math.max(0,Math.min(innerHeight-54,saved.top))}px`;fab.style.right='auto';fab.style.bottom='auto';}}catch(_){}
 let startX=0,startY=0,origLeft=0,origTop=0,moved=false,dragging=false;
 fab.addEventListener('pointerdown',e=>{if(e.button!==0)return;const rect=fab.getBoundingClientRect();startX=e.clientX;startY=e.clientY;origLeft=rect.left;origTop=rect.top;moved=false;dragging=true;fab.setPointerCapture?.(e.pointerId);});
 fab.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;if(!moved)return;const left=Math.max(0,Math.min(innerWidth-fab.offsetWidth,origLeft+dx)),top=Math.max(0,Math.min(innerHeight-fab.offsetHeight,origTop+dy));fab.style.left=`${left}px`;fab.style.top=`${top}px`;fab.style.right='auto';fab.style.bottom='auto';});
 fab.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;if(moved){try{const r=fab.getBoundingClientRect();localStorage.setItem('churchFinanceOverviewFabPosition',JSON.stringify({left:r.left,top:r.top}));}catch(_){}fab.dataset.dragged='1';setTimeout(()=>delete fab.dataset.dragged,80);}});
 fab.addEventListener('click',e=>{if(fab.dataset.dragged==='1'){e.preventDefault();e.stopImmediatePropagation();}} ,true);
 window.addEventListener('resize',()=>{const r=fab.getBoundingClientRect();if(r.right>innerWidth)fab.style.left=`${Math.max(0,innerWidth-fab.offsetWidth-8)}px`;if(r.bottom>innerHeight)fab.style.top=`${Math.max(0,innerHeight-fab.offsetHeight-8)}px`;});
})();
// Keep the floating read-only overview fresh after app state renders.
const _originalRenderAll=renderAll;
renderAll=function(){_originalRenderAll();if(!document.getElementById('liveOverviewBackdrop')?.hidden)renderLiveOverview();};
