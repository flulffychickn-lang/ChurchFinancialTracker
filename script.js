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
  ["bankAccount","bankDestination","activitySource"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
  const memberOpts=data.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  ["savingsMember","memberRecordSelect"].forEach(id=>{const el=document.getElementById(id);if(el){const old=el.value;el.innerHTML=(id==="memberRecordSelect"?'<option value="">Select a registered member</option>':'<option value="">Select a member</option>')+memberOpts;if([...el.options].some(o=>o.value===old))el.value=old;}});
}
function openBankTx(type){
  fillAccountSelects();document.getElementById("bankTxType").value=type;document.getElementById("bankModalTitle").textContent=type==="Transfer"?"Fast Bank Transfer":type+" Bank Balance";toggleDest();openModal("bankModal")
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
  if(type==="Adjustment"&&!note)return toast("Adjustment note is required.");
  if(!rawId)return toast("Add or select a bank account first.");
  if(!Number.isFinite(amt)||amt<0||(amt===0&&type!=="Adjustment"))return toast("Please enter a valid amount greater than zero.");
  const a=data.accounts.find(x=>Number(x.id)===id);
  if(!a)return toast("Selected bank account was not found. Please reopen the form.");
  a.balance=Number(a.balance)||0;
  const date=today();
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
  document.getElementById("bankAmount").value="";document.getElementById("bankNote").value="";
  closeModal("bankModal");persist();toast("Bank transaction saved with account, amount, date, and note.");
}

function saveCash(){
  const type=document.getElementById("cashType").value,amt=Number(document.getElementById("cashAmount").value||0),note=document.getElementById("cashNote").value.trim();
  if(amt<=0)return toast("Enter an amount.");
  if(type==="Cash Expense"&&data.cashBalance<amt)return toast("Expense is greater than cash on hand.");
  data.cashBalance += type==="Cash Received"?amt:-amt;
  data.cashRecords.unshift({date:today(),type,amount:type==="Cash Received"?amt:-amt,note});
  document.getElementById("cashAmount").value="";document.getElementById("cashNote").value="";persist();toast("Cash record saved.")
}
function selectActivity(name){document.getElementById("activityType").value=name;document.getElementById("activityAmount").focus()}
function saveActivity(){
  const type=document.getElementById("activityType").value,amt=Number(document.getElementById("activityAmount").value||0),sourceId=Number(document.getElementById("activitySource").value),sourceAccount=data.accounts.find(a=>a.id===sourceId),source=sourceAccount?.name||"",note=document.getElementById("activityNote").value.trim();
  if(amt<=0)return toast("Enter an expense amount.");
  if(!sourceAccount)return toast("Add or select a bank account first.");if(sourceAccount.balance<amt)return toast("Not enough money in the selected bank account.");sourceAccount.balance-=amt;data.bankRecords.unshift({date:today(),type:"Activity Expense",account:sourceAccount.name,amount:-amt,note:type+": "+note})
  data.activities.unshift({date:today(),activity:type,amount:-amt,source,note});document.getElementById("activityAmount").value="";document.getElementById("activityNote").value="";persist();toast("Activity expense recorded.")
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
  const bank=data.accounts.reduce((s,a)=>s+(Number(a.balance)||0),0), savings=data.members.reduce((s,m)=>s+(Number(m.balance)||0),0);
  ["dashBank","bankTotal","reportBank"].forEach(id=>setTextIfPresent(id,peso(bank)));
  ["dashCash","cashTotal","reportCash"].forEach(id=>setTextIfPresent(id,peso(data.cashBalance)));
  ["dashSavings","savingsTotal","reportSavings"].forEach(id=>setTextIfPresent(id,peso(savings)));
  setTextIfPresent("memberCount",data.members.length);
  setHtmlIfPresent("bankAccounts",data.accounts.map(a=>`<div class="account-row"><div><strong>${esc(a.name)}</strong><small>Current balance</small></div><strong>${peso(a.balance)}</strong><button class="btn secondary" onclick="removeAccount(${JSON.stringify(a.id)})">Remove</button></div>`).join("")||`<p class="empty-state">No bank accounts registered yet. Select <strong>Add Bank Account</strong> to create one.</p>`);
  setHtmlIfPresent("bankRecords",data.bankRecords.slice(0,30).map(r=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td>${esc(r.account||"")}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td></tr>`).join("")||emptyRow(5));
  setHtmlIfPresent("cashRecords",data.cashRecords.slice(0,30).map(r=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.type||"")}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${esc(r.note||"")}</td></tr>`).join("")||emptyRow(4));
  setHtmlIfPresent("activityRecords",data.activities.slice(0,30).map(r=>`<tr><td>${esc(r.date||"")}</td><td>${esc(r.activity||"")}</td><td class="negative">${peso(r.amount)}</td><td>${esc(r.source||"")}</td><td>${esc(r.note||"")}</td></tr>`).join("")||emptyRow(5));
  renderSavings();
  toggleDest();
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
  document.getElementById("selectedMemberSummary").innerHTML=m?`<div><strong>${esc(m.name)}</strong><small>Member savings balance</small></div><strong>${peso(m.balance)}</strong><button class="btn secondary" onclick="removeMember(${JSON.stringify(m.id)})">Remove Member</button>`:"<span>Select a member to see their record.</span>";
  const single=data.savingsRecords.filter(r=>r.memberId===selected);
  document.getElementById("memberSavingsRecords").innerHTML=single.map(r=>{const i=data.savingsRecords.indexOf(r);return `<tr><td>${esc(r.date||"")}</td><td>${esc(r.type)}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${peso(r.balance)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openSavingsEdit(${i})">Update</button></td></tr>`}).join("")||emptyRow(6);
  document.getElementById("allSavingsRecords").innerHTML=data.savingsRecords.map(r=>{const i=data.savingsRecords.indexOf(r),member=data.members.find(x=>x.id===r.memberId);return `<tr><td>${esc(r.date||"")}</td><td>${esc(member?.name||r.memberName||"Removed member")}</td><td>${esc(r.type)}</td><td class="${r.amount>=0?"positive":"negative"}">${r.amount>=0?"+":""}${peso(r.amount)}</td><td>${peso(r.balance)}</td><td>${esc(r.note||"")}</td><td><button class="btn secondary" onclick="openSavingsEdit(${i})">Update</button></td></tr>`}).join("")||emptyRow(7);
}
function selectSavingsMember(id){const sel=document.getElementById("memberRecordSelect");if(sel)sel.value=String(id);const entry=document.getElementById("savingsMember");if(entry)entry.value=String(id);setSavingsView("selected");}
function emptyRow(n){return `<tr><td colspan="${n}" style="opacity:.45;text-align:center">No records yet.</td></tr>`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function exportCSV(section){
  let rows=[];
  if(section==="bank"){rows=[["Date","Type","Account","Amount","Note"],...data.bankRecords.map(r=>[r.date,r.type,r.account,r.amount,r.note])]}
  if(section==="cash"){rows=[["Date","Type","Amount","Purpose"],...data.cashRecords.map(r=>[r.date,r.type,r.amount,r.note])]}
  if(section==="activities"){rows=[["Date","Activity","Amount","Paid From","Description"],...data.activities.map(r=>[r.date,r.activity,r.amount,r.source,r.note])]}
  if(section==="savings"){rows=[["Date","Member","Type","Amount (PHP)","Note","Balance (PHP)"],...data.savingsRecords.map(r=>{const m=data.members.find(x=>x.id===r.memberId);return [r.date,m?.name||r.memberName||"Removed member",r.type,r.amount,r.note||"",r.balance]})]}
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
 const rows=[["Date","Member","Transaction","Amount (PHP)","Note","Balance (PHP)"],...data.savingsRecords.filter(r=>r.memberId===mid).map(r=>[r.date,m.name,r.type,r.amount,r.note||"",r.balance])];
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
renderAll();setSavingsView("selected");

function clearData(){
  if(!confirm("Clear ALL church finance records saved in this browser? This cannot be undone. Download a backup first if you may need these records.")) return;
  localStorage.removeItem(KEY);
  data={accounts:[],bankRecords:[],cashBalance:0,cashRecords:[],activities:[],members:[],savingsRecords:[]};
  persist();
  toast("All local data cleared.");
}
