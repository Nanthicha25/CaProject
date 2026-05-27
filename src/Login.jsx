import React, { useState } from 'react';
import { db } from './firebase'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

function Login({ setCurrentPage, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
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
      // 1. ค้นหาใน Collection "users" (สำหรับ Buyer)
      let q = query(collection(db, "users"), where("email", "==", email));
      let querySnapshot = await getDocs(q);

      // 2. ถ้าไม่เจอใน "users" ให้ค้นหาใน Collection "sellers"
      if (querySnapshot.empty) {
        q = query(collection(db, "sellers"), where("email", "==", email));
        querySnapshot = await getDocs(q);
      }

      // 3. ตรวจสอบผลลัพธ์
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // หมายเหตุ: เช็คแค่อีเมล ถ้าระบบจริงต้องเพิ่มฟิลด์ password เช็คด้วย
        setUser({ 
          id: userDoc.id, 
          username: userData.username,
          // ใช้ค่า role ที่คุณเพิ่มเข้าไปใน Firestore ได้เลย ("user" หรือ "seller")
          role: userData.role 
        });
        
        setCurrentPage('home'); 
      } else {
        alert("ไม่พบอีเมลนี้ในระบบ โปรดตรวจสอบอีกครั้ง");
      }
    } catch (error) {
      console.error("Error logging in: ", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Please sign in</h2>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="email"
            placeholder="Email address" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex items-center gap-2 text-gray-600 mt-1">
            <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="remember" className="text-sm">Remember me</label>
          </div>

          <button type="submit" className="w-full py-3 mt-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account yet? <span onClick={() => setCurrentPage('signup')} className="text-blue-600 cursor-pointer hover:underline font-bold">Click here</span> to sign up
        </p>

      </div>
    </div>
  );
}

export default Login;