import React, { useState, useEffect } from 'react';

// =================================================================
// ✨ ฟังก์ชันปรับปรุงใหม่: จัดรูปแบบเบอร์โทรศัพท์ให้เป็น 0XX-XXXXXXX (มีขีดเดียวหลัง 3 ตัวแรก)
// =================================================================
const formatPhoneNumber = (phone) => {
  if (!phone || phone === '-') return '-';
  
  // ลบอักขระที่ไม่ใช่ตัวเลขออกก่อน
  const cleaned = ('' + phone).replace(/\D/g, '');
  
  // ถ้าครบ 10 หลัก ให้ตัดแบ่งเป็น 3 หลักแรก คั่นด้วยขีด แล้วตามด้วย 7 หลักที่เหลือ
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  
  // ในกรณีข้อมูลเก่าที่อาจจะมีขีดค้างอยู่ ให้ล้างออกแล้วจัดรูปใหม่ให้ตรงกันหมด
  const rawString = phone.replace(/-/g, '');
  if (rawString.length === 10) {
    return `${rawString.slice(0, 3)}-${rawString.slice(3)}`;
  }
  
  return phone;
};

// =================================================================
// 1. COMPONENT หลัก (ใช้ export default แค่ตัวเดียวที่นี่)
// =================================================================
export default function Sellerqueues({ user, eventData }) {
  const [activeTab, setActiveTab] = useState('current'); 
  
  // โหลดข้อมูลเริ่มต้นจาก localStorage
  const [currentQueues, setCurrentQueues] = useState(() => {
    const localData = localStorage.getItem('seller_current_queues');
    return localData ? JSON.parse(localData) : [
      { id: 'A001', name: 'คุณนัท', time: '13:00', phone: '0812345678' },
      { id: 'A002', name: 'คุณบี', time: '13:15', phone: '0823456789' },
      { id: 'A003', name: 'คุณเจ', time: '13:30', phone: '0834567890' },
    ];
  });

  const [historyQueues, setHistoryQueues] = useState(() => {
    const localData = localStorage.getItem('seller_history_queues');
    return localData ? JSON.parse(localData) : [
      { id: 'A000', name: 'คุณเอ', time: '12:45', completedTime: '12:55' }
    ];
  });

  const [missedQueues, setMissedQueues] = useState(() => {
    const localData = localStorage.getItem('seller_missed_queues');
    return localData ? JSON.parse(localData) : [];
  });

  // จำตัวเลขคิวล่าสุดที่เคยออกตั๋วไป
  const [lastQueueNumber, setLastQueueNumber] = useState(() => {
    const localNumber = localStorage.getItem('seller_last_queue_number');
    return localNumber ? parseInt(localNumber, 10) : 3;
  });

  // useEffect เซฟข้อมูลลง localStorage อัตโนมัติเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('seller_current_queues', JSON.stringify(currentQueues));
  }, [currentQueues]);

  useEffect(() => {
    localStorage.setItem('seller_history_queues', JSON.stringify(historyQueues));
  }, [historyQueues]);

  useEffect(() => {
    localStorage.setItem('seller_missed_queues', JSON.stringify(missedQueues));
  }, [missedQueues]);

  useEffect(() => {
    localStorage.setItem('seller_last_queue_number', lastQueueNumber.toString());
  }, [lastQueueNumber]);


  // ฟังก์ชัน: ย้ายคิวปัจจุบัน -> คิวสำเร็จ
  const handleCompleteQueue = (id) => {
    const queueToComplete = currentQueues.find(q => q.id === id);
    if (!queueToComplete) return;

    const now = new Date();
    const completedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setHistoryQueues([...historyQueues, { ...queueToComplete, completedTime }]);
    setCurrentQueues(currentQueues.filter(q => q.id !== id));
  };

  // ฟังก์ชัน: ย้ายคิวปัจจุบัน -> คิวที่มาไม่ทัน
  const handleMissedQueue = (id) => {
    const queueToMiss = currentQueues.find(q => q.id === id);
    if (!queueToMiss) return;

    setMissedQueues([...missedQueues, queueToMiss]);
    setCurrentQueues(currentQueues.filter(q => q.id !== id));
  };

  // ฟังก์ชัน: ย้ายคิวที่มาไม่ทัน (มาสาย) -> คิวสำเร็จ
  const handleMissedToComplete = (id) => {
    const queueToComplete = missedQueues.find(q => q.id === id);
    if (!queueToComplete) return;

    const now = new Date();
    const completedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setHistoryQueues([...historyQueues, { ...queueToComplete, completedTime }]);
    setMissedQueues(missedQueues.filter(q => q.id !== id));
  };

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Manage Booth Queues</h2>
          <p className="text-sm text-slate-500 mt-1">จัดการคิวและประวัติการเข้าบูธของคุณ</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-gray-200/60 p-1 rounded-xl w-full lg:w-auto text-center gap-0.5">
          <button 
            type="button"
            onClick={() => setActiveTab('current')}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all truncate ${activeTab === 'current' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
          >
            คิวปัจจุบัน ({currentQueues.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all truncate ${activeTab === 'history' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
          >
            คิวสำเร็จ ({historyQueues.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('missed')}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all truncate ${activeTab === 'missed' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
          >
            มาไม่ทัน ({missedQueues.length})
          </button>
        </div>
      </div>

      {/* ส่วนแสดงผล Component ย่อยตามแท็บที่เลือก */}
      <div className="mt-4">
        {activeTab === 'current' && (
          <CurrentQueue 
            currentQueues={currentQueues} 
            setCurrentQueues={setCurrentQueues}
            lastQueueNumber={lastQueueNumber}
            setLastQueueNumber={setLastQueueNumber}
            onComplete={handleCompleteQueue}
            onMissed={handleMissedQueue}
          />
        )}

        {activeTab === 'history' && (
          <QueueHistory historyQueues={historyQueues} />
        )}

        {activeTab === 'missed' && (
          <MissedQueue missedQueues={missedQueues} onActionComplete={handleMissedToComplete} />
        )}
      </div>
    </div>
  );
}

// =================================================================
// 2. COMPONENT ย่อย: คิวปัจจุบันและการเพิ่มคิว
// =================================================================
function CurrentQueue({ currentQueues, setCurrentQueues, lastQueueNumber, setLastQueueNumber, onComplete, onMissed }) {
  const [customerName, setCustomerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // ฟังก์ชันดักจับการพิมพ์: ยอมรับเฉพาะตัวเลข และไม่เกิน 10 ตัว
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const onlyNums = value.replace(/[^0-9]/g, '');
    if (onlyNums.length <= 10) {
      setContactPhone(onlyNums);
    }
  };

  const handleAddQueue = (e) => {
    e.preventDefault();
    if (!customerName) return;

    if (contactPhone && contactPhone.length !== 10) {
      alert('⚠️ กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (ขณะนี้กรอกไป ' + contactPhone.length + ' หลัก)');
      return;
    }

    const nextNumber = lastQueueNumber + 1;
    const nextId = `A${String(nextNumber).padStart(3, '0')}`;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newQueue = {
      id: nextId,
      name: customerName,
      time: currentTime,
      phone: contactPhone || '-', 
    };

    setCurrentQueues([...currentQueues, newQueue]);
    setLastQueueNumber(nextNumber);
    setCustomerName('');
    setContactPhone('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ฟอร์มเพิ่มคิว */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-sm h-fit">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-purple-600 font-extrabold">+</span> เพิ่มคิวลูกค้าใหม่
        </h3>
        <form onSubmit={handleAddQueue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ชื่อลูกค้า</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="เช่น คุณสมชาย" 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">เบอร์โทรศัพท์ (ถ้ามี)</label>
              {contactPhone.length > 0 && (
                <span className={`text-[11px] font-bold ${contactPhone.length === 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {contactPhone.length}/10 หลัก
                </span>
              )}
            </div>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={contactPhone}
              onChange={handlePhoneChange}
              placeholder="เช่น 08XXXXXXXX" 
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm ${
                contactPhone && contactPhone.length !== 10 
                  ? 'border-amber-300 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/20' 
                  : 'border-gray-200 focus:ring-purple-500/20 focus:border-purple-500'
              }`}
            />
          </div>
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm">
            ออกบัตรคิว
          </button>
        </form>
      </div>

      {/* รายการคิวปัจจุบัน */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-gray-100">
          {currentQueues.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-sm">ไม่มีคิวที่รอดำเนินการในขณะนี้</div>
          ) : (
            currentQueues.map((queue, index) => (
              <div key={queue.id} className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-600 text-base">{queue.id}</span>
                    {index === 0 && (
                      <span className="inline-block bg-amber-500 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse">Next</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">เวลาจอง: {queue.time} น.</span>
                </div>
                
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{queue.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">ติดต่อ: {formatPhoneNumber(queue.phone)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button 
                    type="button"
                    onClick={() => onComplete(queue.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors text-center"
                  >
                    ลูกค้ามาแล้ว ✅
                  </button>
                  <button 
                    type="button"
                    onClick={() => onMissed(queue.id)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold py-2 px-3 rounded-xl transition-colors text-center"
                  >
                    ข้ามคิว ↩
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop/Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-50/50 border-b border-purple-100 text-purple-700 text-sm font-semibold">
                <th className="p-4 pl-6">หมายเลขคิว</th>
                <th className="p-4">ชื่อลูกค้า</th>
                <th className="p-4">เวลาจอง</th>
                <th className="p-4 text-center">จัดการคิว</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {currentQueues.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center p-8 text-slate-400">ไม่มีคิวที่รอดำเนินการในขณะนี้</td>
                </tr>
              ) : (
                currentQueues.map((queue, index) => (
                  <tr key={queue.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6 font-bold text-purple-600">
                      {index === 0 && <span className="inline-block bg-amber-500 text-white text-[10px] uppercase px-1.5 py-0.5 rounded mr-2 animate-pulse">Next</span>}
                      {queue.id}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{queue.name}</div>
                      <div className="text-xs text-slate-400">ติดต่อ: {formatPhoneNumber(queue.phone)}</div>
                    </td>
                    <td className="p-4 text-slate-500">{queue.time} น.</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => onComplete(queue.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                        >
                          ลูกค้ามาแล้ว ✅
                        </button>
                        <button 
                          type="button"
                          onClick={() => onMissed(queue.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                        >
                          ข้ามคิว ↩
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// =================================================================
// 3. COMPONENT ย่อย: คิวที่มาไม่ทันเวลา
// =================================================================
function MissedQueue({ missedQueues = [] , onActionComplete }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">คิวที่มาไม่ทันเวลา (Missed)</h3>
      </div>
      
      {/* Mobile View */}
      <div className="block md:hidden divide-y divide-gray-100">
        {missedQueues.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-sm">ไม่มีคิวที่ถูกข้าม</div>
        ) : (
          missedQueues.map((queue) => (
            <div key={queue.id} className="p-4 space-y-3 text-sm bg-white">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-500">{queue.id}</span>
                <span className="inline-flex items-center bg-rose-50 text-rose-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                  มาไม่ทันคิว
                </span>
              </div>
              <div>
                <div className="font-medium text-slate-800">{queue.name || 'ไม่ระบุชื่อ'}</div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>เวลาเดิม: {queue.time ? `${queue.time} น.` : '-'}</span>
                  <span>เบอร์: {formatPhoneNumber(queue.phone)}</span>
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onActionComplete(queue.id)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors text-center"
                >
                  ลูกค้ามาสายมาแล้ว ✅
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/Tablet View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-purple-50/50 border-b border-purple-100 text-purple-700 text-sm font-semibold">
              <th className="p-4 pl-6">หมายเลขคิว</th>
              <th className="p-4">ชื่อลูกค้า</th>
              <th className="p-4">เวลาจองเดิม</th>
              <th className="p-4">เบอร์ติดต่อ</th>
              <th className="p-4 text-center">จัดการคิวมาสาย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {missedQueues.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-8 text-slate-400">ไม่มีคิวที่ถูกข้าม</td>
              </tr>
            ) : (
              missedQueues.map((queue) => (
                <tr key={queue.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-6 font-semibold text-rose-500">{queue.id}</td>
                  <td className="p-4 font-medium text-slate-800">{queue.name || 'ไม่ระบุชื่อ'}</td>
                  <td className="p-4">{queue.time ? `${queue.time} น.` : '-'}</td>
                  <td className="p-4">{formatPhoneNumber(queue.phone)}</td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button 
                        type="button"
                        onClick={() => onActionComplete(queue.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                      >
                        ลูกค้ามาแล้ว ✅
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================================================================
// 4. COMPONENT ย่อย: ประวัติคิวสำเร็จ
// =================================================================
function QueueHistory({ historyQueues }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">ประวัติการเข้าบูธสำเร็จ</h3>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden divide-y divide-gray-100">
        {historyQueues.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-sm">ยังไม่มีประวัติคิวที่เสร็จสิ้น</div>
        ) : (
          historyQueues.map((queue) => (
            <div key={queue.id} className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">{queue.id}</span>
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                  เข้ารับบริการแล้ว
                </span>
              </div>
              <div className="font-medium text-slate-800">{queue.name}</div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>เวลาจอง: {queue.time} น.</span>
                <span className="text-purple-600 font-medium">เข้าบูธเมื่อ: {queue.completedTime} น.</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Desktop/Tablet View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-purple-50/50 border-b border-purple-100 text-purple-700 text-sm font-semibold">
              <th className="p-4 pl-6">หมายเลขคิว</th>
              <th className="p-4">ชื่อลูกค้า</th>
              <th className="p-4">เวลาจอง</th>
              <th className="p-4">เวลาที่เข้าบูธ</th>
              <th className="p-4 text-emerald-600 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {historyQueues.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-8 text-slate-400">ยังไม่มีประวัติคิวที่เสร็จสิ้น</td>
              </tr>
            ) : (
              historyQueues.map((queue) => (
                <tr key={queue.id} className="text-slate-600">
                  <td className="p-4 pl-6 font-semibold">{queue.id}</td>
                  <td className="p-4 font-medium text-slate-800">{queue.name}</td>
                  <td className="p-4">{queue.time} น.</td>
                  <td className="p-4 text-slate-500">{queue.completedTime} น.</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                      เข้ารับบริการแล้ว
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}