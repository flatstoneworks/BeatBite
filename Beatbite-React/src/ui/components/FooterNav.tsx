import { Link, useLocation } from 'react-router-dom';
import { LibraryIcon, RecordIcon, SettingsIcon } from './Icons';

type TabType = 'library' | 'record' | 'settings';

interface TabConfig {
  id: TabType;
  label: string;
  path: string;
  icon: (props: { color: string; size: number }) => JSX.Element;
}

const tabs: TabConfig[] = [
  {
    id: 'library',
    label: 'Library',
    path: '/library/songs',
    icon: ({ color, size }) => <LibraryIcon color={color} size={size} />,
  },
  {
    id: 'record',
    label: 'Record',
    path: '/record',
    icon: ({ color, size }) => <RecordIcon color={color} glowColor={color} size={size} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
  },
];

export function FooterNav() {
  const location = useLocation();

  // Determine active tab from URL
  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path.startsWith('/library')) return 'library';
    if (path.startsWith('/settings')) return 'settings';
    return 'record';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-xl border-t border-[#1a1a1a] safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
          />
        ))}
      </div>
    </nav>
  );
}

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
}

function TabButton({ tab, isActive }: TabButtonProps) {
  const color = isActive ? '#00ffff' : '#888888';

  return (
    <Link
      to={tab.path}
      className={`
        flex flex-col items-center justify-center
        w-20 h-14
        rounded-xl
        transition-all duration-200
        active:scale-95
        ${isActive
          ? 'text-[#00ffff]'
          : 'text-[#888888] hover:text-[#ffffff]'
        }
      `}
      style={{
        background: isActive ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
      }}
    >
      {tab.icon({ color, size: 24 })}
      <span className={`text-[10px] mt-1 font-medium font-mono uppercase tracking-wider ${isActive ? 'text-[#00ffff]' : ''}`}>
        {tab.label}
      </span>
    </Link>
  );
}
