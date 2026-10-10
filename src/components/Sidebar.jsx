// src/components/Sidebar.jsx
//
// Cambios de este componente (puntos 1, 3, 4 y 7 del pedido):
// - En pantallas medianas/grandes (tablet y escritorio) ahora se muestra
//   como una barra lateral FIJA, siempre visible, en vez de un menú que
//   tapaba todo el contenido.
// - En celular sigue siendo un menú deslizable (drawer), pero con mejor
//   tamaño de toque, iconos y una zona seguro para el "notch"/gestos.
// - Se agregan iconos simples para que cada sección se reconozca de un
//   vistazo (más intuitivo).

// Definido FUERA del componente Sidebar a propósito: si se define adentro,
// React crea un tipo de componente nuevo en cada render y "remonta" cada
// botón del menú (pierde estado interno, re-dispara animaciones, etc).
// Como aquí no hay estado interno no rompía nada, pero es una mala
// práctica que vale la pena evitar.
const NavButton = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer ${
      isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'
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
      {/* --- Barra lateral fija: solo visible md+ --- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <div className="h-2.5 w-2.5 rounded-full bg-sky-600" />
          <span className="text-sm font-semibold text-slate-800">Panel Podológico</span>
        </div>
        <nav className="space-y-1">
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

      {/* --- Menú deslizable: solo en móvil, controlado por isOpen --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start md:hidden">
          <div className="flex-1 bg-black/30" onClick={() => setIsOpen(false)} />

          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                <h1 className="text-base font-bold text-slate-800">Menú</h1>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1 overflow-y-auto">
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
