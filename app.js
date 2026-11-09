import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const configured = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
let supabase = null, employees = [], transactions = [];
const money = n => Number(n || 0).toLocaleString("ar-EG",{maximumFractionDigits:2})+" ج.م";
const msg = (id, value, ok=false) => { $(id).textContent=value; $(id).style.color=ok?"#13805c":"#b33"; };
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function showApp(on){$("authView").classList.toggle("hidden",on);$("appView").classList.toggle("hidden",!on);$("logoutBtn").classList.toggle("hidden",!on)}
async function init(){
  $("date").value=new Date().toISOString().slice(0,10);
  if(!configured){$("setupNotice").classList.remove("hidden");msg("authMessage","أكمل إعداد Supabase أولاً كما هو موضح في README.");$("loginBtn").disabled=true;return}
  supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await supabase.auth.getSession();
  if(session) {showApp(true);await loadData()} else showApp(false);
  supabase.auth.onAuthStateChange(async(_event,session)=>{showApp(!!session);if(session) await loadData()});
}
$("loginBtn").addEventListener("click",async()=>{
  msg("authMessage","جارٍ تسجيل الدخول...",true);
  const {error}=await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error) msg("authMessage","تعذر تسجيل الدخول: "+error.message);
});
$("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();showApp(false)});
async function loadData(){
  const [e,t]=await Promise.all([
    supabase.from("employees").select("*").order("name"),
    supabase.from("transactions").select("*, employees(name)").order("transaction_date",{ascending:false}).order("created_at",{ascending:false})
  ]);
  if(e.error||t.error){toast("مشكلة في تحميل البيانات. راجع إعداد قاعدة البيانات.");console.error(e.error,t.error);return}
  employees=e.data||[];transactions=t.data||[];render();
}
function render(){
  const income=transactions.filter(x=>x.kind==="income"),expense=transactions.filter(x=>x.kind==="expense");
  const sum=a=>a.reduce((s,x)=>s+Number(x.amount),0);
  $("totalIn").textContent=money(sum(income));$("totalOut").textContent=money(sum(expense));$("net").textContent=money(sum(income)-sum(expense));$("employeeCount").textContent=employees.length;
  $("employeeSelect").innerHTML='<option value="">اختر الموظف</option>'+employees.map(e=>`<option value="${e.id}">${safe(e.name)}</option>`).join("");
  $("transactionsBody").innerHTML=transactions.length?transactions.map(x=>`<tr><td>${safe(x.transaction_date)}</td><td><span class="pill ${x.kind}">${x.kind==="income"?"تحصيل":"مصروف"}</span></td><td>${safe(x.employees?.name||"—")}</td><td>${money(x.amount)}</td><td>${safe(x.party||"")}<div class="muted">${safe(x.description||"")}</div></td></tr>`).join(""):'<tr><td colspan="5" class="empty">لا توجد حركات مسجلة حتى الآن</td></tr>';
  $("employeesBody").innerHTML=employees.length?employees.map(e=>{let a=transactions.filter(x=>x.employee_id===e.id),i=sum(a.filter(x=>x.kind==="income")),o=sum(a.filter(x=>x.kind==="expense"));return `<tr><td>${safe(e.name)}</td><td>${money(i)}</td><td>${money(o)}</td><td>${money(i-o)}</td></tr>`}).join(""):'<tr><td colspan="4" class="empty">أضف أول موظف</td></tr>';
}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("employeeForm").addEventListener("submit",async ev=>{
  ev.preventDefault();const name=$("employeeName").value.trim();if(!name)return;
  const {error}=await supabase.from("employees").insert({name});
  if(error){msg("employeeMessage","لم تتم الإضافة: "+error.message);return}
  $("employeeName").value="";msg("employeeMessage","تمت إضافة الموظف.",true);await loadData();
});
$("transactionForm").addEventListener("submit",async ev=>{
  ev.preventDefault();const amount=Number($("amount").value);if(!(amount>0)){msg("txMessage","اكتب مبلغاً صحيحاً.");return}
  const record={kind:$("type").value,amount,employee_id:$("employeeSelect").value,party:$("party").value.trim()||null,description:$("description").value.trim()||null,transaction_date:$("date").value};
  if(!record.employee_id){msg("txMessage","اختر الموظف المسؤول.");return}
  const {error}=await supabase.from("transactions").insert(record);
  if(error){msg("txMessage","لم يتم الحفظ: "+error.message);return}
  $("amount").value="";$("party").value="";$("description").value="";msg("txMessage","تم حفظ الحركة بنجاح.",true);await loadData();
});
$("refreshBtn").addEventListener("click",loadData);
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");["transactionsPanel","employeesPanel"].forEach(id=>$(id).classList.toggle("hidden",id!==b.dataset.target))}));
init();
