import { useState, useEffect, useRef } from 'react';
import StorePage from './StorePage';
import { db } from './firebase'; 
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function BoothMap({ onRequireAuth, user }) {
  const [selectedDate, setSelectedDate] = useState("30/5/2026");
  const [activeBooth, setActiveBooth] = useState(null);
  const [boothsData, setBoothsData] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef(null);

  // 1. ดึงข้อมูลจาก Firestore
  useEffect(() => {
    const fetchBooths = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "booths"),
          where("event_date", "==", selectedDate),
          orderBy("id", "asc")
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBoothsData(data);
      } catch (error) {
        console.error("Error fetching booths: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooths();
  }, [selectedDate]);

  const getBoothStyle = (booth_id) => {
    const docIndex = boothsData.findIndex(booth => booth.boothNumbers?.includes(booth_id));

    if (docIndex === -1) {
      return { 
        data: null, 
        classes: 'bg-white hover:bg-gray-50 text-gray-300 border-gray-200' 
      };
    }

    const isEvenGroup = docIndex % 2 === 0;
    const data = boothsData[docIndex];
    const textClass = isEvenGroup ? 'text-pink-600' : 'text-black';
    
    return { 
      data: data, 
      classes: `bg-white font-black shadow-sm border-black hover:bg-gray-100 ${textClass}` 
    };
  };

  const handleBoothClick = (booth_id) => {
    const { data } = getBoothStyle(booth_id);
    if (data) {
      setActiveBooth(data);
    } else {
      // ใช้ Modal หรือ Toast แทน alert จะดูพรีเมียมกว่าในมือถือ
      console.log(`บูธ ${booth_id} ยังว่างอยู่`);
    }
  };

  // --- ปรับปรุงระบบ Zoom ให้ Responsive ---
  useEffect(() => {
    const autoZoom = () => {
      if (!activeBooth && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // ปรับ MapIdealWidth ให้เล็กลงสำหรับมือถือเพื่อให้เห็นภาพรวมง่ายขึ้น
        const mapIdealWidth = window.innerWidth < 768 ? 1650 : 1550; 
        const newZoom = containerWidth / mapIdealWidth;
        setZoomLevel(newZoom < 1 ? newZoom : 0.8); // เริ่มต้นที่ 80% ในจอคอม
      }
    };
    autoZoom();
    window.addEventListener('resize', autoZoom);
    return () => window.removeEventListener('resize', autoZoom);
  }, [activeBooth, loading]);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.2));

  const renderRowHorizontal = (letter, start, end) => {
    let booths = [];
    for (let i = start; i <= end; i++) {
      const numStr = i.toString().padStart(2, '0');
      const booth_id = `${letter}${numStr}`;
      const { classes } = getBoothStyle(booth_id);
      
      booths.push(
        <button
          key={booth_id}
          onClick={() => handleBoothClick(booth_id)}
          className={`w-8 h-8 text-[10px] border rounded flex items-center justify-center transition-all shrink-0 ${classes}`}
        >
          {numStr}
        </button>
      );
      if (i === 16) booths.push(<div key={`gap-${i}`} className="w-20 shrink-0" />);
      else if ([4, 8, 12, 20, 24, 28].includes(i)) booths.push(<div key={`gap-${i}`} className="w-4 shrink-0" />);
    }
    return (
      <div className="flex items-center justify-between bg-cyan-50 p-4 rounded-xl border border-cyan-200 mb-6 shadow-sm w-full min-w-max">
        <span className="text-3xl font-black text-cyan-800 w-10 shrink-0 text-left">{letter}</span>
        <div className="flex gap-1 flex-nowrap justify-center flex-1 mx-4">{booths}</div>
        <span className="text-3xl font-black text-cyan-800 w-10 shrink-0 text-right">{letter}</span>
      </div>
    );
  };

  const renderColumnVertical = (letter, start, end, type = 'center') => {
    let booths = [];
    for (let i = end; i >= start; i--) { 
      const numStr = i.toString().padStart(2, '0');
      const booth_id = `${letter}${numStr}`;
      const { classes } = getBoothStyle(booth_id);
      
      booths.push(
        <button
          key={booth_id}
          onClick={() => handleBoothClick(booth_id)}
          className={`w-10 h-7 text-[10px] border rounded flex items-center justify-center transition-all shrink-0 ${classes}`}
        >
          {numStr}
        </button>
      );
      if (type === 'side') {
        if (i === 17) booths.push(<div key={`gap-${i}`} className="h-20 shrink-0" />);
        else if ([29, 25, 21, 13, 9, 5].includes(i)) booths.push(<div key={`gap-${i}`} className="h-4 shrink-0" />);
      } 
      else if (type === 'center') {
        if ([31, 27, 21, 15, 9, 5].includes(i)) booths.push(<div key={`gap-${i}`} className="h-4 shrink-0" />);
      }
    }
    return (
      <div className="flex flex-col gap-1 items-center bg-cyan-50 px-2 py-3 rounded-xl border border-cyan-200 shadow-sm shrink-0">
        <span className="text-xl font-black text-cyan-800 mb-2">{letter}</span>
        {booths}
        <span className="text-xl font-black text-cyan-800 mt-2">{letter}</span>
      </div>
    );
  };

  if (activeBooth) {
    return <StorePage activeBooth={activeBooth} onBack={() => setActiveBooth(null)} onRequireAuth={onRequireAuth} user={user}/>;
  }

  return (
    <div className="bg-white p-2 md:p-6 rounded-3xl shadow-sm border border-gray-100 w-full overflow-hidden">
      {/* ส่วนเลือกวันที่: ปรับให้เลื่อนได้ในมือถือ (Scrollable) */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 pb-2 px-2 justify-start md:justify-center">
        {["30/5/2026", "31/5/2026"].map((date, idx) => {
          const displayDate = date === "30/5/2026" ? "30 May" : "31 May";
          return (
            <button 
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all text-sm md:text-base ${selectedDate === date ? "bg-pink-500 text-white shadow-md" : "bg-gray-100 text-gray-600"}`}
            >
              Day {idx + 1}: {displayDate}
            </button>
          );
        })}
      </div>

      {/* Zoom Controls: ปรับให้อยู่ตำแหน่งที่กดง่ายในมือถือ */}
      <div className="flex justify-between items-center mb-4 px-2">
        <span className="text-xs font-bold text-gray-400 md:hidden italic">ใช้นิ้วเลื่อนเพื่อดูผังงาน</span>
        <div className="flex gap-1 ml-auto">
          <button onClick={zoomOut} className="w-10 h-10 bg-white border border-gray-200 rounded-xl font-bold shadow-sm active:bg-gray-100">-</button>
          <div className="flex items-center px-3 bg-gray-50 rounded-xl text-xs font-black">{Math.round(zoomLevel * 100)}%</div>
          <button onClick={zoomIn} className="w-10 h-10 bg-white border border-gray-200 rounded-xl font-bold shadow-sm active:bg-gray-100">+</button>
        </div>
      </div>

      {/* Map Container */}
      <div 
        ref={containerRef} 
        className="relative bg-cyan-100 rounded-2xl shadow-inner border border-cyan-300 overflow-auto cursor-grab active:cursor-grabbing"
        style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
             <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold text-pink-500 animate-pulse text-sm">กำลังโหลดผังบูธ...</span>
             </div>
          </div>
        ) : (
          <div 
            className="p-6 md:p-12 transition-transform duration-300 origin-top-left" 
            style={{ transform: `scale(${zoomLevel})`, width: '1600px' }}
          > 
            {renderRowHorizontal('A', 1, 32)}
            <div className="flex justify-between items-start mt-2 w-full">
               {renderColumnVertical('B', 1, 32, 'side')}
               <div className="flex flex-1 justify-evenly px-4">
                 {['C','E','G','I','K','M'].map(L => (
                   <div key={L} className="flex gap-2 mx-2">
                     {renderColumnVertical(L, 1, 34, 'center')}
                     {renderColumnVertical(String.fromCharCode(L.charCodeAt(0)+1), 1, 34, 'center')}
                   </div>
                 ))}
               </div>
               {renderColumnVertical('O', 1, 32, 'side')}
            </div>
          </div>
        )}
      </div>
      
      {/* Legend: ช่วยให้คนดูมือถือเข้าใจสีบูธ */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] md:text-xs font-bold text-gray-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border rounded"></div> ว่าง</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-black"></div> มีร้านค้า</div>
          <div className="flex items-center gap-1 text-pink-500 underline italic">* เลื่อนและซูมเพื่อดูรายละเอียด</div>
      </div>
    </div>
  );
}