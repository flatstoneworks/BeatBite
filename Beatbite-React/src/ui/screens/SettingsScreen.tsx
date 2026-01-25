/**
 * SettingsScreen - App configuration options.
 * Placeholder for now - will contain audio settings, preferences, etc.
 */
export function SettingsScreen() {
  return (
    <div className="flex flex-col min-h-full px-6 py-8 pb-20">
      {/* Header */}
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Settings sections placeholder */}
      <div className="space-y-6">
        {/* Audio settings */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white/70 font-medium mb-3">Audio</h2>
          <div className="space-y-3">
            <SettingRow label="Sample rate" value="48kHz" />
            <SettingRow label="Buffer size" value="256 samples" />
          </div>
        </section>

        {/* Metronome settings */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white/70 font-medium mb-3">Metronome</h2>
          <div className="space-y-3">
            <SettingRow label="Default BPM" value="120" />
            <SettingRow label="Bars" value="4" />
          </div>
        </section>

        {/* About */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white/70 font-medium mb-3">About</h2>
          <div className="space-y-3">
            <SettingRow label="Version" value="0.1.0" />
            <SettingRow label="Build" value="Prototype" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white/70 text-sm">{value}</span>
    </div>
  );
}
