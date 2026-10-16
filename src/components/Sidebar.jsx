// src/components/Sidebar.jsx

const NavButton = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-xs font-bold transition-all cursor-pointer ${
      isActive
        ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
        : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:text-slate-900'
    }`}
  >
    <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
    {item.label}
  </button>
)

const MENU_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'agenda', label: 'Agenda', icon: '📅' },
  { id: 'pacientes', label: 'Pacientes', icon: '🧑‍🤝‍🧑' },
  { id: 'historial', label: 'Historial Clínico', icon: '📋' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
]

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  return (
    <>
      {/* Barra lateral fija: escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex shadow-2xs">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs">
            P
          </div>
          <div>
            <span className="block text-xs font-extrabold text-slate-900 tracking-wide uppercase">Panel Podológico</span>
            <span className="block text-[11px] font-medium text-slate-400">Gestión Clínica</span>
          </div>
        </div>
        <nav className="space-y-1.5">
          {MENU_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>
      </aside>

      {/* Menú deslizable móvil */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start md:hidden backdrop-blur-xs bg-black/40 animate-fade-in">
          <div className="flex-1" onClick={() => setIsOpen(false)} />

          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs">
                  P
                </div>
                <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Menú de Navegación</h1>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1.5 overflow-y-auto">
              {MENU_ITEMS.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsOpen(false)
                  }}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}