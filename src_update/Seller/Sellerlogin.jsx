// src/Seller/Sellerlogin.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebase'; 
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

function Sellerlogin({ setCurrentPage, setUser }) {
  const { lang, setLang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, message: '' });

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. ล็อกอินด้วย Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. ดึงข้อมูลจาก collection "sellers" โดยใช้ uid
      const sellerDocRef = doc(db, "sellers", user.uid);
      const sellerSnap = await getDoc(sellerDocRef);

      if (sellerSnap.exists()) {
        const userData = sellerSnap.data();
        // 1. เช็คถ้าสถานะเป็น 'pending'
        if (userData.status === 'pending') {
          await signOut(auth);
          setPopup({ 
            isOpen: true, 
            message: lang === 'th' ? "บัญชีของคุณกำลังรอการอนุมัติ" : "Your account is pending approval."
          });
          return;
        }

        // 2. เพิ่มส่วนนี้เพื่อเช็ค 'rejected'
        if (userData.status === 'rejected') {
          await signOut(auth); // ออกจากระบบทันที
          setPopup({ 
            isOpen: true, 
            message: lang === 'th' 
              ? `บัญชีของคุณถูกปฏิเสธ เนื่องจาก: ${userData.rejectReason || 'ไม่มีระบุเหตุผล'}` 
              : `Your account was rejected. Reason: ${userData.rejectReason || 'No reason provided.'}`
          });
          return;
        }
        
        // หากอนุมัติแล้ว
        setUser({ 
          id: user.uid, 
          username: userData.penName,
          role: userData.role || 'seller'
        });
        
        setCurrentPage('home'); 
      } else {
        // ล็อกอินผ่าน Auth ได้ แต่ไม่มีข้อมูลใน sellers
        await signOut(auth);
        setPopup({ 
          isOpen: true, 
          message: lang === 'th' ? "ไม่พบบัญชีร้านค้านี้ในระบบ โปรดตรวจสอบให้แน่ใจว่าคุณสมัครเป็นครีเอเตอร์" : "Seller account not found."
        });
      }
    } catch (error) {
      console.error("Error logging in: ", error);
      setPopup({ 
        isOpen: true, 
        message: lang === 'th' ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "Invalid email or password."
      });
    }
  };

  return (
    <div className="min-h-screen bg-purple-50/30 flex flex-col items-center pt-10 px-4 relative">
      
      <div className="flex justify-between items-center w-full max-w-md mb-6">
        <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2 text-gray-400 hover:text-purple-600 transition-colors font-medium">
          <span className="text-xl">←</span> {lang === 'th' ? 'กลับ' : 'Back'}
        </button>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-purple-100 z-10">
          <button onClick={() => setLang('th')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'th' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-purple-500'}`}>TH</button>
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'en' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-purple-500'}`}>EN</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-purple-100 border-t-8 border-purple-600 w-full max-w-md transition-all duration-500">
        <h2 className="text-3xl font-black mb-2 text-gray-800 tracking-tight">{lang === 'th' ? 'จัดการร้านค้า' : 'Creator login'}</h2>
        <p className="text-sm text-gray-500 mb-8 font-medium">{lang === 'th' ? 'ระบบจัดการสำหรับเจ้าของบูธ' : 'Management system for creators.'}</p>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="email" placeholder={lang === 'th' ? 'อีเมล' : 'Email'} required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border border-purple-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200"
          />
          <input 
            type="password" placeholder={lang === 'th' ? 'รหัสผ่าน' : 'Password'} required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border border-purple-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 transition-all placeholder:text-purple-200"
          />
          
          <div className="flex items-center gap-2 text-gray-500 mt-1 ml-1">
            <input type="checkbox" id="remember_seller" className="w-4 h-4 rounded border-purple-200 text-purple-600 focus:ring-purple-400 cursor-pointer" />
            <label htmlFor="remember_seller" className="text-xs cursor-pointer select-none">{lang === 'th' ? 'จดจำฉันไว้' : 'Remember me'}</label>
          </div>

          <button type="submit" className="w-full py-4 mt-4 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 bg-purple-600 hover:bg-purple-700 shadow-purple-100">
            {lang === 'th' ? 'เข้าสู่ระบบร้านค้า' : 'Login as Creator'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400 font-medium">
          {lang === 'th' ? 'ยังไม่มีบัญชีใช่ไหม?' : "Don't have an account yet?"}<br/>
          <span onClick={() => setCurrentPage('sellersignup')} className="text-purple-500 cursor-pointer hover:underline font-bold text-base">
            {lang === 'th' ? 'คลิกที่นี่!' : 'Click Here!'}
          </span>
        </p>
      </div>

      {popup.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-purple-900/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-purple-50">
            <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center mb-5 text-2xl font-black animate-pulse">!</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{lang === 'th' ? 'แจ้งเตือน' : 'Alert'}</h3>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">{popup.message}</p>
            <button onClick={() => setPopup({ ...popup, isOpen: false })} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-100">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sellerlogin;