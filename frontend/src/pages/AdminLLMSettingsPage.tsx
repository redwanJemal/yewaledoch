/**
 * Admin LLM provider settings — configure translation backend.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, FlaskConical, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '@/lib/api';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', modelHint: 'claude-sonnet-4-20250514' },
  { value: 'openai',    label: 'OpenAI (GPT)',       modelHint: 'gpt-4o' },
  { value: 'deepseek',  label: 'DeepSeek',           modelHint: 'deepseek-chat' },
  { value: 'custom',    label: 'Custom (OpenAI-compatible)', modelHint: '' },
] as const;

const DEFAULT_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
};

interface Props { onBack: () => void }

export function AdminLLMSettingsPage({ onBack }: Props) {
  const qc = useQueryClient();

  const { data: current, isLoading } = useQuery({
    queryKey: ['llm-settings'],
    queryFn: adminApi.getLLMSettings,
    retry: false,
  });

  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey]     = useState('');
  const [model, setModel]       = useState('claude-sonnet-4-20250514');
  const [baseUrl, setBaseUrl]   = useState('');
  const [enabled, setEnabled]   = useState(true);
  const [showKey, setShowKey]   = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (current) {
      setProvider(current.provider);
      setModel(current.model);
      setBaseUrl(current.base_url ?? '');
      setEnabled(current.enabled);
    }
  }, [current]);

  function handleProviderChange(p: string) {
    setProvider(p);
    const found = PROVIDERS.find((x) => x.value === p);
    if (found) setModel(found.modelHint);
    setBaseUrl(DEFAULT_URLS[p] ?? '');
    setTestResult(null);
  }

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveLLMSettings({
      provider, model,
      api_key: apiKey.trim() || null,
      base_url: baseUrl.trim() || null,
      enabled,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['llm-settings'] });
      setApiKey('');
    },
  });

  const testMutation = useMutation({
    mutationFn: adminApi.testLLMSettings,
    onSuccess: (d) => setTestResult({ ok: true,  msg: `Connected — ${d.provider} / ${d.model}` }),
    onError:   (e) => setTestResult({ ok: false, msg: (e as Error).message }),
  });

  const needsBaseUrl = provider === 'deepseek' || provider === 'custom';
  const modelHint = PROVIDERS.find((p) => p.value === provider)?.modelHint ?? '';

  return (
    <div className="min-h-screen bg-tg-bg">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="sticky top-0 bg-tg-bg/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-tg-hint/10">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-tg-hint hover:bg-tg-secondary-bg">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-tg-text">LLM Settings</h2>
          </div>
        </div>

        <div className="px-4 py-4 pb-24 space-y-4">

          {isLoading ? (
            <div className="h-64 bg-tg-secondary-bg rounded-2xl animate-pulse" />
          ) : (
            <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-4">

              {/* Current status */}
              {current && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${current.enabled && current.api_key_set ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-tg-hint">
                    {current.enabled && current.api_key_set
                      ? `Active — ${current.provider} / ${current.model}`
                      : current.api_key_set ? 'Disabled' : 'No API key set'}
                  </span>
                </div>
              )}

              {/* Provider */}
              <div>
                <label className="block text-xs font-semibold text-tg-hint mb-1.5">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full bg-tg-bg border border-tg-hint/20 rounded-xl px-3 py-2 text-sm text-tg-text focus:outline-none focus:border-tg-button"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-tg-hint mb-1.5">
                  API Key
                  {current?.api_key_set && (
                    <span className="ml-2 font-normal text-green-600">· key is set</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={current?.api_key_set ? 'Leave blank to keep existing' : 'Paste API key…'}
                    autoComplete="off"
                    className="w-full bg-tg-bg border border-tg-hint/20 rounded-xl px-3 py-2 pr-10 text-sm text-tg-text font-mono placeholder-tg-hint focus:outline-none focus:border-tg-button"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tg-hint"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-semibold text-tg-hint mb-1.5">Model</label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={modelHint || 'Model name…'}
                  className="w-full bg-tg-bg border border-tg-hint/20 rounded-xl px-3 py-2 text-sm text-tg-text font-mono placeholder-tg-hint focus:outline-none focus:border-tg-button"
                />
                {modelHint && (
                  <p className="text-[11px] text-tg-hint mt-1">e.g. {modelHint}</p>
                )}
              </div>

              {/* Base URL */}
              {needsBaseUrl && (
                <div>
                  <label className="block text-xs font-semibold text-tg-hint mb-1.5">Base URL</label>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={DEFAULT_URLS[provider] ?? 'https://…/v1'}
                    className="w-full bg-tg-bg border border-tg-hint/20 rounded-xl px-3 py-2 text-sm text-tg-text font-mono placeholder-tg-hint focus:outline-none focus:border-tg-button"
                  />
                </div>
              )}

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-tg-text">Enabled</p>
                  <p className="text-[11px] text-tg-hint">
                    {enabled ? 'Use these settings for translation' : 'Fall back to env var'}
                  </p>
                </div>
                <button
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-tg-button' : 'bg-tg-hint/30'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                  testResult.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
                }`}>
                  {testResult.ok ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          )}

          {/* Info box */}
          <div className="bg-tg-button/5 border border-tg-button/15 rounded-2xl p-4 text-xs text-tg-hint space-y-1">
            <p className="font-semibold text-tg-text">How it works</p>
            <p>Translation runs at scrape time. If it fails, use the Translate button in the Draft Queue to re-translate individual posts after saving your key here.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setTestResult(null); testMutation.mutate(); }}
              disabled={testMutation.isPending}
              className="flex items-center gap-2 flex-1 justify-center bg-tg-secondary-bg text-tg-text rounded-2xl py-3 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              <FlaskConical size={16} />
              {testMutation.isPending ? 'Testing…' : 'Test'}
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 flex-1 justify-center bg-tg-button text-tg-button-text rounded-2xl py-3 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Save size={16} />
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
