'use client';

export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#7C6EFF]/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#7C6EFF]/20 to-[#A89CFF]/10 flex items-center justify-center mx-auto mb-6 border border-[#7C6EFF]/20">
          <span className="text-4xl">💬</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-white/80 mb-2">Your Messages</h2>
        <p className="text-white/30 text-sm font-sans max-w-[240px]">
          Select a conversation from the sidebar or start a new one by clicking on the search icon
        </p>

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#7C6EFF]/40 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
