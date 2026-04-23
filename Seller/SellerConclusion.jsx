import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const SellerConclusion = () => {
  const [loading, setLoading] = useState(true);
  const [boothData, setBoothData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState("ทั้งหมด");
  const [filterDate, setFilterDate] = useState("");
  
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    bestSellers: [],
    outOfStock: [],
    dailySales: [],
  });

  const BOOTH_ID = "b_0001";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const boothRef = doc(db, "booths", BOOTH_ID);
        const boothSnap = await getDoc(boothRef);
        if (boothSnap.exists()) {
          setBoothData(boothSnap.data());
        }

        const q = query(collection(db, "transactions"), where("booth_id", "==", BOOTH_ID));
        const querySnapshot = await getDocs(q);
        const transList = querySnapshot.docs.map((doc) => doc.data());
        setTransactions(transList);

        if (transList.length > 0) {
          const earliest = transList.reduce((min, p) => p.transaction_date < min ? p.transaction_date : min, transList[0].transaction_date);
          const firstDateStr = new Date(earliest).toISOString().split('T')[0];
          setFilterDate(firstDateStr);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      const creatorLookup = {};
      if (boothData && boothData.products) {
        boothData.products.forEach(p => {
          creatorLookup[p.id] = p.creator || boothData.mainCreator;
        });
      }

      let filteredTrans = transactions;
      if (filterDate) {
        filteredTrans = transactions.filter(t => t.transaction_date && new Date(t.transaction_date).toISOString().split('T')[0] === filterDate);
      }

      let revenue = 0;
      const productMap = {};
      const salesReport = [];

      filteredTrans.forEach((t) => {
        t.items_detail?.forEach((item) => {
          const itemCreator = creatorLookup[item.product_id] || (boothData ? boothData.mainCreator : "Unknown");
          
          if (selectedCreator === "ทั้งหมด" || itemCreator === selectedCreator) {
            revenue += item.subtotal;
            const key = item.product_id;
            if (!productMap[key]) {
              productMap[key] = { name: item.name, qty: 0, total: 0, image: item.image || "" };
            }
            productMap[key].qty += item.quantity;
            productMap[key].total += item.subtotal;

            salesReport.push({
              date: new Date(t.transaction_date).toLocaleDateString(),
              nameEn: item.name,
              nameTh: item.name_th || "-",
              price: item.price,
              stock: item.current_stock || 0,
              qty: item.quantity,
              total: item.subtotal
            });
          }
        });
      });

      const sortedProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 3);

      setSummary({
        totalRevenue: revenue,
        bestSellers: sortedProducts,
        outOfStock: boothData?.products?.filter(p => p.stock <= 0 && (selectedCreator === "ทั้งหมด" || p.creator === selectedCreator)) || [],
        dailySales: salesReport
      });
    }
  }, [selectedCreator, filterDate, transactions, boothData, loading]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-purple-500 font-bold">กำลังประมวลผลข้อมูล...</p>
    </div>
  );

  const allCreators = boothData ? ["ทั้งหมด", boothData.mainCreator, ...(boothData.coCreators || [])] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans text-gray-800">
      
      <div className="fixed top-[78.5px] left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
  
  <div className="flex overflow-x-auto">
    {allCreators.map((creator, index) => (
      <button 
        key={index}
        onClick={() => setSelectedCreator(creator)}
        className={`flex-shrink-0 px-6 py-4 text-lg font-bold whitespace-nowrap 
        border-b-4 border-transparent transition-colors duration-200
        ${selectedCreator === creator 
          ? "bg-purple-50 text-purple-600 border-purple-600" 
          : "text-gray-400 hover:text-purple-500"}`}
      >
        {creator === "ทั้งหมด" ? "🌟 รวมทั้งหมด" : `🎨 ${creator}`}
      </button>
    ))}
  </div>

</div>

      <div className="pt-[60px] p-6 md:px-10">
        {/* 2. ส่วนหัว: เลือกเวลา และ รายได้ (Layout ตามภาพที่ 1) */}
        <div className="flex justify-between items-center mb-8">
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-white text-purple-600 px-5 py-2 rounded-xl font-bold border-2 border-purple-600 shadow-sm outline-none cursor-pointer hover:bg-purple-50 transition-colors"
          />
          <div className="text-2xl font-black text-gray-700">
            Total Revenue: <span style={{color: 'rgb(236, 72, 153)'}} className="ml-2 text-3xl">{summary.totalRevenue.toLocaleString()} Baht</span>
          </div>
        </div>

        {/* 3. Best Seller Section (Layout ตามภาพที่ 1 - ธีมสะอาด) */}
        <section className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm mb-10">
          <h3 className="bg-gray-50 p-4 text-lg font-black text-center border-b border-gray-200 text-gray-700 italic">Best Seller</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="flex flex-col items-center text-center group">
                <span className="text-3xl font-black text-purple-500 mb-3"># {idx + 1}</span>
                <div className="w-40 h-40 bg-gray-50 border border-gray-200 flex items-center justify-center mb-5 rounded-2xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                  {summary.bestSellers[idx]?.image ? (
                    <img src={summary.bestSellers[idx].image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-gray-300 font-bold">pic{idx + 1}</span>
                  )}
                </div>
                <div className="space-y-1 font-bold">
                  <p style={{color: 'rgb(236, 72, 153)'}}>Total price : {summary.bestSellers[idx]?.total.toLocaleString() || 0} Baht</p>
                  <p style={{color: 'rgb(236, 72, 153)'}}>Total quantity : {summary.bestSellers[idx]?.qty || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Middle Row: Pie Chart & Out of Stock (Layout ตามภาพที่ 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Pie Chart Card */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <h3 className="bg-gray-50 p-4 text-lg font-black text-center border-b border-gray-200 text-gray-700">ประเภทของ</h3>
            <div className="p-8 flex flex-col items-center">
               <div className="w-44 h-44 rounded-full relative flex items-center justify-center shadow-lg" 
                    style={{background: `conic-gradient(rgb(147, 51, 234) 0% 40%, rgb(236, 72, 153) 40% 75%, #fdf2f8 75% 100%)`}}>
                  <div className="w-28 h-28 bg-white rounded-full absolute"></div>
                  <span className="relative z-10 font-black text-gray-700">Sales Mix</span>
               </div>
               <div className="mt-8 grid grid-cols-1 gap-2 w-full font-bold text-sm">
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor: 'rgb(147, 51, 234)'}}></div> Product A</div>
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor: 'rgb(236, 72, 153)'}}></div> Product B</div>
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{backgroundColor: '#fdf2f8', border:'1px solid #ddd'}}></div> Product C</div>
               </div>
            </div>
          </div>

          {/* Out of Stock Card */}
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <h3 className="bg-gray-50 p-4 text-lg font-black text-center border-b border-gray-200 text-gray-700">Out of Stock Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead style={{backgroundColor: 'rgba(236, 72, 153, 0.05)'}}>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 font-bold" style={{color: 'rgb(236, 72, 153)'}}>Date</th>
                    <th className="p-4 font-bold" style={{color: 'rgb(236, 72, 153)'}}>Name</th>
                    <th className="p-4 font-bold" style={{color: 'rgb(236, 72, 153)'}}>ชื่อ</th>
                    <th className="p-4 font-bold" style={{color: 'rgb(236, 72, 153)'}}>Choice</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.outOfStock.length > 0 ? summary.outOfStock.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">-</td>
                      <td className="p-4 font-bold text-gray-700">{p.name}</td>
                      <td className="p-4 text-gray-500">{p.name_th || "-"}</td>
                      <td className="p-4"><span className="bg-red-100 text-red-500 px-3 py-1 rounded-full text-xs font-black uppercase">Out</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="p-10 text-gray-400 font-bold italic">- No stock issues -</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. Daily Sales Report (Bottom Table ตามภาพที่ 2) */}
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <h3 className="bg-gray-50 p-4 text-lg font-black text-center border-b border-gray-200 text-gray-700">Daily Sales Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead style={{backgroundColor: 'rgba(147, 51, 234, 0.05)'}}>
                <tr className="border-b border-gray-200 font-bold">
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>Date</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>Name</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>ชื่อ</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>Price</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>stock</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>Quantity.</th>
                  <th className="p-4" style={{color: 'rgb(236, 72, 153)'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.dailySales.length > 0 ? summary.dailySales.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-purple-50 transition-colors">
                    <td className="p-4 text-gray-500 text-sm">{s.date}</td>
                    <td className="p-4 font-bold text-gray-700">{s.nameEn}</td>
                    <td className="p-4 text-gray-500">{s.nameTh}</td>
                    <td className="p-4">{s.price}</td>
                    <td className="p-4">{s.stock}</td>
                    <td className="p-4 font-black">{s.qty}</td>
                    <td className="p-4 font-black text-purple-600 text-lg">฿{s.total.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" className="p-16 text-gray-400 font-bold italic">ยังไม่มีข้อมูลการขายสำหรับนักวาดท่านนี้</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerConclusion;