// src/Login.jsx
import React, { useState } from 'react';
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';

function Login({ setCurrentPage, setUser }) {
  const { t, lang, setLang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, message: '' });

  const handleLogin = async (e) => {
    e.preventDefault();

    // ส่วนตรวจสอบ Admin
    if (email === 'admincheckproduct@test.com' && password === 'admin@789check') {
      setUser({ 
        id: 'admin-id-001', 
        username: 'Admin',
        role: 'admin' 
      });
      setCurrentPage('adminpage');
      return;
    }

    try {
      // 1. ล็อกอินด้วย Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. ดึงข้อมูล Role จาก Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();

        setUser({ 
          id: user.uid, 
          username: userData.username,
          role: userData.role || 'user'
        });
        
        setCurrentPage('home'); 
      } else {
        // ล็อกอินผ่านแต่ไม่ใช่ user ธรรมดา (อาจจะเป็นบัญชีร้านค้าที่หลงมากดล็อกอินหน้านี้)
        await signOut(auth);
        setPopup({ 
          isOpen: true, 
          message: lang === 'th' ? "บัญชีนี้ไม่ใช่บัญชีสำหรับผู้ใช้ทั่วไป" : "This is not a buyer account."
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
    <div className="min-h-screen bg-pink-50/30 flex flex-col items-center pt-10 px-4 relative">
      
      <div className="flex justify-between items-center w-full max-w-md mb-6">
        <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors font-medium">
          <span className="text-xl">←</span> {lang === 'th' ? 'กลับ' : 'Back'}
        </button>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-pink-100 z-10">
          <button onClick={() => setLang('th')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'th' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-300 hover:text-pink-500'}`}>TH</button>
          <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${lang === 'en' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-300 hover:text-pink-500'}`}>EN</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-pink-100 border-t-8 border-pink-400 w-full max-w-md transition-all duration-500">
        <h2 className="text-3xl font-black mb-2 text-gray-800 tracking-tight">{t('Login')}</h2>
        <p className="text-sm text-gray-500 mb-8 font-medium">{lang === 'th' ? 'ยินดีต้อนรับเข้าสู่ Art List' : 'Welcome to Art List'}</p>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="email" placeholder={t('email')} required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200"
          />
          <input 
            type="password" placeholder={t('password')} required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border border-pink-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-pink-50/30 transition-all placeholder:text-pink-200"
          />
          
          <div className="flex items-center gap-2 text-gray-500 mt-1 ml-1">
            <input type="checkbox" id="remember_user" className="w-4 h-4 rounded border-pink-200 text-pink-500 focus:ring-pink-400 cursor-pointer" />
            <label htmlFor="remember_user" className="text-xs cursor-pointer select-none">{lang === 'th' ? 'จดจำฉันไว้' : 'Remember me'}</label>
          </div>

          <button type="submit" className="w-full py-4 mt-4 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 bg-pink-500 hover:bg-pink-600 shadow-pink-100">
            {lang === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400 font-medium">
          {lang === 'th' ? 'ยังไม่มีบัญชีใช่ไหม?' : "Don't have an account yet?"}<br/>
          <span onClick={() => setCurrentPage('signup')} className="text-pink-500 cursor-pointer hover:underline font-bold text-base">
            {lang === 'th' ? 'คลิกที่นี่!' : 'Click Here!'}
          </span>
        </p>
      </div>

      {popup.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-pink-900/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border border-pink-50">
            <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mb-5 text-2xl font-black animate-pulse">!</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{lang === 'th' ? 'แจ้งเตือน' : 'Alert'}</h3>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">{popup.message}</p>
            <button onClick={() => setPopup({ ...popup, isOpen: false })} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-pink-100">
              {t('popupOk') || 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;