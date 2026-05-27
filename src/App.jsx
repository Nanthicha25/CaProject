// App.jsx
import { useState } from 'react';
import { eventData } from './mockData';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Landing from './Landing';
import Login from './Login';
import SignUp from './SignUp';
import AuthPopup from './AuthPopup';
import BoothMap from './Buyer/BoothMap';
import Searchproduct from './Buyer/Searchproduct';
import Cart from './Buyer/Cart'
import SellerApp from './Seller/SellerApp';
import Contact from './Buyer/Contact';

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
        {currentPage !== 'landing' && currentPage !== 'login' && currentPage !== 'signup' && (
          <Topbar 
            setIsSidebarOpen={setIsSidebarOpen}
            user={user} 
            setUser={setUser}
            setCurrentPage={setCurrentPage} 
          />
        )}

        {/* ถ้าล็อคอินเป็น Seller ให้โหลด App ของ Seller */}
        {user && user.role === 'seller' ? (
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