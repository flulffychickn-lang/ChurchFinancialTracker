const KEY="churchFinancePrototypeV1";
let data = JSON.parse(localStorage.getItem(KEY) || "null") || {
  accounts:[
    {id:1,name:"Church Savings Account",balance:0},
    {id:2,name:"Church Operating Account",balance:0}
  ],
  bankRecords:[],
  cashBalance:0,
  cashRecords:[],
  activities:[],
  members:[
    
  ],
  savingsRecords:[
    
  ]
};
// Normalize older saved records so rendering never fails on missing collections.
data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
data.bankRecords = Array.isArray(data.bankRecords) ? data.bankRecords : [];
data.members = Array.isArray(data.members) ? data.members : [];
data.savingsRecords = Array.isArray(data.savingsRecords) ? data.savingsRecords : [];
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
function peso(n){return "₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.className="toast show";setTimeout(()=>t.className="toast",2800)}
function go(page){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(page).classList.add("active");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));window.scrollTo({top:0,behavior:"smooth"})}
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
  data.accounts=data.accounts.filter(x=>String(x.id)!==String(id)); persist(); toast("Bank account removed. Historical records were kept.");
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
  ["bankAccount","bankDestination"].forEach(id=>{const el=document.getElementById(id);if(el){const old=el.value;el.innerHTML=opts;if([...el.options].some(o=>o.value===old))el.value=old;}});
  const activitySource=document.getElementById("activitySource");
  if(activitySource){const old=activitySource.value;activitySource.innerHTML='<option value="cash">Grace Giving – Cash on Hand</option>'+data.accounts.map(a=>`<option value="bank:${a.id}">${esc(a.name)}</option>`).join("");if([...activitySource.options].some(o=>o.value===old))activitySource.value=old;}
  const memberOpts=data.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  ["savingsMember","memberRecordSelect"].forEach(id=>{const el=document.getElementById(id);if(el){const old=el.value;el.innerHTML=(id==="memberRecordSelect"?'<option value="">Select a registered member</option>':'<option value="">Select a member</option>')+memberOpts;if([...el.options].some(o=>o.value===old))el.value=old;}});
}
function openBankTx(type){
  fillAccountSelects();document.getElementById("bankTxDate").value=today();document.getElementById("bankTxType").value=type;document.getElementById("bankModalTitle").textContent=type==="Transfer"?"Fast Bank Transfer":type+" Bank Balance";toggleDest();openModal("bankModal")
}
document.getElementById("bankTxType").addEventListener("change",toggleDest);
function toggleDest(){document.getElementById("destWrap").style.display=document.getElementById("bankTxType").value==="Transfer"?"flex":"none"}
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
  if(!Number.isFinite(amt)||amt<0||(amt===0&&type!=="Adjustment"))return toast("Please enter a valid amount greater than zero.");
  const a=data.accounts.find(x=>Number(x.id)===id);
  if(!a)return toast("Selected bank account was not found. Please reopen the form.");
  a.balance=Number(a.balance)||0;
  if(type==="Deposit"){
    a.balance+=amt;data.bankRecords.unshift({id:Date.now()+Math.random(),date,type,account:a.name,amount:amt,note:note||"Bank deposit"});
  }else if(type==="Withdrawal"){
    if(a.balance<amt)return toast("Withdrawal is greater than the bank balance.");
    a.balance-=amt;data.bankRecords.unshift({id:Date.now()+Math.random(),date,type,account:a.name,amount:-amt,note:note||"Bank withdrawal"});
  }else if(type==="Transfer"){
    const d=data.accounts.find(x=>Number(x.id)===dest);if(!d||Number(d.id)===Number(a.id))return toast("Choose a different destination account.");
    if(a.balance<amt)return toast("Transfer is greater than the source balance.");
    d.balance=Number(d.balance)||0;a.balance-=amt;d.balance+=amt;
    data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Transfer Out",account:a.name,amount:-amt,note:"To "+d.name+(note?" — "+note:"")});
    data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Transfer In",account:d.name,amount:amt,note:"From "+a.name+(note?" — "+note:"")});
  }else if(type==="Adjustment"){
    const diff=amt-a.balance;a.balance=amt;
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
  data.cashBalance=(Number(data.cashBalance)||0)+amt;data.collectionBalance=(Number(data.collectionBalance)||0)+amt;
  const rec={id:Date.now()+Math.random(),date,type,amount:amt,note};data.cashRecords.unshift(rec);
  // Allocate the full recorded collection across activity budgets immediately.
  let allocated=0;
  COLLECTION_SPLITS.forEach(([name,pct],i)=>{const share=i===COLLECTION_SPLITS.length-1?Math.round((amt-allocated)*100)/100:Math.round((amt*pct/100)*100)/100;allocated+=share;data.collectionAllocations[name]=(Number(data.collectionAllocations[name])||0)+share;data.collectionRecords.unshift({id:Date.now()+Math.random(),date,type:"Collection Allocation",category:name,amount:share,note:`${type} distribution (${pct}%)`});});
  document.getElementById("cashAmount").value="";document.getElementById("cashNote").value="";persist();toast(`${type} recorded and allocated to Church Activities.`);
}
function selectActivity(name){const el=document.getElementById("activityType");if(el)el.value=name;updateActivityFormHint();document.getElementById("activityAmount")?.focus()}
function updateActivityFormHint(){const type=document.getElementById("activityType")?.value||"";const special=["Pastor’s Allocation","Music Director"].includes(type);const label=document.getElementById("activityPurposeLabel");if(label){label.innerHTML=special?'Description (optional)<input id="activityNote" placeholder="Optional takeaway details">':'<span class="required-label-text">Purpose</span><input id="activityNote" required placeholder="What was this expense for?">';}const source=document.getElementById("activitySource");if(special&&source)source.value="cash";const hint=document.getElementById("activityFormHint");if(hint)hint.textContent=special?"Record the withdrawal date and amount taken from this allocation. Paid from Grace Giving – Cash on Hand; description is optional.":"Enter the purpose, date, amount, and payment source. The selected activity balance will decrease.";}
function saveActivity(){
  const type=document.getElementById("activityType").value,raw=String(document.getElementById("activityAmount").value??"").trim(),amt=Number(raw),note=document.getElementById("activityNote").value.trim(),date=document.getElementById("activityDate")?.value,source=document.getElementById("activitySource")?.value||"cash";
  const special=["Pastor’s Allocation","Music Director"].includes(type);
  if(!date)return toast("Select the activity date.");
  if(!raw||!Number.isFinite(amt)||amt<=0)return toast("Enter an expense or takeaway amount greater than zero.");
  if(!special&&!note)return toast("Purpose is required for activity expenses.");
  const available=Number(data.collectionAllocations[type]||0);if(amt>available)return toast("Amount exceeds the available allocation for this activity.");
  if(source==="cash"&&amt>Number(data.cashBalance||0))return toast("Amount exceeds Grace Giving – Cash on Hand.");
  if(source.startsWith("bank:") ){const account=data.accounts.find(a=>String(a.id)===source.slice(5));if(!account)return toast("Select a valid bank account.");if(amt>Number(account.balance||0))return toast("Amount exceeds the selected bank account balance.");}
  data.collectionAllocations[type]=available-amt;
  data.collectionBalance-=amt;if(source==="cash")data.cashBalance-=amt;
  let sourceLabel="Grace Giving – Cash on Hand";
  if(source.startsWith("bank:")){const account=data.accounts.find(a=>String(a.id)===source.slice(5));account.balance-=amt;sourceLabel=account.name;data.bankRecords.unshift({id:Date.now()+Math.random(),date,type:"Activity Expense",account:account.name,amount:-amt,note:note||type,activityId:null});}
  const r={id:Date.now()+Math.random(),date,activity:type,amount:-amt,source:sourceLabel,sourceKey:source,note,recordType:special?"Takeaway / Withdrawal":"Activity Expense"};
  data.activities.unshift(r);data.collectionRecords.unshift({id:Date.now()+Math.random(),date,type:r.recordType,category:type,amount:-amt,note:note||"Takeaway recorded"});
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
  ["dashSavings","savingsTotal","reportSavings"].forEach(id=>setTextIfPresent(id,peso(savings)));
  setTextIfPresent("memberCount",data.members.length);
  setHtmlIfPresent("bankAccounts",data.accounts.map(a=>`<div class="account-row"><div><strong>${esc(a.name)}</strong><small>Current balance</small></div><strong>${peso(a.balance)}</strong><div class="button-row"><button class="btn secondary" onclick="renameAccount(${JSON.stringify(a.id)})" title="Update account name" aria-label="Update account name">✎</button><button class="btn secondary" onclick="removeAccount(${JSON.stringify(a.id)})">Remove</button></div></div>`).join("")||`<p class="empty-state">No bank accounts registered yet. Select <strong>Add Bank Account</strong> to create one.</p>`);
  setHtmlIfPresent("bankRecords",data.bankRecords.slice(0,50).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td>${esc(r.account||"")}</td><td class="${Number(r.amount)>=0?"positive":"negative"}">${Number(r.amount)>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openBankEdit(${i})">Update</button></td></tr>`).join("")||emptyRow(6));
  setHtmlIfPresent("cashRecords",data.cashRecords.slice(0,100).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td class="${Number(r.amount)>=0?"positive":"negative"}">${Number(r.amount)>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openCashEdit(${i})">Update</button></td></tr>`).join("")||emptyRow(5));
  setHtmlIfPresent("activityRecords",data.activities.slice(0,100).map((r,i)=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.activity||"")}</td><td class="negative">${peso(r.amount)}</td><td>${esc(r.source||"")}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openActivityEdit(${i})">Update</button></td></tr>`).join("")||emptyRow(6));
  renderSavings();toggleDest();renderCollectionPanels();
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
  if(section==="savings"){
    const records=sortChronological(data.savingsRecords);
    const total=data.members.reduce((sum,m)=>sum+(Number(m.balance)||0),0);
    rows=[["Date","Member","Type","Amount (PHP)","Note","Balance (PHP)"],...records.map(r=>{const m=data.members.find(x=>x.id===r.memberId);return [r.date,m?.name||r.memberName||"Removed member",r.type,r.amount,r.note||"",r.balance]})];
    rows.push([],["TOTAL SAVINGS (ALL MEMBERS)","","","",total,total]);
  }
  const csv=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(csv,`church_${section}_report.csv`,"text/csv;charset=utf-8");
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
 const csv=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
 downloadBlob(csv,`fun_savings_${m.name.replace(/[^a-z0-9_-]+/gi,"_")}_report.csv`,"text/csv;charset=utf-8");
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
let COLLECTION_SPLITS=[['Pastor’s Allocation',40],['Church Anniversary',20],['Music Director',5],['Maintenance',10],['Food Ministry',10],['Other’s',15]];
data.collectionBalance=Number(data.collectionBalance)||0;
data.collectionAllocations=data.collectionAllocations||Object.fromEntries(COLLECTION_SPLITS.map(([n])=>[n,0]));
if(data.collectionAllocations['Christmas and Anniversary']!==undefined && data.collectionAllocations['Church Anniversary']===undefined){data.collectionAllocations['Church Anniversary']=Number(data.collectionAllocations['Christmas and Anniversary'])||0;delete data.collectionAllocations['Christmas and Anniversary'];}
data.collectionRecords=Array.isArray(data.collectionRecords)?data.collectionRecords:[];
if(data.collectionPercentages && typeof data.collectionPercentages === "object") COLLECTION_SPLITS=COLLECTION_SPLITS.map(([n])=>[n,Number(data.collectionPercentages[n] ?? (n==='Church Anniversary'?data.collectionPercentages['Christmas and Anniversary']:0) ?? 0)]);
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
function showSectionInfo(){
  const active=document.querySelector(".nav-btn.active");
  const page=active?.dataset.page||"dashboard";
  const info=SECTION_INFO[page]||SECTION_INFO.dashboard;
  document.getElementById("sectionInfoTitle").textContent=info.title;
  document.getElementById("sectionInfoContent").innerHTML=info.body;
  openModal("instructionsModal");
}
function showInstructions(){showSectionInfo();}
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){
    const modal=document.getElementById("instructionsModal");
    if(modal?.classList.contains("open")) closeModal("instructionsModal");
  }
});
function transferCashToBank(){
  const id=Number(document.getElementById('cashTransferBank').value),raw=String(document.getElementById('cashTransferAmount').value||'').trim(),amt=Number(raw),a=data.accounts.find(x=>Number(x.id)===id),date=document.getElementById('cashTransferDate').value,note=document.getElementById('cashTransferNote').value.trim();
  if(!date)return toast('Select the transfer date.');if(!a)return toast('Select a bank account.');if(!raw||!Number.isFinite(amt)||amt<=0||amt>data.cashBalance)return toast('Enter an amount within Cash on Hand.');
  const linkId=Date.now()+Math.random();data.cashBalance-=amt;a.balance=(Number(a.balance)||0)+amt;
  data.cashRecords.unshift({id:linkId,date,type:'Cash Transferred to Bank',amount:-amt,note:note||'Deposited to '+a.name,linkedBankAccount:a.name});
  data.bankRecords.unshift({id:Date.now()+Math.random(),linkId,date,type:'Cash Deposit',account:a.name,amount:amt,note:note||'Transferred from Cash on Hand'});
  document.getElementById('cashTransferAmount').value='';document.getElementById('cashTransferNote').value='';persist();toast('Cash transfer recorded in both cash and bank records.');
}
function openAllocationSettings(){const host=document.getElementById('allocationInputs');host.innerHTML=COLLECTION_SPLITS.map(([name,pct],i)=>`<label>${esc(name)} (%)<input type="number" min="0" max="100" step="0.01" id="allocationPct${i}" value="${pct}"></label>`).join('');openModal('allocationModal')}
function saveAllocationSettings(){const vals=COLLECTION_SPLITS.map(([name],i)=>Number(document.getElementById(`allocationPct${i}`).value));if(vals.some(v=>!Number.isFinite(v)||v<0||v>100))return toast('Enter percentages from 0 to 100.');const total=vals.reduce((a,b)=>a+b,0);if(Math.abs(total-100)>0.001)return toast(`Percentages must total 100%. Current total: ${total.toFixed(2)}%.`);COLLECTION_SPLITS=COLLECTION_SPLITS.map(([n],i)=>[n,vals[i]]);data.collectionPercentages=Object.fromEntries(COLLECTION_SPLITS);closeModal('allocationModal');persist();toast('Allocation percentages saved for future collections.')}
function renderCollectionPanels(){
 const alloc=document.getElementById('collectionAllocations');if(alloc)alloc.innerHTML=COLLECTION_SPLITS.map(([name,pct])=>{const balance=Number(data.collectionAllocations[name])||0;const spent=data.activities.filter(r=>r.activity===name).reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0);return `<div class="allocation-item"><strong>${esc(name)}</strong><span>${pct}% allocation</span><b>Remaining: ${peso(balance)}</b><small>Recorded expenses/takeaways: ${peso(spent)}</small></div>`}).join('');
 const rec=document.getElementById('collectionRecords');if(rec)rec.innerHTML=data.collectionRecords.slice(0,60).map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.category||r.type||'')}</td><td class="${Number(r.amount)>=0?'positive':'negative'}">${Number(r.amount)>=0?'+':''}${peso(r.amount)}</td><td>${esc(r.type||'')} — ${esc(r.note||'')}</td></tr>`).join('')||emptyRow(4);
 const bankSel=document.getElementById('cashTransferBank');if(bankSel){const old=bankSel.value;bankSel.innerHTML='<option value="">Select bank account</option>'+data.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');if([...bankSel.options].some(o=>o.value===old))bankSel.value=old;}
}
function openCashEdit(i){const r=data.cashRecords[i];if(!r)return;if(r.type==='Cash Transferred to Bank'&&!r.linkedBankAccount)return toast('This older transfer has no linked bank reference; edit its note/date only by contacting your administrator.');document.getElementById('editCashIndex').value=i;document.getElementById('editCashDate').value=r.date||today();document.getElementById('editCashType').value=['Offering','Donation'].includes(r.type)?r.type:'Cash Transferred to Bank';document.getElementById('editCashAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editCashCorrection').value='';openModal('cashEditModal')}
function saveCashEdit(){const i=Number(document.getElementById('editCashIndex').value),r=data.cashRecords[i];if(!r)return;const date=document.getElementById('editCashDate').value,amt=Number(document.getElementById('editCashAmount').value),correction=document.getElementById('editCashCorrection').value.trim(),newType=document.getElementById('editCashType').value;if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the cash record date.');if(!Number.isFinite(amt)||amt<=0)return toast('Enter a valid amount.');const oldAmt=Number(r.amount)||0;
 if(r.type==='Cash Transferred to Bank'){const delta=amt-Math.abs(oldAmt);const account=data.accounts.find(a=>a.name===r.linkedBankAccount);if(!account)return toast('Linked bank account was not found.');if(delta>data.cashBalance)return toast('Not enough cash to increase this transfer.');data.cashBalance-=delta;account.balance+=delta;const br=data.bankRecords.find(x=>x.linkId===r.id);if(br){br.amount+=delta;br.date=date;br.note=(br.note||'')+` | Correction: ${correction}`;}r.amount=-amt;}
 else {const delta=amt-oldAmt;if(data.cashBalance+delta<0||data.collectionBalance+delta<0)return toast('Correction would make a cash or collection balance negative.');if(delta<0){for(const [name,pct] of COLLECTION_SPLITS){const reduction=Math.round((-delta*pct/100)*100)/100;if((Number(data.collectionAllocations[name])||0)<reduction)return toast('Cannot reduce this collection: some allocated funds have already been used.');}}data.cashBalance+=delta;data.collectionBalance+=delta;COLLECTION_SPLITS.forEach(([name,pct])=>{const share=Math.round((delta*pct/100)*100)/100;data.collectionAllocations[name]=(Number(data.collectionAllocations[name])||0)+share;});r.amount=amt;r.type=newType;}
 r.date=date;r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;closeModal('cashEditModal');persist();toast('Cash record updated with correction note.')}
function openBankEdit(i){const r=data.bankRecords[i];if(!r)return;document.getElementById('editBankIndex').value=i;document.getElementById('editBankDate').value=r.date||today();document.getElementById('editBankAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editBankDirection').value=Number(r.amount)<0?'out':'in';document.getElementById('editBankCorrection').value='';openModal('bankEditModal')}
function saveBankEdit(){const i=Number(document.getElementById('editBankIndex').value),r=data.bankRecords[i];if(!r)return;const date=document.getElementById('editBankDate').value,amount=Number(document.getElementById('editBankAmount').value),direction=document.getElementById('editBankDirection').value,correction=document.getElementById('editBankCorrection').value.trim();if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the record date.');if(!Number.isFinite(amount)||amount<=0)return toast('Enter an amount greater than ₱0.00.');const newAmount=direction==='out'?-amount:amount;const account=data.accounts.find(a=>a.name===r.account);const delta=newAmount-(Number(r.amount)||0);if(account&&Number(account.balance)+delta<0)return toast('Correction would make the bank balance negative.');if(account)account.balance=Number(account.balance)+delta;r.amount=newAmount;r.date=date;r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;persist();closeModal('bankEditModal');toast('Bank record updated with correction note.')}
function openActivityEdit(i){const r=data.activities[i];if(!r)return;document.getElementById('editActivityIndex').value=i;document.getElementById('editActivityType').value=r.activity;document.getElementById('editActivityDate').value=r.date||today();document.getElementById('editActivityAmount').value=Math.abs(Number(r.amount)||0);document.getElementById('editActivitySource').value=r.sourceKey||(r.source==='Church Collection'?'collection':'cash');document.getElementById('editActivityCorrection').value='';openModal('activityEditModal')}
function saveActivityEdit(){const i=Number(document.getElementById('editActivityIndex').value),r=data.activities[i];if(!r)return;const type=document.getElementById('editActivityType').value,date=document.getElementById('editActivityDate').value,amt=Number(document.getElementById('editActivityAmount').value),source=document.getElementById('editActivitySource').value,correction=document.getElementById('editActivityCorrection').value.trim();if(!correction)return toast('Correction note is required.');if(!date)return toast('Select the activity record date.');if(!Number.isFinite(amt)||amt<=0)return toast('Enter a valid amount.');const oldType=r.activity,oldAmt=Math.abs(Number(r.amount)||0),oldSource=r.sourceKey||'cash';data.collectionAllocations[oldType]=(Number(data.collectionAllocations[oldType])||0)+oldAmt;data.collectionBalance+=oldAmt;if(oldSource==='cash')data.cashBalance+=oldAmt;if(amt>Number(data.collectionAllocations[type]||0)){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds available allocation.');}if(source==='cash'&&amt>data.cashBalance){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds Cash on Hand.');}if(source==='collection'&&amt>data.collectionBalance){data.collectionAllocations[oldType]-=oldAmt;data.collectionBalance-=oldAmt;if(oldSource==='cash')data.cashBalance-=oldAmt;return toast('Corrected amount exceeds Church Collection.');}data.collectionAllocations[type]-=amt;data.collectionBalance-=amt;if(source==='cash')data.cashBalance-=amt;r.activity=type;r.date=date;r.amount=-amt;r.sourceKey=source;r.source=source==='cash'?'Grace Giving – Cash on Hand':'Church Collection';r.note=(r.note?`${r.note} | `:'')+`Correction: ${correction}`;persist();closeModal('activityEditModal');toast('Activity record updated with correction note.')}

document.addEventListener("DOMContentLoaded",()=>{
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
