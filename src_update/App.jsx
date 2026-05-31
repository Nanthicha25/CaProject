// App.jsx
import { useState } from 'react';
import { eventData } from './mockData';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Landing from './Landing';
import Login from './Login';
import Sellerlogin from './Seller/Sellerlogin';
import Sellersignup from './Seller/Sellersignup';
import SignUp from './SignUp';
import AuthPopup from './AuthPopup';
import BoothMap from './Buyer/BoothMap';
import Searchproduct from './Buyer/Searchproduct';
import Cart from './Buyer/Cart';
import SellerApp from './Seller/SellerApp';
import Contact from './Buyer/Contact';

import Admincheck from './Admincheck';
import Adminpage from './Adminpage';

import { LanguageProvider } from './LanguageContext.jsx';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const handleActionRequireAuth = (action) => {
    if (!user || (!user?.id && !user?.uid)) {
      setShowAuthPopup(true);
    }
  };

  const renderBuyerOrGuestContent = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing setCurrentPage={setCurrentPage} />;
      case 'login':
        return <Login setCurrentPage={setCurrentPage} setUser={setUser} />;
      
      // แก้จาก 'seller-login' เป็น 'sellerlogin' ให้ตรงกับไฟล์อื่น
      case 'sellerlogin': 
        return <Sellerlogin setCurrentPage={setCurrentPage} setUser={setUser} />;
      
      // แก้จาก <SellerSignup /> เป็น <Sellersignup /> (s เล็ก) ให้ตรงกับตอน Import
      case 'sellersignup':
        return <Sellersignup setCurrentPage={setCurrentPage} setUser={setUser} />;

      case 'signup':
        return <SignUp setCurrentPage={setCurrentPage} setUser={setUser} />;
      case 'cart':
        return <Cart user={user} />;
      case 'search':
        return <Searchproduct user={user} onRequireAuth={handleActionRequireAuth} />;
      case 'contact':
        return <Contact />;
      case 'home':
        return (
          <>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-3xl font-bold text-pink-500">Event Booth</h1>
            </div>
            <BoothMap onRequireAuth={handleActionRequireAuth} user={user}/>
          </>
        );
      default:
        return <Landing setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <LanguageProvider>
      <div className="font-sans relative">
        {/* เพิ่มเงื่อนไขซ่อน Topbar สำหรับหน้า sellerlogin และ sellersignup ด้วย */}
        {currentPage !== 'landing' && 
         currentPage !== 'login' && 
         currentPage !== 'sellerlogin' && 
         currentPage !== 'sellersignup' && 
         currentPage !== 'signup' && 
         (!user || user.role !== 'admin') && (
          <Topbar 
            setIsSidebarOpen={setIsSidebarOpen}
            user={user} 
            setUser={setUser}
            setCurrentPage={setCurrentPage} 
          />
        )}

        {/* เช็ค Role เพื่อ Render หน้า */}
        {user && user.role === 'admin' ? (
          /* ถ้าเป็น Admin ให้เช็ค currentPage ว่าจะแสดงหน้าไหน */
          currentPage === 'admincheck' ? (
            <Admincheck user={user} setUser={setUser} setCurrentPage={setCurrentPage} />
          ) : (
            <Adminpage user={user} setUser={setUser} setCurrentPage={setCurrentPage} />
          )
        ) : user && user.role === 'seller' ? (
          /* ถ้าล็อคอินเป็น Seller ให้โหลด App ของ Seller */
          <SellerApp 
            user={user} 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen}
            eventData={eventData} 
          />
        ) : (
          /* ถ้าเป็น Buyer หรือยังไม่ล็อคอิน (Guest) โหลดส่วนนี้ */
          <>
            <Sidebar 
              isOpen={isSidebarOpen} 
              setIsOpen={setIsSidebarOpen}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
            <main className="w-full min-h-screen bg-gray-50 p-6 md:p-10">
              <div className="max-w-6xl mx-auto">
                {renderBuyerOrGuestContent()}
              </div>
            </main>
          </>
        )}

        {showAuthPopup && (
          <AuthPopup 
            onClose={() => setShowAuthPopup(false)}
            onGoToLogin={() => {
              setShowAuthPopup(false);
              setCurrentPage('login');
            }} 
          />
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;