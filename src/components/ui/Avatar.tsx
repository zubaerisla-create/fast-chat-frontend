'use client';

interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-32 h-32 text-4xl',
};

const colors = [
  'from-[#7C6EFF] to-[#A89CFF]',
  'from-[#FF6E9C] to-[#FFB3CC]',
  'from-[#6EFFDB] to-[#A8FFE9]',
  'from-[#FFB86E] to-[#FFD4A8]',
  'from-[#6EBAFF] to-[#A8D8FF]',
];

function getColor(username: string) {
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function Avatar({ username, size = 'md', isOnline }: AvatarProps) {
  const initial = username?.[0]?.toUpperCase() || '?';
  const color = getColor(username || '');

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-display font-bold text-white`}
      >
        {initial}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0D0D1A] ${isOnline ? 'bg-green-400 online-pulse' : 'bg-white/20'
            }`}
        />
      )}
    </div>
  );
}
