const LandingPage = () => {
  return (
    <section
      className="relative min-h-screen w-full bg-cover bg-center pt-10"
      style={{ backgroundImage: "url('/images/landing bg.png')" }}
    >
      <nav className="relative z-10 mx-auto w-[calc(100%-2rem)] max-w-3xl">
        <div className="flex items-center justify-between rounded-full bg-white/90 px-5 py-2 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
              IV
            </div>
            <span className="text-sm font-semibold text-gray-900">
              IV Management
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a href="#" className="text-xs text-gray-700 hover:text-black">Home</a>
            <a href="#" className="text-xs text-gray-700 hover:text-black">Features</a>
            <a href="#" className="text-xs text-gray-700 hover:text-black">About</a>
            <a href="#" className="text-xs text-gray-700 hover:text-black">Team</a>
            <a href="#" className="text-xs text-gray-700 hover:text-black">Contact</a>
          </div>

          <button className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800">
            Login
          </button>
        </div>
      </nav>

      <h1 className="text-center text-6xl font-bold text-white">
        IV Management
      </h1>
    </section>
  );
};

export default LandingPage;