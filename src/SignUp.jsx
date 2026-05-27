import React from 'react';

function SignUp({ setCurrentPage, setUser }) {
  const handleSignUp = (e) => {
    e.preventDefault();
    // จำลองการสมัครและล็อคอินอัตโนมัติ
    setUser({ username: 'NewUser' });
    setCurrentPage('home'); 
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6">Sign Up</h2>
        
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Username" 
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="email" 
            placeholder="Email address" 
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" 
            placeholder="Password" 
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" 
            placeholder="Confirm Password" 
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button type="submit" className="w-full py-3 mt-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <span onClick={() => setCurrentPage('login')} className="text-blue-600 cursor-pointer hover:underline">Click here</span> to sign in
        </p>
      </div>
    </div>
  );
}

export default SignUp;