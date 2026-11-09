import { Bell } from 'lucide-react'

function StudentDashboard() {
  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
                <aside className="hidden lg:block">
                    Sidebar
                </aside>
                <header className="flex items-center justify-between gap-4">
                    <section>
                        <p className="text-sm font-medium text-emerald-700">
                            Welcome Back!
                        </p>
                        <h1 className="mt-1 text-lg sm:text-2xl font-bold">
                            Good morning, Fahad 👋
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Ready for your next journey?
                        </p> 
                    </section>
                    <div className="flex items-center gap-2">
                        <button className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                            <Bell size={20} className="text-emerald-600" />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
                        </button>
                        <button className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm font-bold">
                            F
                        </button>
                    </div>
                </header>

            </div>
        </div>

    </main>
  )
}

export default StudentDashboard
