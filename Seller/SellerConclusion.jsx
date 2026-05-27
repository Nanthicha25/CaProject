//src/Seller/SellerConclusion.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, or } from "firebase/firestore";
import { useLanguage } from '../LanguageContext';

// กำหนดสีประจำหมวดหมู่ (Accessible Palette)
const CATEGORY_COLORS = {
  bag: "#E6194B", // แดงเข้ม
  book: "#3BEBD3", // ฟ้าสว่าง
  clothes: "#FFE119", // เหลือง
  craft: "#3CB44B", // เขียวเข้ม
  dolls: "#911EB4", // ม่วง
  merchandise: "#F58231", // ส้ม
  others: "#A9A9A9", // เทา
  "paper commission": "#469990", // เขียวอมฟ้า
  "paper goods": "#F032E6", // ชมพูบานเย็น
};



const SellerConclusion = ({ user }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [boothData, setBoothData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // State ใหม่สำหรับจัดการเรื่องสต็อกสินค้า
  const [products, setProducts] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    bestSellersByQty: [],
    bestSellersByRevenue: [],
    categoryStats: {},
  });

  // 1. ดึงข้อมูล Booth และ Dates เริ่มต้น
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.username) return;
      setLoading(true);

      try {
        const boothQuery = query(
          collection(db, "booths"),
          or(
            where("main_creator", "==", user.username),
            where("co_creators", "array-contains", user.username)
          )
        );

        const boothSnap = await getDocs(boothQuery);

        if (boothSnap.empty) {
          setLoading(false);
          return;
        }

        const booth = { id: boothSnap.docs[0].id, ...boothSnap.docs[0].data() };
        setBoothData(booth);

        const dateQuery = query(
          collection(db, "transactions"),
          where("booth_id", "==", booth.booth_id)
        );

        const dateSnap = await getDocs(dateQuery);
        const dates = dateSnap.docs.map((doc) => doc.data().date_only);

        const uniqueDates = [...new Set(dates)].sort((a, b) => {
          const parse = (d) => new Date(d.split("/").reverse().join("-"));
          return parse(a) - parse(b);
        });

        setAvailableDates(uniqueDates);
        setFilterDate("");
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // 2. ดึงข้อมูล Products (เพื่อเอามาเช็ค Stock)
  useEffect(() => {
    const fetchProducts = async () => {
      if (!boothData) return;
      
      try {
        // รวบรวมรายชื่อ Creator ทั้งหมดในบูธ เพื่อดึงสินค้าของทุกคนมา
        const allBoothCreators = [boothData.main_creator, ...(boothData.co_creators || [])];
        if (allBoothCreators.length === 0) return;

        const productQuery = query(
          collection(db, "products"),
          where("creator", "in", allBoothCreators)
        );

        const snap = await getDocs(productQuery);
        setProducts(snap.docs.map((doc) => doc.data()));
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, [boothData]);

  // 3. ดึงข้อมูล Transactions ตาม Date Filter
  useEffect(() => {
    const fetchFilteredTransactions = async () => {
      if (!boothData) return;
      setLoading(true);

      try {
        let transQuery;

        if (filterDate === "") {
          transQuery = query(
            collection(db, "transactions"),
            where("booth_id", "==", boothData.booth_id)
          );
        } else {
          transQuery = query(
            collection(db, "transactions"),
            where("booth_id", "==", boothData.booth_id),
            where("date_only", "==", filterDate)
          );
        }

        const transSnap = await getDocs(transQuery);
        const transList = transSnap.docs.map((doc) => doc.data());

        setTransactions(transList);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredTransactions();
  }, [filterDate, boothData]);

  // 4. สรุปผลยอดขายจาก Transactions
  useEffect(() => {
    if (!loading && boothData) {
      let revenue = 0;
      const productMap = {};
      const categories = {};

      transactions.forEach((t) => {
        let transactionHasRelevantItem = false;
        let transactionRelevantRevenue = 0;

        t.items_detail?.forEach((item) => {
          const itemCreator = item.creator || boothData.main_creator;

          if (selectedCreator === "all" || itemCreator === selectedCreator) {
            transactionHasRelevantItem = true;
            transactionRelevantRevenue += item.subtotal;

            const key = item.option_name || item.product_name;

            if (!productMap[key]) {
              productMap[key] = {
                display_name: key,
                qty: 0,
                total: 0,
                image: item.image || "",
              };
            }

            productMap[key].qty += item.quantity;
            productMap[key].total += item.subtotal;

            const mainCat = item.category_path?.split("/")[0] || "others";
            const finalCat = CATEGORY_COLORS[mainCat] ? mainCat : "others";

            categories[finalCat] = (categories[finalCat] || 0) + item.quantity;
          }
        });

        if (transactionHasRelevantItem) {
          revenue += transactionRelevantRevenue;
        }
      });

      const productsArray = Object.values(productMap);

      const sortedByQty = [...productsArray]
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);

      const sortedByRevenue = [...productsArray]
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      setSummary({
        totalRevenue: revenue,
        totalOrders: transactions.length,
        bestSellersByQty: sortedByQty,
        bestSellersByRevenue: sortedByRevenue,
        categoryStats: categories,
      });
    }
  }, [selectedCreator, transactions, boothData, loading]);

  // 5. คำนวณหาสินค้าที่ Out of Stock จาก Products Data
  useEffect(() => {
    if (!products || products.length === 0) {
      setOutOfStockItems([]);
      return;
    }

    const outOfStock = [];

    products.forEach((p) => {
      const creator = p.creator || "";

      // กรองตาม Creator ที่เลือกด้านบน
      if (selectedCreator !== "all" && creator !== selectedCreator) {
        return;
      }

      if (p.has_variations) {
        // ถ้ามี Variation ให้เช็ค stock ลึกเข้าไปใน array
        p.variations?.forEach((v) => {
          if (v.stock === 0) {
            outOfStock.push({
              creator: creator,
              productName: p.name,
              optionName: v.option_name || v.variation_name || "-",
            });
          }
        });
      } else {
        // ถ้าไม่มี Variation ให้เช็คที่ total_stock ของสินค้านั้น
        if (p.total_stock === 0) {
          outOfStock.push({
            creator: creator,
            productName: p.name,
            optionName: "-",
          });
        }
      }
    });

    setOutOfStockItems(outOfStock);
  }, [products, selectedCreator]);

  const categoryData = Object.entries(summary.categoryStats).map(
    ([name, qty]) => ({
      name,
      qty,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.others,
    })
  );

  const totalQty = categoryData.reduce((sum, item) => sum + item.qty, 0);

  let cumulativePercent = 0;
  const gradientString =
    totalQty > 0
      ? categoryData
          .map((cat) => {
            const percent = (cat.qty / totalQty) * 100;
            const start = cumulativePercent;
            cumulativePercent += percent;
            return `${cat.color} ${start}% ${cumulativePercent}%`;
          })
          .join(", ")
      : "#f3f4f6 0% 100%";


  // เตรียมข้อมูลสำหรับ Daily Sales Report
  const dailySalesMap = {};
  transactions.forEach((t) => {
    const date = t.date_only;
    t.items_detail?.forEach((item) => {
      const creator = item.creator || (boothData ? boothData.main_creator : "");
      
      if (selectedCreator !== "all" && creator !== selectedCreator) {
        return;
      }

      const productName = item.product_name || "-";
      const optionName = item.option_name ? item.option_name : productName; 
      const price = item.price_per_unit || 0;

      const key = `${date}_${creator}_${productName}_${item.option_name}_${price}`;

      if (!dailySalesMap[key]) {
        dailySalesMap[key] = {
          date,
          creator,
          productName,
          optionName,
          price,
          quantity: 0,
          total: 0,
        };
      }
      dailySalesMap[key].quantity += item.quantity;
      dailySalesMap[key].total += item.subtotal;
    });
  });

  const dailySalesReport = Object.values(dailySalesMap).sort((a, b) => {
    const parse = (d) => new Date(d.split("/").reverse().join("-"));
    if (a.date !== b.date) {
      return parse(a.date) - parse(b.date);
    }
    return a.productName.localeCompare(b.productName);
  });

  if (loading && !boothData)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-purple-500 font-bold">{t('loadingSummary')}</p>
      </div>
    );

  const allCreators = boothData
    ? ["all", boothData.main_creator, ...(boothData.co_creators || [])]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans text-gray-800 animate-fade-in flex flex-col -mt-4 -mx-4 md:-mt-8 md:-mx-8">
      <div className="flex border-b-2 border-gray-300 bg-white overflow-x-auto w-full shadow-sm sticky top-[56px] sm:top-[64px] z-20">
        {allCreators.map((creator, index) => (
          <button
            key={index}
            className={`flex-1 min-w-[120px] md:min-w-[150px] p-4 text-base md:text-lg font-bold cursor-pointer transition-colors whitespace-nowrap border-r border-gray-200 last:border-r-0 ${
              selectedCreator === creator
                ? "bg-purple-50 text-purple-600"
                : "bg-white text-gray-500 hover:bg-purple-50 hover:text-purple-600"
            }`}
            onClick={() => setSelectedCreator(creator)}
          >
            {creator === "all" ? t('allCreatorsTab') : `🎨 ${creator}`}
          </button>
        ))}
      </div>

      {/* ปรับเป็น flex-col สำหรับมือถือ และ flex-row สำหรับ md ขึ้นไป พร้อมเพิ่มช่องว่าง (gap-4) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 md:px-10 mt-2 gap-4 md:gap-0">
        
        {/* ขยายกรอบให้เต็มความกว้างในมือถือ (w-full) */}
        <div className="relative w-full md:w-auto">
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            // เพิ่ม w-full md:w-auto เข้าไปใน className เพื่อให้ปุ่มยาวเต็มจอในมือถือ (กดง่ายขึ้น)
            className="appearance-none bg-white text-purple-600 px-6 py-2 pr-12 rounded-xl font-bold border-2 border-purple-600 hover:bg-white transition-colors shadow-sm outline-none cursor-pointer text-lg min-w-[220px] w-full md:w-auto"
          >
            <option value="" className="text-black">
              {t('allDays')}
            </option>
            {availableDates.map((date, index) => (
              <option key={date} value={date} className="text-black">
                {date}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>

        {/* ปรับให้อยู่ชิดซ้ายในมือถือ (text-left) และชิดขวาในจอใหญ่ (md:text-right) */}
        <div className="text-2xl font-black text-gray-700 text-left md:text-right w-full md:w-auto">
          {t('totalRevenueLabel')}{" "}
          <span className="text-purple-600 ml-2 text-3xl">
            ฿{summary.totalRevenue.toLocaleString()}
          </span>
        </div>

      </div>

      {/* Most Units Sold */}
      <section className="bg-white mx-6 mb-8 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <h3 className="bg-purple-50 p-4 text-lg font-black text-center border-b border-gray-200 text-purple-700">
          {t('topUnitsSold')}
        </h3>
        <div className="flex flex-wrap justify-around items-start p-6 md:p-8 gap-4">
          {summary.bestSellersByQty.length > 0 ? (
            [...Array(3)].map((_, idx) => {
              const item = summary.bestSellersByQty[idx];
              if (item) {
                return (
                  <div className="flex-1 max-w-[250px] flex flex-col items-center text-center p-4" key={`qty-${idx}`}>
                    <div className="font-black text-2xl text-purple-600 mb-4"># {idx + 1}</div>
                    <div className="w-32 h-32 bg-gray-50 mb-4 border border-gray-100 flex items-center justify-center rounded-2xl overflow-hidden shadow-sm">
                      {item.image ? (
                        <img src={item.image} alt={`qty-rank-${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">{item.display_name}</span>
                      )}
                    </div>
                    <div className="text-purple-600 font-bold text-sm tracking-wide">{t('totalPriceText')}{item.total} {t('bahtText')}</div>
                    <div className="text-purple-600 font-bold text-sm tracking-wide mt-1">{t('totalQtyText')}{item.qty}</div>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <p className="p-8 text-gray-400 font-bold text-lg w-full text-center">{t('noSalesData')}</p>
          )}
        </div>
      </section>

      {/* Highest Revenue */}
      <section className="bg-white mx-6 mb-8 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <h3 className="bg-pink-50 p-4 text-lg font-black text-center border-b border-gray-200 text-pink-700">
          {t('topRevenue')}
        </h3>
        <div className="flex flex-wrap justify-around items-start p-6 md:p-8 gap-4">
          {summary.bestSellersByRevenue.length > 0 ? (
            [...Array(3)].map((_, idx) => {
              const item = summary.bestSellersByRevenue[idx];
              if (item) {
                return (
                  <div className="flex-1 max-w-[250px] flex flex-col items-center text-center p-4" key={`rev-${idx}`}>
                    <div className="font-black text-2xl text-purple-500 mb-4"># {idx + 1}</div>
                    <div className="w-32 h-32 bg-gray-50 mb-4 border border-gray-100 flex items-center justify-center rounded-2xl overflow-hidden shadow-sm">
                      {item.image ? (
                        <img src={item.image} alt={`rev-rank-${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">{item.display_name}</span>
                      )}
                    </div>
                    <div className="text-pink-500 font-bold text-sm tracking-wide">{t('totalPriceText')}{item.total} {t('bahtText')}</div>
                    <div className="text-pink-500 font-bold text-sm tracking-wide mt-1">{t('totalQtyText')} {item.qty}</div>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <p className="p-8 text-gray-400 font-bold text-lg w-full text-center">{t('noSalesData')}</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <h3 className="bg-gray-50 p-4 text-lg font-black text-center border-b border-gray-200 text-gray-700">
            Category Mix
          </h3>
          <div className="flex flex-col items-center p-6">
            <div
              className="w-40 h-40 rounded-full flex items-center justify-center relative shadow-md transition-transform hover:scale-105"
              style={{ background: `conic-gradient(${gradientString})` }}
            >
              <div className="w-28 h-28 bg-white rounded-full absolute flex items-center justify-center">
                <span className="text-xl font-black text-purple-600">MIX</span>
              </div>
            </div>
            <div className="mt-6 w-full space-y-2">
              {categoryData.length > 0 ? (
                categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="font-bold text-gray-700 capitalize">{cat.name}</span>
                    </div>
                    <span className="font-black text-gray-400">{Math.round((cat.qty / totalQty) * 100)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm">{t('noCategoryData')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Out of Stock Products (ดึงข้อมูลจริง) */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <h3 className="bg-red-100 p-4 text-lg font-black text-center border-b border-gray-200 text-red-700">
            Out of Stock Products
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="bg-red-50 text-red-600 p-4 border-b border-gray-200 font-bold">{t('colCreator')}</th>
                  <th className="bg-red-50 text-red-600 p-4 border-b border-gray-200 font-bold">{t('colProduct')}</th>
                  <th className="bg-red-50 text-red-600 p-4 border-b border-gray-200 font-bold">{t('colOption')}</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockItems.length > 0 ? (
                  outOfStockItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="p-4 border-b border-gray-100 text-sm text-black font-bold">{item.creator}</td>
                      <td className="p-4 border-b border-gray-100 text-sm text-black font-medium">{item.productName}</td>
                      <td className="p-4 border-b border-gray-100 text-sm text-black">{item.optionName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-8 text-red-400 font-bold text-center">
                      {t('noOutOfStock')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Daily Sales Report Section */}
      <div className="mx-6 mt-8 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <h3 className="bg-purple-100 p-4 text-lg font-black text-center border-b border-purple-200 text-purple-800">
        Daily Sales Report
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colDate')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colCreator')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colProduct')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colOption')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colPrice')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colQuantity')}</th>
                <th className="bg-purple-50 text-purple-700 p-4 border-b border-purple-100 font-bold whitespace-nowrap">{t('colTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {dailySalesReport.length > 0 ? (
                dailySalesReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white transition-colors">
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-700">{row.date}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-800 font-bold">{row.creator}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-700 font-medium">{row.productName}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-700">
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-semibold">{row.optionName}</span>
                    </td>
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-700">฿{row.price}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-gray-700 font-bold">{row.quantity}</td>
                    <td className="p-4 border-b border-gray-100 text-sm text-purple-600 font-black">฿{row.total.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-purple-400 font-bold text-center">{t('noDailySales')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SellerConclusion;