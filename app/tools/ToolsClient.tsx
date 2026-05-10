'use client';
// app/tools/ToolsClient.tsx — NEXA Tools v3.1 (Offline-First Edition)
import { useEffect, useState } from 'react';
import { supabase, type Service, type StoreItem } from '@/lib/supabase';
import { trackVisit, trackRequest } from '@/lib/analytics';
import { openWhatsApp } from '@/lib/whatsapp';

// ── PRICE RANGE HELPERS ───────────────────────────────────────────────────
const MARGIN = 0.30;
function range(mid: number) {
  return {
    low:  Math.round(mid * (1 - MARGIN) / 100) * 100,
    high: Math.round(mid * (1 + MARGIN) / 100) * 100,
  };
}
function fmt(n: number) { return 'N' + n.toLocaleString('en-NG'); }

// ── DEFAULT NEXA PRICE DATA (Fallback for first-time offline users) ───────
interface PriceItem {
  id: string; label: string; description: string; mid: number; minNote?: string;
}
interface PriceCategory {
  id: string; label: string; icon: string; items: PriceItem[];
}

const DEFAULT_PRICE_DATA: PriceCategory[] = [
  {
    id: 'generator', label: 'Generator', icon: 'GEN',
    items: [
      { id: 'gen-1', label: 'Changeover Installation', description: 'Full manual or automatic changeover switch installation for generator connection.', mid: 10000 },
    ],
  },
  {
    id: 'electrical', label: 'Electrical', icon: 'ELC',
    items: [
      { id: 'elec-1', label: 'Power Outage Fixing', description: 'Tracing and fixing tripped breakers, blown fuses, or faulty wiring causing power outages.', mid: 8000 },
      { id: 'elec-2', label: 'Socket, Switch & Lighting Installation', description: 'Installing or replacing wall sockets, switches, ceiling lights, or bulb holders.', mid: 4000 },
      { id: 'elec-3', label: 'Rewiring or Extension', description: 'Running new wire extensions or rewiring a section of an apartment.', mid: 12500 },
      { id: 'elec-4', label: 'Ceiling Fan / Chandelier / LED Strip', description: 'Mounting and wiring ceiling fans, chandeliers, or LED strip lighting.', mid: 8000 },
      { id: 'elec-5', label: 'Electrical Maintenance', description: 'General checks: connections, terminals, circuit testing. Scope determines final price.', mid: 3000, minNote: 'N3,000 upwards depending on scope' },
      { id: 'elec-6', label: 'Electrical Repair', description: 'Diagnosing and fixing faults in existing electrical installations.', mid: 3000, minNote: 'N3,000 upwards depending on fault type' },
    ],
  },
  {
    id: 'piping', label: 'Fresh Piping', icon: 'PIP',
    items: [
      { id: 'pip-1', label: 'Full Conduit Piping', description: 'Complete conduit pipe installation for a new apartment. Price varies with number of rooms and apartment size.', mid: 20000, minNote: 'N20,000 upwards - rooms and apartment type affect price' },
      { id: 'pip-2', label: 'Half Conduit Piping', description: 'Partial conduit installation for renovations or adding circuits to existing apartments.', mid: 15000, minNote: 'N15,000 upwards depending on scope' },
      { id: 'pip-3', label: 'Surface Piping / Trunking', description: 'Pipes run on wall surface in PVC trunking. Faster and less disruptive than full conduit.', mid: 15000, minNote: 'N15,000 upwards depending on length and rooms' },
    ],
  },
  {
    id: 'wiring', label: 'Fresh Wiring', icon: 'WIR',
    items: [
      { id: 'wir-1', label: 'Full Conduit Wiring', description: 'Complete wiring through conduit for a new build. Price depends on rooms, light points, and socket points.', mid: 20000, minNote: 'N20,000 upwards - rooms, light points and sockets all affect price' },
      { id: 'wir-2', label: 'Half Conduit Wiring', description: 'Wiring half the apartment through conduit - common for phased renovations.', mid: 15000, minNote: 'N15,000 upwards depending on scope' },
      { id: 'wir-3', label: 'Surface Wiring', description: 'Wires clipped or trunked on wall surface. The most affordable fresh wiring option.', mid: 12000, minNote: 'N12,000 upwards depending on length' },
    ],
  },
  {
    id: 'plumbing', label: 'Plumbing', icon: 'PLM',
    items: [
      { id: 'plm-1', label: 'Emergency Burst Pipe / Sudden Leak', description: 'Immediate response to burst pipes or sudden leaks. Critical for hostels to minimize water damage.', mid: 5000 },
      { id: 'plm-2', label: 'Emergency Water Supply Fix', description: 'Restoring water supply to a tap, point, or section. Aging or new pipelines.', mid: 3500 },
      { id: 'plm-3', label: 'Water Tank Maintenance', description: 'Cleaning and servicing overhead tanks. Includes pressure checks, float valves, and flow tests.', mid: 7500 },
      { id: 'plm-4', label: 'Toilet Repairs', description: 'Fixing flush mechanisms, cisterns, broken handles, or running toilets. Price depends on fault type.', mid: 10000, minNote: 'N10,000 and above depending on the fault' },
      { id: 'plm-5', label: 'Clogged Drain / Toilet Blockage', description: 'Unblocking drains or toilets. May require opening chambers if blockage is deep.', mid: 20000, minNote: 'Can reach N20,000+ if chamber opening is required' },
      { id: 'plm-6', label: 'Leaky Faucet / Dripping Pipe', description: 'Fixing worn taps and leaking pipes. Price includes cost of buying replacement fittings.', mid: 8500, minNote: 'Includes cost of replacement parts' },
    ],
  },
  {
    id: 'carpentry', label: 'Carpentry', icon: 'CAR',
    items: [
      { id: 'car-1', label: 'Carpentry Maintenance', description: 'Doors, frames, hinges, furniture, shelves. Price depends on what needs fixing.', mid: 10000, minNote: 'N5,000 to N15,000 base range depending on task' },
    ],
  },
];

// ── APPLIANCES ────────────────────────────────────────────────────────────
const APPLIANCES = [
  ['LED Bulb',9,8,'L'],['Ceiling Fan',75,10,'F'],['Phone Charger',10,4,'P'],
  ['Laptop',65,6,'LP'],['Standing Fan',55,8,'SF'],['TV 32in',60,5,'TV'],
  ['Fridge',150,24,'FR'],['Electric Iron',1000,1,'IR'],['Water Heater',3000,0.5,'WH'],
  ['Air Conditioner',1500,6,'AC'],
] as const;

function useDebounce<T>(val: T, ms: number): T {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

type Tool = 'estimator' | 'combo' | 'splitter' | 'electricity';

export default function ToolsClient({ whatsapp }: { whatsapp: string }) {
  const [activeTool, setActiveTool] = useState<Tool>('estimator');
  
  // ── OFFLINE/ONLINE SYNC STATE: PRICE GUIDE ──
  const [priceData, setPriceData] = useState<PriceCategory[]>(DEFAULT_PRICE_DATA);
  const [selectedCat, setSelectedCat] = useState<PriceCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<PriceItem | null>(null);

  // ── OFFLINE/ONLINE SYNC STATE: COMBO ESTIMATOR ──
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbItems, setDbItems] = useState<StoreItem[]>([]);
  const [comboLoading, setComboLoading] = useState(false);
  const [comboLoaded, setComboLoaded] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStoreItems, setSelectedStoreItems] = useState<Record<string, number>>({});
  const [itemSearch, setItemSearch] = useState('');
  const dSearch = useDebounce(itemSearch, 250);

  // Splitter & Electricity state
  const [totalBill, setTotalBill] = useState('');
  const [numPeople, setNumPeople] = useState('2');
  const [selectedApps, setSelectedApps] = useState<Record<string, number>>({});
  const [tariff, setTariff] = useState('70');

  useEffect(() => { trackVisit('tools'); }, []);

  // ── THE SYNC ENGINE: PRICE GUIDE ───────────────────────────────────────
  useEffect(() => {
    // 1. Instant load from local storage
    const cachedPrices = localStorage.getItem('nexa_estimator_prices');
    if (cachedPrices) {
      try { setPriceData(JSON.parse(cachedPrices)); } catch (e) { console.error(e); }
    }

    // 2. Background sync from Supabase
    async function fetchFreshPrices() {
      if (!navigator.onLine) return; 
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'estimator_prices').single();
      
      if (data?.value && !error) {
        setPriceData(data.value as PriceCategory[]);
        localStorage.setItem('nexa_estimator_prices', JSON.stringify(data.value));
      }
    }
    fetchFreshPrices();
  }, []);

  // ── THE SYNC ENGINE: COMBO ESTIMATOR ───────────────────────────────────
  useEffect(() => {
    if (activeTool !== 'combo' || comboLoaded) return;

    // 1. Instant load from local storage
    const cachedCombo = localStorage.getItem('nexa_combo_data');
    if (cachedCombo) {
      try {
        const parsed = JSON.parse(cachedCombo);
        setDbServices(parsed.services || []);
        setDbItems(parsed.items || []);
      } catch(e) { console.error(e); }
    }

    // Stop here if offline so we don't show infinite loading spinners
    if (!navigator.onLine) {
      setComboLoaded(true);
      return;
    }

    // 2. Background sync from Supabase
    setComboLoading(true);
    Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('store_items').select('*').order('name'),
    ]).then(([s, i]) => {
      const fetchedServices = s.data ?? [];
      const fetchedItems = i.data ?? [];
      setDbServices(fetchedServices);
      setDbItems(fetchedItems);
      
      // Cache the fresh data for offline use
      localStorage.setItem('nexa_combo_data', JSON.stringify({ services: fetchedServices, items: fetchedItems }));
      setComboLoaded(true);
      setComboLoading(false);
    }).catch(() => setComboLoading(false));
  }, [activeTool, comboLoaded]);

  const filteredItems = dSearch
    ? dbItems.filter(i => i.name.toLowerCase().includes(dSearch.toLowerCase()) || (i.category ?? '').toLowerCase().includes(dSearch.toLowerCase()))
    : dbItems;

  const servicePrice = selectedService?.price ?? 0;
  const storeTotal = Object.entries(selectedStoreItems).reduce((sum, [id, qty]) => {
    const item = dbItems.find(i => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const comboTotal = Number(servicePrice) + storeTotal;
  const comboLow  = Math.round(comboTotal * (1 - MARGIN) / 100) * 100;
  const comboHigh = Math.round(comboTotal * (1 + MARGIN) / 100) * 100;

  function toggleStoreItem(id: string) {
    setSelectedStoreItems(prev => { const n = {...prev}; if(n[id]) delete n[id]; else n[id]=1; return n; });
  }
  function changeQty(id: string, delta: number) {
    setSelectedStoreItems(prev => { const n={...prev}; const v=(n[id]??0)+delta; if(v<=0) delete n[id]; else n[id]=v; return n; });
  }

  function bookEstimate() {
    if (!selectedItem) return;
    const {low, high} = range(selectedItem.mid);
    trackRequest(selectedItem.label, 'estimator_book', low);
    openWhatsApp(whatsapp, `Hi NEXA, I used the cost estimator.\nService: ${selectedItem.label}\nEstimate: ${fmt(low)} - ${fmt(high)}\nPlease confirm price and book a Pro.`);
  }

  function bookCombo() {
    const svcLabel = selectedService?.name ?? 'Service';
    const itemList = Object.entries(selectedStoreItems).map(([id,qty]) => {
      const item = dbItems.find(i => i.id === id);
      return item ? `${item.name} x${qty}` : '';
    }).filter(Boolean).join(', ');
    trackRequest(`Combo: ${svcLabel}`, 'combo_estimator', comboLow);
    openWhatsApp(whatsapp, `Hi NEXA, I used the combo estimator.\nService: ${svcLabel} (approx ${fmt(Number(servicePrice))})\n${itemList ? `Items: ${itemList}\n` : ''}Total estimate: ${fmt(comboLow)} - ${fmt(comboHigh)}\nPlease confirm and book.`);
  }

  const monthlyKwh = APPLIANCES.reduce((t, [name, watts]) => {
    const h = selectedApps[name]; return h !== undefined ? t + (watts * h * 30) / 1000 : t;
  }, 0);
  const monthlyCost = monthlyKwh * Number(tariff);

  const Tab = ({ id, label, icon }: { id: Tool; label: string; icon: string }) => (
    <button onClick={() => setActiveTool(id)}
      className={`flex-1 py-2.5 text-[0.6rem] font-bold flex flex-col items-center gap-0.5 border-b-2 transition-colors px-0.5 ${activeTool === id ? 'border-[#D4AF37] text-white' : 'border-transparent text-gray-500'}`}>
      <span className="text-sm">{icon}</span>{label}
    </button>
  );

  return (
    <>
      <section className="pt-[80px] px-5 pb-3">
        <h1 className="text-white text-[2rem] leading-tight" style={{ fontFamily: 'var(--font-headline)' }}>Campus <span className="text-[#D4AF37]">Tools</span></h1>
        <p className="text-gray-500 text-xs mt-0.5">Real NEXA prices. Works offline.</p>
      </section>

      <div className="flex border-b border-[#222] mx-5 mb-4">
        <Tab id="estimator"   label="Price Guide"   icon="🔍" />
        <Tab id="combo"       label="Job Estimate"  icon="🧮" />
        <Tab id="splitter"    label="Bill Split"    icon="✂️" />
        <Tab id="electricity" label="Power Cost"    icon="⚡" />
      </div>

      <div className="px-5 pb-10">

        {/* ── PRICE GUIDE ─────────────────────────────────────── */}
        {activeTool === 'estimator' && (
          <div>
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 mb-4 flex gap-2 items-start">
              <span className="text-base shrink-0">💡</span>
              <p className="text-gray-300 text-xs leading-relaxed">
                Real NEXA rates with <strong className="text-white">±30% negotiation margin</strong>. Final price depends on job complexity and materials. <strong className="text-[#D4AF37]">All prices are negotiable.</strong>
              </p>
            </div>

            {!selectedCat && (
              <div className="grid grid-cols-2 gap-3">
                {/* 🔄 NOW USING priceData STATE INSTEAD OF THE HARDCODED CONSTANT */}
                {priceData.map(cat => (
                  <button key={cat.id} onClick={() => { setSelectedCat(cat); setSelectedItem(null); }}
                    className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-left hover:border-[#D4AF37] transition-colors active:scale-[0.98]">
                    <span className="text-xs bg-[#D4AF37] text-black font-black px-2 py-0.5 rounded mb-2 inline-block">{cat.icon}</span>
                    <span className="text-white font-bold text-sm block">{cat.label}</span>
                    <span className="text-gray-500 text-xs">{cat.items.length} service{cat.items.length !== 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedCat && !selectedItem && (
              <div>
                <button onClick={() => setSelectedCat(null)} className="text-[#D4AF37] text-sm mb-3 flex items-center gap-1">
                  ← All categories
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs bg-[#D4AF37] text-black font-black px-2 py-0.5 rounded">{selectedCat.icon}</span>
                  <h2 className="text-white font-bold text-lg">{selectedCat.label}</h2>
                </div>
                <div className="space-y-2">
                  {selectedCat.items.map(item => {
                    const { low, high } = range(item.mid);
                    return (
                      <button key={item.id} onClick={() => setSelectedItem(item)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-left hover:border-[#D4AF37] transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">{item.label}</p>
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[#D4AF37] font-black text-sm whitespace-nowrap">{fmt(low)}</p>
                            <p className="text-gray-500 text-[0.6rem]">to {fmt(high)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedCat && selectedItem && (() => {
              const { low, high } = range(selectedItem.mid);
              return (
                <div>
                  <button onClick={() => setSelectedItem(null)} className="text-[#D4AF37] text-sm mb-3 flex items-center gap-1">
                    ← {selectedCat.label}
                  </button>
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#D4AF37]/30 rounded-2xl p-5 mb-4">
                    <p className="text-gray-400 text-xs mb-1">{selectedCat.label}</p>
                    <h2 className="text-white font-black text-base mb-4 leading-snug">{selectedItem.label}</h2>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Estimated Price Range</p>
                    <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>
                      {fmt(low)} – {fmt(high)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold px-2 py-0.5 rounded-full">±30% Margin</span>
                      <span className="bg-green-900/30 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">✓ Negotiable</span>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 mb-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2">What is Included</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.description}</p>
                    {selectedItem.minNote && <p className="text-[#D4AF37] text-xs mt-2">Note: {selectedItem.minNote}</p>}
                  </div>
                  <div className="bg-[#111] border border-[#333] rounded-xl p-4 mb-4 text-sm">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Price Breakdown</p>
                    <div className="flex justify-between text-gray-400 mb-1 text-xs"><span>Base midpoint</span><span>{fmt(selectedItem.mid)}</span></div>
                    <div className="flex justify-between text-gray-400 mb-1 text-xs"><span>Lowest (−30%)</span><span>{fmt(low)}</span></div>
                    <div className="flex justify-between text-gray-400 mb-1 text-xs"><span>Highest (+30%)</span><span>{fmt(high)}</span></div>
                    <div className="border-t border-[#333] mt-2 pt-2 flex justify-between text-white font-bold text-sm">
                      <span>Your range</span><span>{fmt(low)} – {fmt(high)}</span>
                    </div>
                  </div>
                  <button onClick={bookEstimate} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">Book at This Price →</button>
                  <button onClick={() => { setSelectedItem(null); setSelectedCat(null); }}
                    className="w-full border border-[#333] text-gray-400 font-semibold py-3 rounded-xl text-sm mt-2">Check Another Service</button>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── COMBO ESTIMATOR ─────────────────────────────────── */}
        {activeTool === 'combo' && (
          <div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Pick a <strong className="text-white">service</strong> + any <strong className="text-white">store items</strong> you need. Get one full estimate for the whole job.
            </p>
            {comboLoading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Loading live prices...</p>
              </div>
            )}
            {!comboLoading && (
              <>
                {/* Step 1 */}
                <div className="mb-5">
                  <p className="text-white font-bold text-sm mb-2">
                    <span className="bg-[#D4AF37] text-black text-xs font-black w-5 h-5 rounded-full inline-flex items-center justify-center mr-2">1</span>
                    Pick a Service
                  </p>
                  {dbServices.length > 0 ? (
                    <div className="space-y-2">
                      {dbServices.map(svc => (
                        <button key={svc.id} onClick={() => setSelectedService(p => p?.id === svc.id ? null : svc)}
                          className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-colors ${selectedService?.id === svc.id ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#333] bg-[#1a1a1a] hover:border-[#555]'}`}>
                          <div>
                            <p className="text-white font-semibold text-sm">{svc.name}</p>
                            {svc.description && <p className="text-gray-500 text-xs mt-0.5 max-w-[180px] truncate">{svc.description}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            {svc.price ? <p className="text-[#D4AF37] font-black text-sm">{fmt(Number(svc.price))}</p> : <p className="text-gray-500 text-xs">Quote on request</p>}
                            {selectedService?.id === svc.id && <span className="text-[#D4AF37] text-xs">✓ Selected</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-2">Enter a custom service price:</p>
                      <input type="number" placeholder="Service cost in Naira"
                        className="w-full bg-[#111] border border-[#444] text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]"
                        onChange={e => setSelectedService({ id:'custom', name:'Custom Service', price: Number(e.target.value), market_price:null, description:null, highlight:false, images:[], created_at:'' })} />
                    </div>
                  )}
                </div>

                {/* Step 2 */}
                <div className="mb-5">
                  <p className="text-white font-bold text-sm mb-2">
                    <span className="bg-[#D4AF37] text-black text-xs font-black w-5 h-5 rounded-full inline-flex items-center justify-center mr-2">2</span>
                    Add Materials from Store <span className="text-gray-500 text-xs font-normal">(optional)</span>
                  </p>
                  {dbItems.length > 0 ? (
                    <>
                      <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                        placeholder="Search store items..."
                        className="w-full bg-[#1a1a1a] border border-[#333] text-white px-3 py-2.5 rounded-lg text-sm mb-3 focus:outline-none focus:border-[#D4AF37]" />
                      <div className="space-y-2 max-h-[260px] overflow-y-auto">
                        {filteredItems.map(item => {
                          const isOn = !!selectedStoreItems[item.id];
                          const qty  = selectedStoreItems[item.id] ?? 0;
                          return (
                            <div key={item.id} className={`p-3 rounded-xl border transition-colors ${isOn ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#333] bg-[#1a1a1a]'}`}>
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0 mr-2 cursor-pointer" onClick={() => toggleStoreItem(item.id)}>
                                  <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                                  <p className="text-[#D4AF37] text-xs font-bold">{fmt(item.price)}</p>
                                </div>
                                {isOn ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded-full bg-[#333] text-white text-sm flex items-center justify-center">−</button>
                                    <span className="text-white text-sm font-bold w-4 text-center">{qty}</span>
                                    <button onClick={() => changeQty(item.id, 1)} className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-sm flex items-center justify-center">+</button>
                                  </div>
                                ) : (
                                  <button onClick={() => toggleStoreItem(item.id)} className="shrink-0 w-7 h-7 rounded-full bg-[#333] text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors text-lg">+</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-center">Add products in the Store admin to see them here.</p>
                  )}
                </div>

                {/* Step 3 — Result */}
                {(selectedService || Object.keys(selectedStoreItems).length > 0) ? (
                  <div>
                    <p className="text-white font-bold text-sm mb-2">
                      <span className="bg-[#D4AF37] text-black text-xs font-black w-5 h-5 rounded-full inline-flex items-center justify-center mr-2">3</span>
                      Your Total Estimate
                    </p>
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#D4AF37]/30 rounded-2xl p-5 mb-3">
                      {selectedService && (
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{selectedService.name}</span>
                          <span className="text-white font-semibold">{selectedService.price ? fmt(Number(selectedService.price)) : 'TBC'}</span>
                        </div>
                      )}
                      {Object.entries(selectedStoreItems).map(([id, qty]) => {
                        const item = dbItems.find(i => i.id === id);
                        return item ? (
                          <div key={id} className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">{item.name} ×{qty}</span>
                            <span className="text-white font-semibold">{fmt(item.price * qty)}</span>
                          </div>
                        ) : null;
                      })}
                      <div className="border-t border-[#333] mt-3 pt-3">
                        <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest">Total Range (±30%)</p>
                        <p className="text-[#D4AF37] font-black text-3xl" style={{ fontFamily: 'var(--font-headline)' }}>
                          {fmt(comboLow)} – {fmt(comboHigh)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold px-2 py-0.5 rounded-full">±30% Margin</span>
                          <span className="bg-green-900/30 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">✓ Negotiable</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={bookCombo} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">Send Full Estimate to NEXA →</button>
                    <button onClick={() => { setSelectedService(null); setSelectedStoreItems({}); setItemSearch(''); }}
                      className="w-full border border-[#333] text-gray-400 font-semibold py-3 rounded-xl text-sm mt-2">Clear & Start Over</button>
                  </div>
                ) : (
                  <div className="text-center border border-dashed border-[#333] rounded-xl py-10 text-gray-600">
                    <p className="text-3xl mb-2">🧮</p>
                    <p className="text-sm">Select a service above to start your estimate</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BILL SPLITTER ────────────────────────────────────── */}
        {activeTool === 'splitter' && (
          <div>
            <p className="text-gray-400 text-sm mb-6">Split any shared expense fairly among roommates or friends.</p>
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
              <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-2">Total Amount</label>
              <input type="number" value={totalBill} onChange={e => setTotalBill(e.target.value)} placeholder="e.g. 15000"
                className="w-full bg-[#111] border border-[#444] text-white text-xl font-bold px-4 py-3 rounded-lg mb-5 focus:outline-none focus:border-[#D4AF37]" />
              <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-2">Number of People</label>
              <div className="flex gap-2 flex-wrap mb-5">
                {[2,3,4,5,6,7,8].map(n => (
                  <button key={n} onClick={() => setNumPeople(String(n))}
                    className={`w-10 h-10 rounded-lg font-bold text-sm ${numPeople === String(n) ? 'bg-[#D4AF37] text-black' : 'bg-[#111] border border-[#444] text-white'}`}>
                    {n}
                  </button>
                ))}
              </div>
              {totalBill && Number(totalBill) > 0 && (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-5 text-center">
                  <p className="text-gray-400 text-sm mb-1">Each person pays</p>
                  <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>
                    {fmt(Math.ceil(Number(totalBill) / Number(numPeople)))}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">{fmt(Number(totalBill))} / {numPeople} people</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── POWER COST ───────────────────────────────────────── */}
        {activeTool === 'electricity' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">Estimate your monthly electricity bill. Tap an appliance to add it.</p>
            <div className="mb-4">
              <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-1">NEPA Tariff (N per kWh)</label>
              <input type="number" value={tariff} onChange={e => setTariff(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]" />
              <p className="text-gray-600 text-xs mt-1">Default N70/kWh (Band A rate)</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {APPLIANCES.map(([name, watts, defaultHours]) => {
                const isOn  = selectedApps[name] !== undefined;
                const hours = selectedApps[name] ?? defaultHours;
                return (
                  <div key={name} onClick={() => setSelectedApps(p => { const n={...p}; if(n[name]!==undefined) delete n[name]; else n[name]=Number(defaultHours); return n; })}
                    className={`rounded-xl border p-3 cursor-pointer transition-all text-center ${isOn ? 'border-[#D4AF37] bg-[#1a1a1a]' : 'border-[#333] bg-[#111]'}`}>
                    <span className="text-white font-bold text-xs block">{name}</span>
                    <span className="text-gray-500 text-[0.65rem]">{watts}W</span>
                    {isOn && (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <input type="number" value={hours}
                          onChange={e => setSelectedApps(p => ({ ...p, [name]: Number(e.target.value) }))}
                          className="w-full bg-black/30 text-white text-xs text-center rounded px-1 py-0.5 border border-[#D4AF37]/40"
                          min="0" max="24" />
                        <span className="text-[0.6rem] text-gray-500">hrs/day</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {monthlyKwh > 0 ? (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#D4AF37]/30 rounded-2xl p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">Estimated Monthly</p>
                <p className="text-white font-black text-2xl mb-1" style={{ fontFamily: 'var(--font-headline)' }}>{monthlyKwh.toFixed(1)} kWh</p>
                <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>{fmt(Math.round(monthlyCost))}</p>
                <p className="text-gray-500 text-xs mt-2">At N{tariff}/kWh · {Object.keys(selectedApps).length} appliances</p>
              </div>
            ) : (
              <div className="text-center border border-dashed border-[#333] rounded-xl py-8 text-gray-600">
                <p className="text-2xl mb-2">⚡</p>
                <p className="text-sm">Tap appliances above to calculate</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
