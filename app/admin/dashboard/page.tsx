'use client';
// app/admin/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, type Service, type StoreItem, type Promo } from '@/lib/supabase';
import { uploadImages } from '@/lib/cloudinary';
import { imgSizes } from '@/lib/cloudinary';
import RealtimeNotifications from '@/components/admin/RealtimeNotifications';

type Tab = 'settings' | 'services' | 'store' | 'promos';

// Calls our /api/settings route which saves AND revalidates the Next.js cache
async function saveSetting(key: string, value: Record<string, string>, table?: string) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, table }),
  });
}

// ── UI HELPERS (Moved outside to prevent the keyboard losing focus) ──
const inp = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#D4AF37] transition-colors";
const inpDark = "w-full bg-[#111] border border-[#333] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-3">
    <label className="block text-[0.7rem] uppercase tracking-wider text-gray-400 font-bold mb-1">{label}</label>
    {children}
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('settings');
  const [userEmail, setUserEmail] = useState('');

  // Settings
  const [phone, setPhone] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtext, setHeroSubtext] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [svcTitle, setSvcTitle] = useState('');
  const [svcSub, setSvcSub] = useState('');
  const [probTitle, setProbTitle] = useState('');
  const [solTitle, setSolTitle] = useState('');
  const [saving, setSaving] = useState('');

  // Content
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);

  // Modal
  type ModalState = { type: 'service'; data: Partial<Service> } | { type: 'item'; data: Partial<StoreItem> } | { type: 'promo'; data: Partial<Promo> } | null;
  const [modal, setModal] = useState<ModalState>(null);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
      else setUserEmail(data.user.email ?? '');
    });
    loadAll();
  }, []);

  async function loadAll() {
    loadSettings();
    const [s, i, p] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('store_items').select('*').order('name'),
      supabase.from('promos').select('*').order('created_at', { ascending: false }),
    ]);
    setServices(s.data ?? []); setItems(i.data ?? []); setPromos(p.data ?? []);
  }

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*');
    data?.forEach(row => {
      if (row.key === 'phone')        setPhone(row.value?.number ?? '');
      if (row.key === 'hero')         { setHeroHeadline(row.value?.headline ?? ''); setHeroSubtext(row.value?.subtext ?? ''); setHeroImage(row.value?.image ?? ''); }
      if (row.key === 'service_hero') { setSvcTitle(row.value?.title ?? ''); setSvcSub(row.value?.subtext ?? ''); }
      if (row.key === 'home_titles')  { setProbTitle(row.value?.problem ?? ''); setSolTitle(row.value?.solution ?? ''); }
    });
  }

  async function doSave(key: string, value: Record<string, string>, table?: string) {
    setSaving(key);
    await saveSetting(key, value, table);
    setSaving('');
    alert('Saved!');
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  // ── IMAGE UPLOAD ─────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setUploading(true);
    const urls = await uploadImages(e.target.files);
    setModalImages(prev => [...prev, ...urls]);
    setUploading(false);
    e.target.value = '';
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function updateModalData(field: string, value: string | number | boolean) {
    setModal(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        data: { ...prev.data, [field]: value }
      } as any; 
    });
  }

  async function saveModal() {
    if (!modal) return;
    const { type, data } = modal;

    if (type === 'service') {
      const d = { ...data, images: modalImages };
      if (d.id) await supabase.from('services').update(d).eq('id', d.id);
      else      await supabase.from('services').insert(d);
      await saveSetting('', {}, 'services'); // revalidate cache
    } else if (type === 'item') {
      const d = { ...data, images: modalImages };
      if (d.id) await supabase.from('store_items').update(d).eq('id', d.id);
      else      await supabase.from('store_items').insert(d);
      await saveSetting('', {}, 'store_items');
    } else {
      const d = data as Partial<Promo>;
      if (d.id) await supabase.from('promos').update(d).eq('id', d.id);
      else      await supabase.from('promos').insert(d);
      await saveSetting('', {}, 'promos');
    }
    setModal(null);
    loadAll();
  }

  async function del(table: string, id: string) {
    if (!confirm('Delete this item?')) return;
    await supabase.from(table).delete().eq('id', id);
    await saveSetting('', {}, table); // revalidate
    loadAll();
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="NEXA" width={28} height={28} className="object-contain" />
          <div>
            <span className="font-bold text-black text-sm">NEXA Ops</span>
            <span className="text-gray-400 text-xs ml-2 hidden sm:inline">{userEmail}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeNotifications />
          <Link href="/admin/analytics" className="bg-[#D4AF37] text-black text-xs font-bold px-3 py-1.5 rounded-lg">Analytics</Link>
          <Link href="/" className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg">View Site</Link>
          <button onClick={logout} className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg">Logout</button>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-1 overflow-x-auto">
        {(['settings','services','store','promos'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${tab===t ? 'border-[#D4AF37] text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t==='settings'?'⚙️ Settings':t==='services'?'⚡ Services':t==='store'?'🛍️ Store':'🔥 Promos'}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-4">

        {/* ── SETTINGS ──────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="font-bold mb-4 text-[#D4AF37] uppercase tracking-wider text-sm">WhatsApp Number</h3>
              <div className="flex gap-2">
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="234..." className={inpDark + " flex-1"} />
                <button onClick={()=>doSave('phone',{number:phone})} disabled={saving==='phone'} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                  {saving==='phone'?'...':'Save'}
                </button>
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="font-bold mb-4 text-[#D4AF37] uppercase tracking-wider text-sm">Homepage Hero</h3>
              <Field label="Headline"><input value={heroHeadline} onChange={e=>setHeroHeadline(e.target.value)} className={inpDark} /></Field>
              <Field label="Subtext"><input value={heroSubtext} onChange={e=>setHeroSubtext(e.target.value)} className={inpDark} /></Field>
              <Field label="Background Image URL"><input value={heroImage} onChange={e=>setHeroImage(e.target.value)} className={inpDark} /></Field>
              <button onClick={()=>doSave('hero',{headline:heroHeadline,subtext:heroSubtext,image:heroImage})}
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl text-sm mt-2">Update Homepage Hero</button>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-bold mb-4 text-gray-700 uppercase tracking-wider text-sm">Services Page Hero</h3>
              <Field label="Title"><input value={svcTitle} onChange={e=>setSvcTitle(e.target.value)} className={inp} /></Field>
              <Field label="Subtext"><input value={svcSub} onChange={e=>setSvcSub(e.target.value)} className={inp} /></Field>
              <button onClick={()=>doSave('service_hero',{title:svcTitle,subtext:svcSub})} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl text-sm mt-2">Update</button>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-bold mb-4 text-gray-700 uppercase tracking-wider text-sm">Home Section Titles</h3>
              <Field label="Problem Section"><input value={probTitle} onChange={e=>setProbTitle(e.target.value)} className={inp} /></Field>
              <Field label="Solution Section"><input value={solTitle} onChange={e=>setSolTitle(e.target.value)} className={inp} /></Field>
              <button onClick={()=>doSave('home_titles',{problem:probTitle,solution:solTitle})} className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl text-sm mt-2">Update</button>
            </div>
          </div>
        )}

        {/* ── SERVICES ──────────────────────────────────────────── */}
        {tab === 'services' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Services ({services.length})</h2>
              <button onClick={()=>{setModal({type:'service',data:{}});setModalImages([]);}} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add</button>
            </div>
            <div className="space-y-2">
              {services.map(svc=>(
                <div key={svc.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                  {svc.images?.[0] && <img src={imgSizes.thumb(svc.images[0])} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt={svc.name} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-black text-sm">{svc.name} {svc.highlight?'🔥':''}</p>
                    <p className="text-gray-400 text-xs truncate">{svc.description}</p>
                    {svc.price && <p className="text-[#D4AF37] text-xs font-bold">₦{Number(svc.price).toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setModal({type:'service',data:svc});setModalImages(svc.images??[]);}} className="text-blue-500 text-lg p-1">✎</button>
                    <button onClick={()=>del('services',svc.id)} className="text-red-500 text-lg p-1">🗑</button>
                  </div>
                </div>
              ))}
              {services.length===0 && <p className="text-center text-gray-400 py-8">No services yet. Add your first one.</p>}
            </div>
          </div>
        )}

        {/* ── STORE ─────────────────────────────────────────────── */}
        {tab === 'store' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Store Items ({items.length})</h2>
              <button onClick={()=>{setModal({type:'item',data:{}});setModalImages([]);}} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add</button>
            </div>
            <div className="space-y-2">
              {items.map(item=>(
                <div key={item.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                  {item.images?.[0] && <img src={imgSizes.thumb(item.images[0])} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt={item.name} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-black text-sm">{item.name} {item.highlight?'🔥':''}</p>
                    <p className="text-green-600 text-xs font-bold">₦{item.price.toLocaleString()} {item.market_price?<s className="text-gray-300 ml-1">₦{Number(item.market_price).toLocaleString()}</s>:null}</p>
                    <p className="text-gray-400 text-xs">{item.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setModal({type:'item',data:item});setModalImages(item.images??[]);}} className="text-blue-500 text-lg p-1">✎</button>
                    <button onClick={()=>del('store_items',item.id)} className="text-red-500 text-lg p-1">🗑</button>
                  </div>
                </div>
              ))}
              {items.length===0 && <p className="text-center text-gray-400 py-8">No store items yet.</p>}
            </div>
          </div>
        )}

        {/* ── PROMOS ────────────────────────────────────────────── */}
        {tab === 'promos' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Promos ({promos.length})</h2>
              <button onClick={()=>setModal({type:'promo',data:{}})} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded-lg text-sm">+ Add</button>
            </div>
            <div className="space-y-2">
              {promos.map(p=>(
                <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-black text-sm">{p.title}
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded font-bold ${p.active?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}`}>{p.active?'ON':'OFF'}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{p.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setModal({type:'promo',data:p})} className="text-blue-500 text-lg p-1">✎</button>
                    <button onClick={()=>del('promos',p.id)} className="text-red-500 text-lg p-1">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button onClick={()=>setModal(null)} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600">×</button>
            <h3 className="font-bold text-black text-lg mb-5">
              {(modal.data as {id?:string}).id?'Edit':'Add'} {modal.type==='service'?'Service':modal.type==='item'?'Product':'Promo'}
            </h3>

            {(modal.type==='service'||modal.type==='item') && (
              <>
                <Field label="Name">
                  <input value={(modal.data as {name?:string}).name??''} onChange={e => updateModalData('name', e.target.value)} className={inp} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Our Price (₦)">
                    <input type="number" value={(modal.data as {price?:number}).price??''} onChange={e => updateModalData('price', Number(e.target.value))} className={inp} />
                  </Field>
                  <Field label="Market Price (₦)">
                    <input type="number" value={(modal.data as {market_price?:number}).market_price??''} onChange={e => updateModalData('market_price', Number(e.target.value))} className={inp} />
                  </Field>
                </div>
                {modal.type==='item' && (
                  <Field label="Category">
                    <input value={(modal.data as {category?:string}).category??''} onChange={e => updateModalData('category', e.target.value)} className={inp} />
                  </Field>
                )}
                <Field label="Description">
                  <textarea value={(modal.data as {description?:string}).description??''} onChange={e => updateModalData('description', e.target.value)} rows={3} className={inp+' resize-none'} />
                </Field>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox" checked={(modal.data as {highlight?:boolean}).highlight??false} onChange={e => updateModalData('highlight', e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" />
                  <span className="text-sm text-gray-700">🔥 Set as Featured / Hot Deal</span>
                </label>
                <Field label="Images">
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="text-sm mb-2" />
                  {uploading && <p className="text-[#D4AF37] text-xs">Uploading...</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {modalImages.map((url,i)=>(
                      <div key={i} className="relative w-16 h-16">
                        <img src={imgSizes.thumb(url)} className="w-full h-full object-cover rounded-lg border border-gray-200" alt="" />
                        <button onClick={()=>setModalImages(prev=>prev.filter((_,j)=>j!==i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {modal.type==='promo' && (
              <>
                <Field label="Title"><input value={(modal.data as {title?:string}).title??''} onChange={e => updateModalData('title', e.target.value)} className={inp} /></Field>
                <Field label="Message"><input value={(modal.data as {message?:string}).message??''} onChange={e => updateModalData('message', e.target.value)} className={inp} /></Field>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox" checked={(modal.data as {active?:boolean}).active??false} onChange={e => updateModalData('active', e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" />
                  <span className="text-sm text-gray-700">Active (show on site)</span>
                </label>
              </>
            )}

            <button onClick={saveModal} className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-xl text-sm mt-2">
              Save {modal.type==='service'?'Service':modal.type==='item'?'Product':'Promo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
