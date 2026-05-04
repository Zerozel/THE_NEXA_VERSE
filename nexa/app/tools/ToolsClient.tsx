'use client';
// app/tools/ToolsClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// MICRO-TOOLS MODULE — zero database calls, pure client-side logic.
//
// Tools included:
//   1. COST ESTIMATOR — guided repair price calculator
//      User picks service type → job details → gets a realistic price range.
//      Uses real market data compiled from NEXA job history.
//
//   2. BILL SPLITTER — split expenses among roommates
//      Enter total + number of people → instant per-person amount.
//
//   3. ELECTRICITY ESTIMATOR — estimate appliance power costs
//      Pick appliances, enter hours/day, get monthly cost estimate.
//
// WHY NO DATABASE:
//   These tools work entirely offline. Price data is hardcoded from real
//   NEXA job knowledge. This is the highest-retention feature — users
//   return just to check prices, not necessarily to book.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { trackVisit, trackRequest } from '@/lib/analytics';
import { openWhatsApp } from '@/lib/whatsapp';

// ── PRICE DATA ────────────────────────────────────────────────────────────
// Format: { id, label, icon, questions: [{ id, label, options: [{ label, priceAdd }] }], basePrice, unit }
const SERVICES_DATA = [
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    basePrice: 2000,
    description: 'Wiring, sockets, fans, lighting',
    questions: [
      {
        id: 'scope',
        label: 'What needs fixing?',
        options: [
          { label: 'Socket / Switch',    priceAdd: 0    },
          { label: 'Ceiling fan',        priceAdd: 1000 },
          { label: 'Full wiring (room)', priceAdd: 5000 },
          { label: 'Solar installation', priceAdd: 15000 },
        ],
      },
      {
        id: 'urgency',
        label: 'When do you need it?',
        options: [
          { label: 'Within 2 hours',  priceAdd: 1000 },
          { label: 'Today',           priceAdd: 500  },
          { label: 'This week',       priceAdd: 0    },
        ],
      },
    ],
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    basePrice: 2000,
    description: 'Taps, pipes, drainage, water supply',
    questions: [
      {
        id: 'scope',
        label: 'What is the issue?',
        options: [
          { label: 'Leaking tap',      priceAdd: 0    },
          { label: 'Burst pipe',       priceAdd: 2000 },
          { label: 'Blocked drain',    priceAdd: 1500 },
          { label: 'New toilet seat',  priceAdd: 3000 },
        ],
      },
      {
        id: 'access',
        label: 'How accessible is it?',
        options: [
          { label: 'Easy access',  priceAdd: 0    },
          { label: 'Tight space',  priceAdd: 1000 },
          { label: 'Under floor',  priceAdd: 3000 },
        ],
      },
    ],
  },
  {
    id: 'painting',
    label: 'Painting',
    icon: '🎨',
    basePrice: 5000,
    description: 'Interior, exterior, furniture',
    questions: [
      {
        id: 'surface',
        label: 'What surface?',
        options: [
          { label: 'Single wall',       priceAdd: 0     },
          { label: 'Full room',         priceAdd: 10000 },
          { label: 'Full apartment',    priceAdd: 35000 },
          { label: 'Furniture / gate',  priceAdd: 3000  },
        ],
      },
      {
        id: 'coats',
        label: 'How many coats?',
        options: [
          { label: '1 coat',   priceAdd: 0    },
          { label: '2 coats',  priceAdd: 2000 },
          { label: '3 coats',  priceAdd: 4000 },
        ],
      },
    ],
  },
  {
    id: 'carpentry',
    label: 'Carpentry',
    icon: '🪚',
    basePrice: 3000,
    description: 'Doors, furniture, roofing',
    questions: [
      {
        id: 'job',
        label: 'What is the job?',
        options: [
          { label: 'Door repair',      priceAdd: 0     },
          { label: 'Wardrobe fix',     priceAdd: 2000  },
          { label: 'New shelf',        priceAdd: 5000  },
          { label: 'Roof repair',      priceAdd: 15000 },
        ],
      },
    ],
  },
  {
    id: 'ac',
    label: 'AC / Appliance',
    icon: '❄️',
    basePrice: 3500,
    description: 'AC service, gas refill, repairs',
    questions: [
      {
        id: 'service',
        label: 'What service?',
        options: [
          { label: 'AC cleaning / service', priceAdd: 0    },
          { label: 'Gas refill',            priceAdd: 3000 },
          { label: 'Full installation',     priceAdd: 8000 },
          { label: 'Fault diagnosis',       priceAdd: 1500 },
        ],
      },
    ],
  },
];

// Electricity data: [name, watts, typical daily hours, icon]
const APPLIANCES = [
  ['LED Bulb',        9,    8,  '💡'],
  ['Ceiling Fan',     75,   10, '🌀'],
  ['Phone Charger',   10,   4,  '📱'],
  ['Laptop',          65,   6,  '💻'],
  ['Standing Fan',    55,   8,  '💨'],
  ['TV (32")',        60,   5,  '📺'],
  ['Fridge',          150,  24, '🧊'],
  ['Electric Iron',   1000, 1,  '👕'],
  ['Water Heater',    3000, 0.5,'🚿'],
  ['Air Conditioner', 1500, 6,  '❄️'],
] as const;

type Tool = 'estimator' | 'splitter' | 'electricity';

export default function ToolsClient({ whatsapp }: { whatsapp: string }) {
  const [activeTool, setActiveTool] = useState<Tool>('estimator');

  // Estimator state
  const [selectedService, setSelectedService] = useState<typeof SERVICES_DATA[0] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  // Bill splitter state
  const [totalBill, setTotalBill] = useState('');
  const [numPeople, setNumPeople] = useState('2');

  // Electricity state
  const [selectedAppliances, setSelectedAppliances] = useState<Record<string, number>>({});
  const [tariff, setTariff] = useState('70'); // ₦ per kWh (NEPA rate estimate)

  useEffect(() => { trackVisit('tools'); }, []);

  // ── ESTIMATOR LOGIC ────────────────────────────────────────────────────
  function selectService(svc: typeof SERVICES_DATA[0]) {
    setSelectedService(svc);
    setAnswers({});
    setShowResult(false);
  }

  function selectAnswer(questionId: string, priceAdd: number) {
    const newAnswers = { ...answers, [questionId]: priceAdd };
    setAnswers(newAnswers);
    if (selectedService && Object.keys(newAnswers).length >= selectedService.questions.length) {
      setShowResult(true);
    }
  }

  function getEstimate() {
    if (!selectedService) return { low: 0, high: 0 };
    const total = selectedService.basePrice + Object.values(answers).reduce((s, v) => s + v, 0);
    // Add ±20% range to account for real-world variation
    return { low: Math.round(total * 0.85), high: Math.round(total * 1.25) };
  }

  function bookEstimate() {
    if (!selectedService) return;
    const { low, high } = getEstimate();
    trackRequest(selectedService.label, 'estimator_book', low);
    openWhatsApp(whatsapp, `Hi NEXA, I used your cost estimator and need: ${selectedService.label} (estimated ₦${low.toLocaleString()}–₦${high.toLocaleString()}). Can you send a Pro?`);
  }

  // ── ELECTRICITY LOGIC ─────────────────────────────────────────────────
  function toggleAppliance(name: string, defaultHours: number) {
    setSelectedAppliances(prev => {
      const next = { ...prev };
      if (next[name] !== undefined) delete next[name];
      else next[name] = defaultHours;
      return next;
    });
  }

  function getMonthlyKwh(): number {
    return APPLIANCES.reduce((total, [name, watts]) => {
      const hours = selectedAppliances[name];
      if (hours === undefined) return total;
      return total + (watts * hours * 30) / 1000;
    }, 0);
  }

  const monthlyKwh = getMonthlyKwh();
  const monthlyCost = monthlyKwh * Number(tariff);

  const Tab = ({ id, label, icon }: { id: Tool; label: string; icon: string }) => (
    <button onClick={() => setActiveTool(id)}
      className={`flex-1 py-3 text-sm font-semibold flex flex-col items-center gap-0.5 transition-colors border-b-2 ${activeTool === id ? 'border-[#D4AF37] text-white' : 'border-transparent text-gray-500'}`}>
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      <section className="pt-[80px] px-5 pb-4">
        <h1 className="text-white text-[2rem] leading-tight mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
          Campus <span className="text-[#D4AF37]">Tools</span>
        </h1>
        <p className="text-gray-500 text-sm">Free tools that work offline. No signup needed.</p>
      </section>

      {/* Tab Bar */}
      <div className="flex border-b border-[#222] mx-5 mb-5">
        <Tab id="estimator"   label="Cost Estimator"  icon="🔍" />
        <Tab id="splitter"    label="Bill Splitter"   icon="✂️" />
        <Tab id="electricity" label="Power Calculator" icon="⚡" />
      </div>

      <div className="px-5 pb-10">

        {/* ── COST ESTIMATOR ─────────────────────────────────────── */}
        {activeTool === 'estimator' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Get a realistic price range for any repair before you call. Based on real NEXA job data.
            </p>

            {/* Service selector */}
            {!selectedService && (
              <div className="grid grid-cols-2 gap-3">
                {SERVICES_DATA.map(svc => (
                  <button key={svc.id} onClick={() => selectService(svc)}
                    className="estimator-option bg-[#1a1a1a] border-[#333] text-white hover:border-[#D4AF37]">
                    <span className="text-2xl block mb-1">{svc.icon}</span>
                    <span className="font-bold text-sm block">{svc.label}</span>
                    <span className="text-gray-500 text-xs">{svc.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Questions */}
            {selectedService && !showResult && (
              <div>
                <button onClick={() => setSelectedService(null)} className="text-[#D4AF37] text-sm mb-4 flex items-center gap-1">
                  ← Change service
                </button>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 mb-4">
                  <span className="text-2xl">{selectedService.icon}</span>
                  <span className="text-white font-bold ml-2">{selectedService.label}</span>
                  <p className="text-gray-400 text-xs mt-0.5">Starting from ₦{selectedService.basePrice.toLocaleString()}</p>
                </div>

                {selectedService.questions.map((q, qi) => {
                  const isActive = qi === 0 || answers[selectedService.questions[qi - 1]?.id] !== undefined;
                  if (!isActive) return null;
                  return (
                    <div key={q.id} className="mb-5">
                      <p className="text-white font-semibold text-sm mb-3">{q.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map(opt => (
                          <button key={opt.label} onClick={() => selectAnswer(q.id, opt.priceAdd)}
                            className={`estimator-option text-sm ${answers[q.id] === opt.priceAdd ? 'active bg-[#1a1a1a] border-[#D4AF37]' : 'bg-[#111] border-[#333]'} text-white`}>
                            <span className="font-semibold block">{opt.label}</span>
                            {opt.priceAdd > 0 && <span className="text-[#D4AF37] text-xs">+₦{opt.priceAdd.toLocaleString()}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Result */}
            {selectedService && showResult && (() => {
              const { low, high } = getEstimate();
              return (
                <div>
                  <button onClick={() => { setAnswers({}); setShowResult(false); }} className="text-[#D4AF37] text-sm mb-4 flex items-center gap-1">← Recalculate</button>
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#D4AF37]/30 rounded-2xl p-6 text-center mb-4">
                    <p className="text-gray-400 text-sm mb-2">{selectedService.icon} {selectedService.label} — Estimated Cost</p>
                    <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>
                      ₦{low.toLocaleString()} – ₦{high.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-3">Actual price depends on site conditions. Get a confirmed quote via WhatsApp.</p>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 mb-4 text-sm">
                    <p className="text-white font-semibold mb-2">What's included:</p>
                    {selectedService.questions.map(q => {
                      const selected = q.options.find(o => o.priceAdd === answers[q.id]);
                      return selected ? (
                        <div key={q.id} className="flex justify-between text-gray-400 mb-1">
                          <span>{selected.label}</span>
                          <span>{selected.priceAdd > 0 ? `+₦${selected.priceAdd.toLocaleString()}` : 'Included'}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="flex justify-between text-white font-bold border-t border-[#333] mt-2 pt-2">
                      <span>Base rate</span><span>₦{selectedService.basePrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={bookEstimate} className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">
                    Book a Pro at this Price →
                  </button>
                  <button onClick={() => { setSelectedService(null); setAnswers({}); setShowResult(false); }}
                    className="w-full border border-[#333] text-gray-400 font-semibold py-3 rounded-xl text-sm mt-2">
                    Start Over
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── BILL SPLITTER ─────────────────────────────────────── */}
        {activeTool === 'splitter' && (
          <div>
            <p className="text-gray-400 text-sm mb-6">Split any shared expense fairly among roommates or friends.</p>
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
              <div className="mb-4">
                <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-2">Total Amount (₦)</label>
                <input type="number" value={totalBill} onChange={e => setTotalBill(e.target.value)}
                  placeholder="e.g. 15000" className="w-full bg-[#111] border border-[#444] text-white text-xl font-bold px-4 py-3 rounded-lg focus:outline-none focus:border-[#D4AF37]" />
              </div>
              <div className="mb-6">
                <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-2">Number of People</label>
                <div className="flex gap-2">
                  {[2,3,4,5,6,7,8].map(n => (
                    <button key={n} onClick={() => setNumPeople(String(n))}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${numPeople === String(n) ? 'bg-[#D4AF37] text-black' : 'bg-[#111] border border-[#444] text-white'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {totalBill && Number(totalBill) > 0 && (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-5 text-center">
                  <p className="text-gray-400 text-sm mb-1">Each person pays</p>
                  <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>
                    ₦{Math.ceil(Number(totalBill) / Number(numPeople)).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    ₦{Number(totalBill).toLocaleString()} ÷ {numPeople} people
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ELECTRICITY CALCULATOR ────────────────────────────── */}
        {activeTool === 'electricity' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">Estimate your monthly electricity cost. Tap to add appliances.</p>
            <div className="mb-4">
              <label className="text-gray-400 text-xs uppercase tracking-wider font-bold block mb-2">NEPA Tariff (₦ per kWh)</label>
              <input type="number" value={tariff} onChange={e => setTariff(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#D4AF37]" />
              <p className="text-gray-600 text-xs mt-1">Default ₦70/kWh (Nigerian Band A rate, ~2024)</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {APPLIANCES.map(([name, watts, defaultHours, icon]) => {
                const isOn = selectedAppliances[name] !== undefined;
                const hours = selectedAppliances[name] ?? defaultHours;
                return (
                  <div key={name} onClick={() => toggleAppliance(name, defaultHours)}
                    className={`estimator-option cursor-pointer transition-all ${isOn ? 'active bg-[#1a1a1a] border-[#D4AF37]' : 'bg-[#111] border-[#333]'} text-white`}>
                    <span className="text-xl block mb-0.5">{icon}</span>
                    <span className="font-semibold text-xs block">{name}</span>
                    <span className="text-gray-500 text-[0.65rem]">{watts}W</span>
                    {isOn && (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <input type="number" value={hours}
                          onChange={e => setSelectedAppliances(prev => ({ ...prev, [name]: Number(e.target.value) }))}
                          className="w-full bg-black/30 text-white text-xs text-center rounded px-1 py-0.5 border border-[#D4AF37]/40"
                          min="0" max="24" placeholder="hrs/day" />
                        <span className="text-[0.6rem] text-gray-500">hrs/day</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {monthlyKwh > 0 && (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#D4AF37]/30 rounded-2xl p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">Estimated Monthly Usage</p>
                <p className="text-white font-black text-3xl mb-1" style={{ fontFamily: 'var(--font-headline)' }}>
                  {monthlyKwh.toFixed(1)} kWh
                </p>
                <p className="text-[#D4AF37] font-black text-4xl" style={{ fontFamily: 'var(--font-headline)' }}>
                  ₦{Math.round(monthlyCost).toLocaleString()}
                </p>
                <p className="text-gray-500 text-xs mt-2">At ₦{tariff}/kWh · {Object.keys(selectedAppliances).length} appliances selected</p>
              </div>
            )}
            {monthlyKwh === 0 && (
              <div className="text-center text-gray-600 py-8 border border-dashed border-[#333] rounded-xl">
                <p className="text-3xl mb-2">⚡</p>
                <p className="text-sm">Tap appliances above to calculate your estimated monthly bill</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
