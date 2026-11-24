(() => {
  "use strict";
  const KEY = "fintrack.v1";
  const CATEGORIES = {
    expense: ["Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Health", "Entertainment", "Education", "Other"],
    income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"]
  };
  const COLORS = ["#397c5b", "#e6a477", "#8b9fba", "#d8c29b", "#9a83ad", "#83aaa4", "#c57c67", "#a8b5a9"];
  const SYMBOLS = {"Food & Dining":"⌂","Transport":"↗","Shopping":"◇","Bills & Utilities":"▤","Health":"＋","Entertainment":"♫","Education":"▱","Other":"•","Salary":"↙","Freelance":"✳","Business":"▣","Investment":"⌁","Gift":"♡"};
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const money = n => { const v = Math.round(Number(n)||0); return (v < 0 ? "−" : "") + "৳" + Math.abs(v).toLocaleString("en-BD"); };
  const pad = n => String(n).padStart(2,"0");
  // Local date (toISOString() is UTC and shifts the date by a day for users ahead of UTC, e.g. Bangladesh).
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
  const monthKey = d => String(d||"").slice(0,7);
  const currentMonth = () => monthKey(today());
  const uid = () => "tx_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  // Demo data; days are capped at today so no sample entry is dated in the future.
  const buildSeed = () => {
    const month = currentMonth(), maxDay = new Date().getDate();
    const d = day => month + "-" + pad(Math.min(day, maxDay));
    return [
      {id:"seed1",name:"Monthly salary",category:"Salary",type:"income",amount:52000,date:d(2),note:"Monthly income"},
      {id:"seed2",name:"Freelance project",category:"Freelance",type:"income",amount:12500,date:d(8),note:"Website design"},
      {id:"seed3",name:"Grocery shopping",category:"Food & Dining",type:"expense",amount:4250,date:d(3),note:"Weekly groceries"},
      {id:"seed4",name:"Internet bill",category:"Bills & Utilities",type:"expense",amount:1200,date:d(5),note:"Home internet"},
      {id:"seed5",name:"Ride share",category:"Transport",type:"expense",amount:850,date:d(9),note:"Commute"},
      {id:"seed6",name:"New headphones",category:"Shopping",type:"expense",amount:3200,date:d(12),note:"Accessories"},
      {id:"seed7",name:"Coffee with friends",category:"Food & Dining",type:"expense",amount:650,date:d(15),note:"Weekend"},
      {id:"seed8",name:"Online course",category:"Education",type:"expense",amount:1800,date:d(18),note:"Learning"}
    ];
  };
  let state = loadState();
  let toastTimer;
  let viewMonth = currentMonth();
  function loadState(){
    try{
      const parsed = JSON.parse(localStorage.getItem(KEY));
      if(parsed && Array.isArray(parsed.transactions)) return sanitize(parsed);
    }catch(e){ console.warn("FinTrack data could not be read; using demo data.",e); }
    return {transactions:buildSeed(),budgets:[{category:"Food & Dining",limit:8000},{category:"Transport",limit:3500},{category:"Shopping",limit:6000},{category:"Bills & Utilities",limit:4000}]};
  }
  // Drop malformed records from storage so one bad entry can't blank the whole dashboard.
  function sanitize(data){
    const transactions=data.transactions.filter(t=>t&&typeof t==="object"&&(t.type==="income"||t.type==="expense")&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date))&&Number.isFinite(Number(t.amount)))
      .map(t=>({id:String(t.id||uid()),name:String(t.name||"Untitled"),category:String(t.category||"Other"),type:t.type,amount:Number(t.amount),date:String(t.date),note:String(t.note||"")}));
    const budgets=(Array.isArray(data.budgets)?data.budgets:[]).filter(b=>b&&typeof b.category==="string"&&Number(b.limit)>0).map(b=>({category:b.category,limit:Number(b.limit)}));
    return {transactions,budgets};
  }
  function save(){
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }
    catch(e){ console.warn("FinTrack could not save to LocalStorage.",e); showToast("Couldn't save — browser storage is unavailable or full."); }
  }
  function monthTransactions(){ return state.transactions.filter(t=>monthKey(t.date)===viewMonth); }
  function monthLabel(key){ const [y,m]=key.split("-"); const l=new Date(+y,+m-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); return key===currentMonth()?"This month":l; }
  function fillPeriod(){
    const now=new Date(), keys=new Set([currentMonth(),viewMonth]);
    for(let i=1;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.add(d.getFullYear()+"-"+pad(d.getMonth()+1));}
    state.transactions.forEach(t=>keys.add(monthKey(t.date)));
    $("#periodSelect").innerHTML=[...keys].sort().reverse().map(k=>`<option value="${k}" ${k===viewMonth?"selected":""}>${monthLabel(k)}</option>`).join("");
  }
  function greeting(){ const h=new Date().getHours(); return (h<5?"Good night":h<12?"Good morning":h<17?"Good afternoon":"Good evening")+", Jubayer ✦"; }
  function sum(list,type){return list.filter(t=>!type||t.type===type).reduce((a,t)=>a+Number(t.amount||0),0);}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function showToast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2500);}
  function setView(name){
    $$(".view").forEach(v=>v.classList.toggle("active",v.id===name+"View"));
    $$(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
    const titles={overview:greeting(),transactions:"Your transactions",budgets:"Plan your spending",reports:"Your financial insights"};
    $("#pageTitle").textContent=titles[name]||"FinTrack";
    $("#sidebar").classList.remove("open");
    if(name==="transactions") renderTransactions();
    if(name==="budgets") renderBudgets();
    if(name==="reports") renderReports();
  }
  function categoryOptions(type,selected=""){
    return CATEGORIES[type].map(c=>`<option value="${escapeHTML(c)}" ${c===selected?"selected":""}>${escapeHTML(c)}</option>`).join("");
  }
  function allCategories(){return [...new Set([...CATEGORIES.expense,...CATEGORIES.income])];}
  function fillCategoryFilters(){
    $("#categoryFilter").innerHTML='<option value="all">All categories</option>'+allCategories().map(c=>`<option>${escapeHTML(c)}</option>`).join("");
  }
  function renderStats(){
    const list=monthTransactions(), income=sum(list,"income"), expense=sum(list,"expense"), net=income-expense, rate=income?Math.round(net/income*100):0;
    $("#balanceValue").textContent=money(sum(state.transactions,"income")-sum(state.transactions,"expense"));
    $("#incomeValue").textContent=money(income);$("#expenseValue").textContent=money(expense);
    $("#savingsValue").textContent=rate+"%";$("#savingsCaption").textContent=income?(net>=0?"Saved "+money(net):"Overspent by "+money(-net)):"Add income to calculate savings";
    $("#balanceCaption").textContent="All-time income minus expenses";
    $("#donutTotal").textContent=money(expense);
  }
  // Round the chart ceiling up to a "nice" number so the Y-axis labels always match the bars.
  function niceMax(v){
    const target=Math.max(v,1000)/4, pow=Math.pow(10,Math.floor(Math.log10(target)));
    const step=[1,2,2.5,5,10].map(m=>m*pow).find(s=>s>=target);
    return step*4;
  }
  function axisLabel(v){
    if(v>=1e6)return "৳"+(+(v/1e6).toFixed(1))+"M";
    if(v>=1000)return "৳"+(+(v/1000).toFixed(1))+"k";
    return "৳"+Math.round(v);
  }
  function renderCashflow(){
    const labels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    // Build from year/month directly: setMonth() on the 29th–31st overflows into the next month and UTC conversion shifts days.
    const data=Array.from({length:6},(_,i)=>{const [vy,vm]=viewMonth.split("-").map(Number);const d=new Date(vy,vm-1-5+i,1);const key=d.getFullYear()+"-"+pad(d.getMonth()+1);const rows=state.transactions.filter(t=>monthKey(t.date)===key);return {label:labels[d.getMonth()],income:sum(rows,"income"),expense:sum(rows,"expense")};});
    const max=niceMax(Math.max(0,...data.flatMap(d=>[d.income,d.expense])));
    $("#yLabels").innerHTML=[4,3,2,1,0].map(i=>`<span>${axisLabel(max/4*i)}</span>`).join("");
    $("#cashflowBars").innerHTML=data.map(d=>`<div class="month-group" title="${d.label}: income ${money(d.income)}, expenses ${money(d.expense)}"><div class="bar income" style="height:${Math.max(2,d.income/max*100)}%"></div><div class="bar expense" style="height:${Math.max(2,d.expense/max*100)}%"></div></div>`).join("");
    $("#cashflowLabels").innerHTML=data.map(d=>`<span>${d.label}</span>`).join("");
  }
  function renderSpending(){
    const rows=monthTransactions().filter(t=>t.type==="expense"), totals={};
    rows.forEach(t=>totals[t.category]=(totals[t.category]||0)+t.amount);
    const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
    const total=sorted.reduce((a,x)=>a+x[1],0);
    let offset=0;
    const segments=sorted.map(([cat,val],i)=>{const start=offset;offset+=total?val/total*100:0;return `${COLORS[allCategories().indexOf(cat)%COLORS.length]} ${start}% ${offset}%`;});
    $("#spendingDonut").style.background=total?`conic-gradient(${segments.join(",")})`:"#edf2ed";
    $("#categoryLegend").innerHTML=sorted.length?sorted.slice(0,5).map(([cat,val])=>`<div class="legend-row"><i class="legend-color" style="background:${COLORS[allCategories().indexOf(cat)%COLORS.length]}"></i><span>${escapeHTML(cat)}</span><strong>${Math.round(val/total*100)}%</strong></div>`).join(""):'<span class="empty-state">No expenses yet</span>';
  }
  function transactionRow(t,withActions=false){
    const income=t.type==="income", sym=SYMBOLS[t.category]||"•";
    return `<tr><td><div class="transaction-name"><span class="transaction-symbol">${sym}</span>${escapeHTML(t.name)}</div></td><td>${escapeHTML(t.category)}</td><td>${new Date(t.date+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>${withActions?`<td><span class="type-chip ${income?"":"expense"}">${income?"Income":"Expense"}</span></td>`:""}<td class="${income?"amount-income":"amount-expense"}">${income?"+":"−"}${money(t.amount)}</td>${withActions?`<td><button class="delete-button" data-delete="${escapeHTML(t.id)}" aria-label="Delete ${escapeHTML(t.name)}" title="Delete">×</button></td>`:""}</tr>`;
  }
  function renderRecent(){
    const rows=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    $("#recentRows").innerHTML=rows.map(t=>transactionRow(t)).join("");
    $("#recentEmpty").classList.toggle("hidden",rows.length>0);
  }
  function renderTransactions(){
    const q=$("#searchInput").value.toLowerCase(), type=$("#typeFilter").value, cat=$("#categoryFilter").value;
    const rows=[...state.transactions].filter(t=>(type==="all"||t.type===type)&&(cat==="all"||t.category===cat)&&(`${t.name} ${t.category} ${t.note||""}`).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
    $("#allRows").innerHTML=rows.map(t=>transactionRow(t,true)).join("");
    $("#allEmpty").classList.toggle("hidden",rows.length>0);
  }
  function renderBudgets(){
    const rows=monthTransactions().filter(t=>t.type==="expense"), spentBy={};rows.forEach(t=>spentBy[t.category]=(spentBy[t.category]||0)+t.amount);
    const totalBudget=state.budgets.reduce((a,b)=>a+b.limit,0), totalSpent=state.budgets.reduce((a,b)=>a+(spentBy[b.category]||0),0);
    $("#budgetSummary").innerHTML=`<div class="summary-tile"><span>Total budget</span><strong>${money(totalBudget)}</strong></div><div class="summary-tile"><span>Total spent in budget categories</span><strong>${money(totalSpent)}</strong></div><div class="summary-tile"><span>Remaining</span><strong>${money(totalBudget-totalSpent)}</strong></div>`;
    $("#budgetGrid").innerHTML=state.budgets.length?state.budgets.map(b=>{const spent=spentBy[b.category]||0,pct=Math.round(spent/b.limit*100),over=spent>b.limit;return `<article class="budget-card"><div class="budget-card-head"><div class="budget-category"><span class="budget-symbol">${SYMBOLS[b.category]||"•"}</span>${escapeHTML(b.category)}</div><div class="budget-amount"><strong>${money(spent)}</strong> / ${money(b.limit)}</div><div class="budget-actions"><button class="mini-button" data-edit-budget="${escapeHTML(b.category)}" aria-label="Edit ${escapeHTML(b.category)} budget" title="Edit">✎</button><button class="mini-button danger" data-del-budget="${escapeHTML(b.category)}" aria-label="Delete ${escapeHTML(b.category)} budget" title="Delete">×</button></div></div><div class="progress-track"><div class="progress-fill ${over?"over":""}" style="width:${Math.min(100,pct)}%"></div></div><div class="budget-foot"><span>${over?"Over budget by "+money(spent-b.limit):money(b.limit-spent)+" remaining"}</span><span>${pct}% used</span></div></article>`}).join(""):'<div class="panel empty-state">No budgets yet. Set a category budget to get started.</div>';
  }
  function renderReports(){
    const rows=monthTransactions().filter(t=>t.type==="expense"), totals={};rows.forEach(t=>totals[t.category]=(totals[t.category]||0)+t.amount);
    const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]), total=sum(rows), [vy,vm]=viewMonth.split("-").map(Number), day=viewMonth===currentMonth()?Math.max(1,new Date().getDate()):new Date(vy,vm,0).getDate();
    $("#avgSpend").textContent=money(total/day);$("#topCategory").textContent=sorted[0]?.[0]||"—";$("#transactionCount").textContent=state.transactions.length.toLocaleString();
    $("#reportCategories").innerHTML=sorted.length?sorted.map(([cat,val])=>`<div class="report-cat-row"><span>${escapeHTML(cat)}</span><div class="report-cat-track"><div class="report-cat-fill" style="width:${total?val/total*100:0}%"></div></div><strong>${money(val)}</strong></div>`).join(""):'<div class="empty-state">Add some expenses to see your spending insights.</div>';
  }
  function renderAll(){fillPeriod();renderStats();renderCashflow();renderSpending();renderRecent();renderTransactions();renderBudgets();renderReports();}
  function openModal(id){$("#"+id).classList.remove("hidden");const first=$("#"+id+" input:not([type=radio]),#"+id+" select");if(first)first.focus();}
  function closeModal(id){$("#"+id).classList.add("hidden");}
  function exportCSV(){
    const header=["id","name","type","category","amount_bdt","date","note"];
    const rows=state.transactions.map(t=>[t.id,t.name,t.type,t.category,t.amount,t.date,t.note||""]);
    // Neutralise spreadsheet formulas (=, +, -, @) in text fields so opened-in-Excel exports can't execute them.
    const cell=v=>{let t=String(v??"");if(/^[=+\-@\t\r]/.test(t)&&!/^-?\d+(\.\d+)?$/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
    const csv=[header,...rows].map(r=>r.map(cell).join(",")).join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="fintrack-transactions.csv";a.click();URL.revokeObjectURL(url);showToast("Your CSV export is ready.");
  }
  function bind(){
    $$(".nav-link[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
    $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.goto)));
    $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
    $("#addTop").addEventListener("click",()=>openTransaction());
    $("#addTransactions").addEventListener("click",()=>openTransaction());
    $("#addBudget").addEventListener("click",()=>{$("#budgetForm").reset();$("#budgetError").classList.add("hidden");openModal("budgetModal");});
    $(".brand").addEventListener("click",e=>{e.preventDefault();setView("overview");});
    $("#periodSelect").addEventListener("change",e=>{viewMonth=e.target.value;renderAll();});
    $("#exportTop").addEventListener("click",exportCSV);$("#exportSide").addEventListener("click",exportCSV);$("#reportExport").addEventListener("click",exportCSV);
    ["searchInput","typeFilter","categoryFilter"].forEach(id=>$("#"+id).addEventListener(id==="searchInput"?"input":"change",renderTransactions));
    document.addEventListener("click",e=>{
      const close=e.target.closest("[data-close]");if(close)closeModal(close.dataset.close);
      const del=e.target.closest("[data-delete]");if(del){if(confirm("Delete this transaction?")){state.transactions=state.transactions.filter(t=>t.id!==del.dataset.delete);save();renderAll();showToast("Transaction deleted.");}}
      const eb=e.target.closest("[data-edit-budget]");if(eb){const b=state.budgets.find(x=>x.category===eb.dataset.editBudget);if(b){$("#budgetForm").reset();$("#budgetError").classList.add("hidden");$("#budgetCategory").value=b.category;$("#budgetForm").elements.limit.value=b.limit;openModal("budgetModal");}}
      const db=e.target.closest("[data-del-budget]");if(db&&confirm("Delete the "+db.dataset.delBudget+" budget?")){state.budgets=state.budgets.filter(x=>x.category!==db.dataset.delBudget);save();renderBudgets();showToast("Budget deleted.");}
      if(e.target.classList.contains("modal-backdrop"))closeModal(e.target.id);
      if(!e.target.closest("#sidebar")&&!e.target.closest("#menuToggle"))$("#sidebar").classList.remove("open");
    });
    $$('input[name="type"]').forEach(r=>r.addEventListener("change",()=>{$("#formCategory").innerHTML=categoryOptions(r.value);}));
    $("#transactionForm").addEventListener("submit",e=>{
      e.preventDefault();const f=e.currentTarget,fd=new FormData(f),amount=Number(fd.get("amount")),date=String(fd.get("date")),name=String(fd.get("name")).trim();
      if(!name){showError("formError","Please enter a transaction name.");return;}
      if(!date){showError("formError","Please choose a date.");return;}
      if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(amount)){showError("formError","Enter a valid whole-number amount.");return;}
      if(date>today()){showError("formError","Future-dated transactions are not supported in this demo.");return;}
      state.transactions.push({id:uid(),name,type:fd.get("type"),category:fd.get("category"),amount,date,note:String(fd.get("note")||"").trim()});
      save();f.reset();$("#formCategory").innerHTML=categoryOptions("expense");closeModal("transactionModal");renderAll();showToast("Transaction added successfully.");
    });
    $("#budgetForm").addEventListener("submit",e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget),category=String(fd.get("category")),limit=Number(fd.get("limit"));
      if(!Number.isInteger(limit)||limit<=0){showError("budgetError","Enter a valid whole-number budget.");return;}
      const existing=state.budgets.find(b=>b.category===category);if(existing)existing.limit=limit;else state.budgets.push({category,limit});
      save();closeModal("budgetModal");e.currentTarget.reset();renderBudgets();showToast("Budget saved.");
    });
    document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal-backdrop").forEach(m=>m.classList.add("hidden"));});
    // Refresh if the data was changed in another tab.
    window.addEventListener("storage",e=>{if(e.key===KEY){state=loadState();renderAll();}});
  }
  function showError(id,msg){const el=$("#"+id);el.textContent=msg;el.classList.remove("hidden");}
  function openTransaction(){
    const form=$("#transactionForm");form.reset();$("#formCategory").innerHTML=categoryOptions("expense");form.elements.date.max=today();form.elements.date.value=today();$("#formError").classList.add("hidden");openModal("transactionModal");
  }
  function init(){
    $("#pageTitle").textContent=greeting();
    $("#dateLabel").textContent=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
    $("#formCategory").innerHTML=categoryOptions("expense");
    $("#budgetCategory").innerHTML=CATEGORIES.expense.map(c=>`<option>${escapeHTML(c)}</option>`).join("");
    fillCategoryFilters();bind();renderAll();
  }
  init();
})();