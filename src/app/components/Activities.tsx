"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Status = "Pendente" | "Em andamento" | "Pausado" | "Homologado" | "Finalizado";
type Cat = { id: string; name: string; custom: boolean };
type Activity = {
  id: string; title: string; description: string; client: string;
  status: Status; catId: string; createdAt: number; updatedAt: number;
};

const STATUSES: Status[] = ["Pendente","Em andamento","Pausado","Homologado","Finalizado"];
const DEF_CATS: Cat[] = [
  { id:"particular", name:"Particular", custom:false },
  { id:"igreja",     name:"Igreja",     custom:false },
  { id:"trabalho",   name:"Trabalho",   custom:false },
];

const STYLE: Record<Status,{b:string;acc:string;sur:string;dot:string}> = {
  Pendente:       {b:"bg-slate-100 text-slate-700 ring-slate-200",      acc:"bg-slate-400",    sur:"bg-slate-50",    dot:"bg-slate-400"},
  "Em andamento": {b:"bg-sky-100 text-sky-700 ring-sky-200",            acc:"bg-sky-500",      sur:"bg-sky-50",      dot:"bg-sky-500"},
  Pausado:        {b:"bg-amber-100 text-amber-700 ring-amber-200",      acc:"bg-amber-500",    sur:"bg-amber-50",    dot:"bg-amber-500"},
  Homologado:     {b:"bg-violet-100 text-violet-700 ring-violet-200",   acc:"bg-violet-500",   sur:"bg-violet-50",   dot:"bg-violet-500"},
  Finalizado:     {b:"bg-emerald-100 text-emerald-700 ring-emerald-200",acc:"bg-emerald-500",  sur:"bg-emerald-50",  dot:"bg-emerald-500"},
};

const uid = () => typeof crypto!=="undefined"&&"randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniq = <T extends {id:string}>(a:T[]) => Array.from(new Map(a.map(i=>[i.id,i])).values());
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}
const sortAct = (a:Activity[]) => [...a].sort((x,y)=>y.updatedAt-x.updatedAt);
const fmtDT = (ts:number) => new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(ts));

const normCat = (c:any):Cat|null => c?.id&&c?.name ? {id:String(c.id),name:String(c.name),custom:Boolean(c.custom)} : null;
const normAct = (a:any):Activity|null => a?.id&&a?.title ? {
  id:String(a.id),title:String(a.title),description:String(a.description??""),
  client:String(a.client??""),status:STATUSES.includes(a.status)?a.status:"Pendente",
  catId:String(a.catId??"particular"),createdAt:Number(a.createdAt)||Date.now(),updatedAt:Number(a.updatedAt)||Date.now()
} : null;

export default function Activities() {
  const [loaded,   setLoaded]   = useState(false);
  const [acts,     setActs]     = useState<Activity[]>([]);
  const [cats,     setCats]     = useState<Cat[]>(DEF_CATS);
  const [editId,   setEditId]   = useState<string|null>(null);
  const [selId,    setSelId]    = useState<string|null>(null);
  const [dragId,   setDragId]   = useState<string|null>(null);
  const [dragOver, setDragOver] = useState<Status|null>(null);
  const [filtCat,  setFiltCat]  = useState("all");
  const [catName,  setCatName]  = useState("");
  const [form, setForm] = useState({title:"",description:"",client:"",status:"Pendente" as Status,catId:"particular"});

  useEffect(()=>{
    try {
      const ra=localStorage.getItem("a.acts.v1"); if(ra){const p=JSON.parse(ra);if(Array.isArray(p)) setActs(sortAct(p.map(normAct).filter(Boolean) as Activity[]));}
      const rc=localStorage.getItem("a.cats.v1"); if(rc){const p=JSON.parse(rc);if(Array.isArray(p)) setCats(uniq([...DEF_CATS,...(p.map(normCat).filter(Boolean) as Cat[])]));}
    } catch(e){console.error(e);} finally{setLoaded(true);}
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    localStorage.setItem("a.acts.v1",JSON.stringify(acts));
    localStorage.setItem("a.cats.v1",JSON.stringify(cats));
  },[acts,cats,loaded]);

  useEffect(()=>{
    if(!selId) return;
    const fn=(e:KeyboardEvent)=>{ if(e.key==="Escape") setSelId(null); };
    window.addEventListener("keydown",fn);
    document.body.style.overflow="hidden";
    return ()=>{ window.removeEventListener("keydown",fn); document.body.style.overflow=""; };
  },[selId]);

  const catMap  = useMemo(()=>new Map(cats.map(c=>[c.id,c])),[cats]);
  const selAct  = useMemo(()=>acts.find(a=>a.id===selId)??null,[acts,selId]);

  const groups = useMemo(()=>{
    const g:Record<Status,Activity[]>={Pendente:[],"Em andamento":[],Pausado:[],Homologado:[],Finalizado:[]};
    const f = filtCat==="all" ? acts : acts.filter(a=>a.catId===filtCat);
    for(const a of sortAct(f)) g[a.status].push(a);
    return g;
  },[acts,filtCat]);

  const summary = useMemo(()=>{
    const c:Record<Status,number>={Pendente:0,"Em andamento":0,Pausado:0,Homologado:0,Finalizado:0};
    for(const a of acts) c[a.status]++;
    return {total:acts.length,counts:c};
  },[acts]);

  const resetForm = () => { setForm({title:"",description:"",client:"",status:"Pendente",catId:"particular"}); setEditId(null); };

  const submit = (ev:FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const title=form.title.trim(); if(!title){alert("Título obrigatório.");return;}
    const now=Date.now();
    const entry:Activity={id:editId??uid(),title,description:form.description.trim(),client:form.client.trim(),status:form.status,catId:form.catId,createdAt:editId?acts.find(a=>a.id===editId)?.createdAt??now:now,updatedAt:now};
    setActs(p=>sortAct(editId?p.map(a=>a.id===editId?entry:a):[...p,entry]));
    resetForm();
  };

  const submitCat = (ev:FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const name=catName.trim(); if(!name){alert("Nome obrigatório.");return;}
    const id=slugify(name);
    if(cats.some(c=>c.id===id||c.name.toLowerCase()===name.toLowerCase())){alert("Já existe.");return;}
    setCats(p=>uniq([...p,{id,name,custom:true}]));
    setCatName(""); setForm(p=>({...p,catId:id}));
  };

  const del = (id:string) => {
    if(!confirm("Excluir atividade?")) return;
    setActs(p=>p.filter(a=>a.id!==id));
    if(editId===id) resetForm();
    if(selId===id) setSelId(null);
  };

  const edit = (a:Activity) => {
    setEditId(a.id);
    setForm({title:a.title,description:a.description,client:a.client,status:a.status,catId:a.catId});
    setSelId(null);
  };

  const onDragStart=(ev:DragEvent<HTMLButtonElement>,id:string)=>{ ev.dataTransfer.setData("text/plain",id); ev.dataTransfer.effectAllowed="move"; setDragId(id); };
  const onDragEnd=()=>{ setDragId(null); setDragOver(null); };
  const onDrop=(status:Status)=>{
    if(!dragId) return;
    setActs(p=>sortAct(p.map(a=>a.id===dragId?{...a,status,updatedAt:Date.now()}:a)));
    setDragId(null); setDragOver(null);
  };

  if(!loaded) return <div className="rounded-3xl bg-white p-8 text-sm text-slate-500">Carregando atividades...</div>;

  const selCat = selAct ? catMap.get(selAct.catId)??DEF_CATS[0] : null;
  const selSty = selAct ? STYLE[selAct.status] : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* cabeçalho */}
      <div className="bg-slate-950 px-6 py-6 text-white lg:px-8">
        <p className="text-xs uppercase tracking-widest text-slate-400">Card de Atividades</p>
        <h2 className="mt-1 text-2xl font-bold">Tarefas e acompanhamento</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[{l:"Total",v:String(summary.total)},...STATUSES.map(s=>({l:s,v:String(summary.counts[s])}))].map(i=>(
            <div key={i.l} className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <p className="text-xs text-slate-400">{i.l}</p>
              <p className="mt-1 text-xl font-bold">{i.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
        {/* coluna principal */}
        <div className="space-y-6">
          {/* formulário */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">{editId?"Editar atividade":"Nova atividade"}</h3>
              {editId&&<button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>}
            </div>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" placeholder="Ex.: Revisar proposta"/>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" placeholder="Detalhes da atividade..."/>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cliente (opcional)</label>
                <input value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" placeholder="Nome do cliente"/>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as Status}))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <select value={form.catId} onChange={e=>setForm(p=>({...p,catId:e.target.value}))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                  {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <button type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">{editId?"Salvar":"Adicionar"}</button>
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Limpar</button>
              </div>
            </form>
          </div>

          {/* filtro + board */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="font-semibold text-lg">Board</h3>
              <select value={filtCat} onChange={e=>setFiltCat(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200">
                <option value="all">Todas as categorias</option>
                {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-3 sm:grid-cols-2">
              {STATUSES.map(status=>{
                const col=groups[status];
                const sty=STYLE[status];
                const isOver=dragOver===status;
                return (
                  <div key={status}
                    className={`min-h-40 rounded-2xl border p-3 transition-all ${isOver?"border-slate-400 bg-slate-200":sty.sur+" border-slate-200"}`}
                    onDragOver={e=>{e.preventDefault();setDragOver(status);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={()=>onDrop(status)}>
                    <div className={`mb-2 h-1 rounded-full ${sty.acc}`}/>
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sty.dot}`}/>
                        <span className="text-xs font-semibold text-slate-800">{status}</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${sty.b}`}>{col.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.length===0
                        ? <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-2 text-[11px] text-slate-400 text-center">Vazio</div>
                        : col.map(a=>(
                          <button key={a.id} type="button"
                            draggable
                            onDragStart={e=>onDragStart(e,a.id)}
                            onDragEnd={onDragEnd}
                            onClick={()=>setSelId(a.id)}
                            className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing">
                            <div className={`absolute inset-x-0 top-0 h-0.5 ${sty.acc}`}/>
                            <p className="truncate text-sm font-semibold text-slate-900 pt-0.5">{a.title}</p>
                            {a.client&&<p className="truncate text-xs text-slate-500 mt-0.5">{a.client}</p>}
                            <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${sty.b}`}>{catMap.get(a.catId)?.name??""}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold mb-3">Nova categoria</h3>
            <form onSubmit={submitCat} className="space-y-3">
              <input value={catName} onChange={e=>setCatName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200" placeholder="Ex.: Freelance, Escola..."/>
              <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Adicionar</button>
            </form>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold mb-3">Categorias</h3>
            <div className="space-y-2">
              {cats.map(c=>(
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <span className="text-[10px] text-slate-500">{c.custom?"Custom":"Padrão"}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* modal */}
      {selAct&&selCat&&selSty&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm" onClick={()=>setSelId(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className={`h-1.5 ${selSty.acc}`}/>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Atividade</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">{selAct.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${selSty.b}`}>{selAct.status}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-slate-200">{selCat.name}</span>
                    {selAct.client&&<span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">{selAct.client}</span>}
                  </div>
                </div>
                <button type="button" onClick={()=>setSelId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fechar</button>
              </div>
              {selAct.description&&(
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Descrição</p>
                  <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{selAct.description}</p>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Criado</p>
                  <p className="mt-1 font-medium">{fmtDT(selAct.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Atualizado</p>
                  <p className="mt-1 font-medium">{fmtDT(selAct.updatedAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={()=>edit(selAct)} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Editar</button>
                <button type="button" onClick={()=>del(selAct.id)} className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}