import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Save, FlaskConical, CheckCircle, AlertCircle } from 'lucide-react';
import { adminApi, type LLMSettingsUpdate } from '@/lib/api';
import { toast } from 'sonner';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
] as const;

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  deepseek: 'deepseek-chat',
  custom: '',
};

const PROVIDER_DEFAULT_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  custom: '',
};

const PROVIDER_MODEL_HINTS: Record<string, string> = {
  anthropic: 'e.g. claude-sonnet-4-20250514, claude-haiku-4-5-20251001',
  openai: 'e.g. gpt-4o, gpt-4-turbo, gpt-3.5-turbo',
  deepseek: 'e.g. deepseek-chat, deepseek-reasoner',
  custom: 'Model name for your endpoint',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: current, isLoading } = useQuery({
    queryKey: ['llm-settings'],
    queryFn: adminApi.getLLMSettings,
    retry: false, // 404 = not configured yet, that's fine
  });

  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDER_DEFAULT_MODELS['anthropic']);
  const [baseUrl, setBaseUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Populate form when existing settings are loaded
  useEffect(() => {
    if (current) {
      setProvider(current.provider);
      setModel(current.model);
      setBaseUrl(current.base_url || '');
      setEnabled(current.enabled);
      // Do NOT populate api_key (server never returns it)
    }
  }, [current]);

  // When provider changes, auto-fill sensible defaults for model/base_url
  // only if the fields look like they're still at a previous default
  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    setModel(PROVIDER_DEFAULT_MODELS[newProvider] || '');
    setBaseUrl(PROVIDER_DEFAULT_URLS[newProvider] || '');
    setTestResult(null);
  }

  const saveMutation = useMutation({
    mutationFn: (data: LLMSettingsUpdate) => adminApi.saveLLMSettings(data),
    onSuccess: () => {
      toast.success('LLM settings saved');
      queryClient.invalidateQueries({ queryKey: ['llm-settings'] });
      setApiKey(''); // clear field after save
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: adminApi.testLLMSettings,
    onSuccess: (data) => {
      setTestResult({ ok: true, message: `Connected — ${data.provider} / ${data.model}` });
    },
    onError: (err: Error) => {
      setTestResult({ ok: false, message: err.message });
    },
  });

  function handleSave() {
    const data: LLMSettingsUpdate = {
      provider,
      model,
      base_url: baseUrl || null,
      enabled,
    };
    // Only send api_key if the admin typed something new
    if (apiKey.trim()) {
      data.api_key = apiKey.trim();
    }
    saveMutation.mutate(data);
  }

  const needsBaseUrl = provider === 'deepseek' || provider === 'custom';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure the AI translation provider used for the draft pipeline.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {/* Section header */}
        <div className="px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">LLM Provider</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Used to translate Reddit posts to Amharic before admin review. You can re-translate individual drafts from the Draft Queue.
          </p>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
              Loading settings…
            </div>
          )}

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
              {current?.api_key_set && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  (key is set — leave blank to keep existing)
                </span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={current?.api_key_set ? '••••••••••••••••' : 'Paste your API key'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              autoComplete="off"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_MODEL_HINTS[provider] || 'Model name'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">{PROVIDER_MODEL_HINTS[provider]}</p>
          </div>

          {/* Base URL (DeepSeek / custom only) */}
          {needsBaseUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={PROVIDER_DEFAULT_URLS[provider] || 'https://your-endpoint.com/v1'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">OpenAI-compatible endpoint base URL</p>
            </div>
          )}

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">
              {enabled ? 'Enabled — use these settings for translation' : 'Disabled — fall back to ANTHROPIC_API_KEY env var'}
            </span>
          </div>

          {/* Test result banner */}
          {testResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
              testResult.ok
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.ok
                ? <CheckCircle size={16} className="shrink-0" />
                : <AlertCircle size={16} className="shrink-0" />}
              {testResult.message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { setTestResult(null); testMutation.mutate(); }}
            disabled={testMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <FlaskConical size={16} />
            {testMutation.isPending ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700 space-y-1">
        <p className="font-medium">How translation works</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-600">
          <li>Posts are scraped from Reddit and saved as drafts — nothing is published automatically.</li>
          <li>Translation runs at scrape time using the provider configured here.</li>
          <li>If translation fails or you want a fresh version, use the "Translate" button on any draft.</li>
          <li>Admin reviews and edits the Amharic content before publishing.</li>
        </ul>
      </div>
    </div>
  );
}
