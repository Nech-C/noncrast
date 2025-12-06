import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useSettings } from '../state/settingsContext';
import { SettingsUpdate } from '../settings/schema';

const sections = [
  { key: 'general', label: 'General' },
  { key: 'theme', label: 'Theme' },
  { key: 'interruption', label: 'Interruption' },
];

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="bg-violet-100 flex flex-col gap-1 h-full w-64 p-2.5 rounded-br-xl overflow-y-auto">
      {sections.map(({ key, label }) => {
        const selected = active === key;
        return (
          <Link
            key={key}
            to={`/settings/${key}`}
            className={`flex flex-col gap-1 px-10 py-2.5 rounded-xl text-xl font-semibold ${
              selected ? 'bg-violet-50 shadow-sm' : 'hover:bg-white'
            }`}
          >
            <span>{label}</span>
            <span className="block h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
          </Link>
        );
      })}
    </aside>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`w-16 h-9 rounded-full p-0.5 transition-colors duration-150 flex items-center ${
        value ? 'bg-emerald-500' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`h-8 w-8 rounded-full bg-white shadow transform transition-transform duration-150 ${
          value ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

type RowProps = {
  title: string;
  description: string;
  control: React.ReactNode;
};

function SettingRow({ title, description, control }: RowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-200 last:border-b-0">
      <div className="relative w-full pr-6 max-w-3xl">
        <p className="text-md font-medium text-black leading-none mb-2">{title}</p>
        <p className="text-base text-zinc-600leading-snug">{description}</p>
      </div>
      <div className="min-w-[120px] text-right text-lg text-black">{control}</div>
    </div>
  );
}

function formatHourLabel(h: number) {
  const hour12 = ((h + 11) % 12) + 1;
  const suffix = h < 12 ? 'AM' : 'PM';
  const padded = hour12.toString().padStart(2, '0');
  return `${padded}:00 ${suffix}`;
}

function NumberField({
  value,
  min,
  max,
  step = 1,
  onCommit,
  suffix,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState<string>(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  function commit(raw: string) {
    let next = Number(raw);
    if (Number.isNaN(next)) {
      setLocal(String(value));
      return;
    }
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onCommit(next);
    setLocal(String(next));
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        }}
        className="w-24 px-3 py-2 rounded-lg border border-zinc-300 text-right text-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      {suffix ? <span className="text-lg text-black">{suffix}</span> : null}
    </div>
  );
}

function GeneralPanel({ endOfDay, onUpdate }: { endOfDay: number; onUpdate: (patch: SettingsUpdate) => void }) {
  const options = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ value: h, label: formatHourLabel(h) })), []);

  return (
    <SettingRow
      title="End of Day"
      description="Defines when a “day” ends for the app. It controls the start and the end of 24hr intervals over which stats are calculated."
      control={
        <select
          value={endOfDay}
          onChange={(e) => onUpdate({ endOfDay: Number(e.target.value) })}
          className="w-32 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-right text-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      }
    />
  );
}

function ThemePanel({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <SettingRow
      title="Dark Mode"
      description="Switches on the dark mode"
      control={<Toggle value={theme === 'dark'} onChange={onToggle} label="Dark mode" />}
    />
  );
}

function InterruptionPanel({
  enableDetection,
  interruptionDetectionIntervalS,
  interruptionThreshold,
  interruptionPauseTrigger,
  onUpdate,
}: {
  enableDetection: boolean;
  interruptionDetectionIntervalS: number;
  interruptionThreshold: number;
  interruptionPauseTrigger: number;
  onUpdate: (patch: SettingsUpdate) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SettingRow
        title="Enable Detection"
        description="Enables detection when the timer is on."
        control={<Toggle value={enableDetection} onChange={(v) => onUpdate({ enableDetection: v })} label="Enable detection" />}
      />

      <SettingRow
        title="Detection Interval"
        description="Sets the interval between detections."
        control={
          <NumberField
            value={interruptionDetectionIntervalS}
            min={1}
            step={1}
            suffix="s"
            onCommit={(v) => onUpdate({ interruptionDetectionIntervalS: v })}
          />
        }
      />

      <SettingRow
        title="Detection Threshold"
        description="The minimum confidence level required for screenshots to be considered as an instance of interruption."
        control={
          <NumberField
            value={Math.round(interruptionThreshold * 100)}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onCommit={(v) => onUpdate({ interruptionThreshold: v / 100 })}
          />
        }
      />

      <SettingRow
        title="Timer Pause Trigger"
        description="The number of interruptions required to pause the timer."
        control={
          <NumberField
            value={interruptionPauseTrigger}
            min={1}
            step={1}
            onCommit={(v) => onUpdate({ interruptionPauseTrigger: v })}
          />
        }
      />
    </div>
  );
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = useMemo(() => {
    const parts = location.pathname.split('/');
    const key = parts[2] ?? 'general';
    return sections.find((s) => s.key === key)?.key ?? 'general';
  }, [location.pathname]);

  // Redirect unknown section to default
  React.useEffect(() => {
    if (!sections.find((s) => s.key === activeSection)) {
      navigate('/settings/general', { replace: true });
    }
  }, [activeSection, navigate]);

  return (
    <div className="flex h-full w-full bg-violet-50">
      <Sidebar active={activeSection} />
      <section className="flex-1 px-10 py-8 overflow-y-auto custom-scrollbar" aria-label="Settings content">
        {activeSection === 'general' && <GeneralPanel endOfDay={settings.endOfDay} onUpdate={update} />}
        {activeSection === 'theme' && (
          <ThemePanel
            theme={settings.theme}
            onToggle={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          />
        )}
        {activeSection === 'interruption' && (
          <InterruptionPanel
            enableDetection={settings.enableDetection}
            interruptionDetectionIntervalS={settings.interruptionDetectionIntervalS}
            interruptionThreshold={settings.interruptionThreshold}
            interruptionPauseTrigger={settings.interruptionPauseTrigger}
            onUpdate={(patch) => update(patch)}
          />
        )}
      </section>
    </div>
  );
}
