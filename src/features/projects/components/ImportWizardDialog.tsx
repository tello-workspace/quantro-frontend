'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  usePreviewImportMutation,
  useApplyImportMutation,
  type ImportFormat,
  type ImportPreview,
  type ColumnMappingEntry,
} from '@/features/projects/importApi';

interface MemberOption {
  userId: string;
  user: { id: string; name: string };
}

interface ImportWizardDialogProps {
  projectId: string;
  members: MemberOption[];
}

type Step = 'upload' | 'mapping' | 'done';

const selectClass = 'h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs';

function tahminFormat(dosyaAdi: string): ImportFormat {
  return dosyaAdi.toLowerCase().endsWith('.csv') ? 'JIRA_CSV' : 'TRELLO_JSON';
}

export const ImportWizardDialog: React.FC<ImportWizardDialogProps> = ({ projectId, members }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [format, setFormat] = useState<ImportFormat>('TRELLO_JSON');
  const [fileContent, setFileContent] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, ColumnMappingEntry>>({});
  const [userMapping, setUserMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<{ createdColumns: number; createdCards: number; createdLabels: number; skippedCards: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewImport, { isLoading: previewing }] = usePreviewImportMutation();
  const [applyImport, { isLoading: applying }] = useApplyImportMutation();

  const sifirla = () => {
    setStep('upload');
    setFileContent('');
    setPreview(null);
    setColumnMapping({});
    setUserMapping({});
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormat(tahminFormat(file.name));
    setFileContent(await file.text());
  };

  const handlePreview = async () => {
    if (!fileContent.trim()) {
      toast.error('Önce bir dosya seç');
      return;
    }
    try {
      const sonuc = await previewImport({ projectId, format, fileContent }).unwrap();
      setPreview(sonuc);

      const kolonMapping: Record<string, ColumnMappingEntry> = {};
      for (const kolon of sonuc.columns) {
        kolonMapping[kolon.sourceId] = kolon.suggestedColumnId
          ? { mode: 'existing', columnId: kolon.suggestedColumnId }
          : { mode: 'new', name: kolon.name };
      }
      setColumnMapping(kolonMapping);

      const kullaniciMapping: Record<string, string | null> = {};
      for (const kisi of sonuc.assignees) {
        kullaniciMapping[kisi.identifier] = kisi.matchedUserId;
      }
      setUserMapping(kullaniciMapping);

      setStep('mapping');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Dosya okunamadı — geçerli bir Trello JSON / Jira CSV dışa aktarımı mı?');
    }
  };

  const handleApply = async () => {
    try {
      const sonuc = await applyImport({ projectId, format, fileContent, columnMapping, userMapping }).unwrap();
      setResult(sonuc);
      setStep('done');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'İçe aktarma uygulanamadı');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) sifirla();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Upload className="size-3.5" /> Trello / Jira'dan içe aktar
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trello / Jira'dan içe aktar</DialogTitle>
          <DialogDescription>
            Trello pano dışa aktarımı (.json) veya Jira issue dışa aktarımı (.csv) yükle, eşlemeyi gözden geçir, onayla.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Kaynak</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('TRELLO_JSON')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${format === 'TRELLO_JSON' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Trello (.json)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('JIRA_CSV')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${format === 'JIRA_CSV' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Jira (.csv)
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Dosya</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                className="w-full text-sm"
              />
              {fileContent && <p className="mt-1 text-xs text-muted-foreground">Dosya okundu ({(fileContent.length / 1024).toFixed(0)} KB).</p>}
            </div>
          </div>
        )}

        {step === 'mapping' && preview && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{preview.totalCards} kart bulundu.</p>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Sütun eşlemesi</p>
              <div className="space-y-2">
                {preview.columns.map((kolon) => {
                  const secim = columnMapping[kolon.sourceId];
                  const secimDeger = secim?.mode === 'existing' ? secim.columnId : secim?.mode === 'skip' ? '__skip__' : '__new__';
                  return (
                    <div key={kolon.sourceId} className="flex items-center gap-2 rounded-md border border-border/50 p-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {kolon.name} <span className="text-muted-foreground">({kolon.cardCount} kart)</span>
                      </span>
                      <select
                        className={selectClass + ' max-w-[220px]'}
                        value={secimDeger}
                        onChange={(e) => {
                          const v = e.target.value;
                          setColumnMapping((prev) => ({
                            ...prev,
                            [kolon.sourceId]:
                              v === '__skip__'
                                ? { mode: 'skip' }
                                : v === '__new__'
                                  ? { mode: 'new', name: kolon.name }
                                  : { mode: 'existing', columnId: v },
                          }));
                        }}
                      >
                        <option value="__new__">Yeni sütun oluştur: "{kolon.name}"</option>
                        {preview.existingColumns.map((ek) => (
                          <option key={ek.id} value={ek.id}>
                            → {ek.name}
                          </option>
                        ))}
                        <option value="__skip__">Atla (içe aktarma)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {preview.assignees.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Atanan eşlemesi</p>
                <div className="space-y-2">
                  {preview.assignees.map((kisi) => (
                    <div key={kisi.identifier} className="flex items-center gap-2 rounded-md border border-border/50 p-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {kisi.identifier} <span className="text-muted-foreground">({kisi.cardCount} kart)</span>
                      </span>
                      <select
                        className={selectClass + ' max-w-[220px]'}
                        value={userMapping[kisi.identifier] ?? '__none__'}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUserMapping((prev) => ({ ...prev, [kisi.identifier]: v === '__none__' ? null : v }));
                        }}
                      >
                        <option value="__none__">Atanmasız bırak</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.labels.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Etiketler (otomatik oluşturulacak)</p>
                <p className="text-xs text-muted-foreground">
                  {preview.labels.map((l) => `${l.name} (${l.cardCount})`).join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-1 text-sm">
            <p>{result.createdCards} kart oluşturuldu.</p>
            {result.createdColumns > 0 && <p>{result.createdColumns} yeni sütun oluşturuldu.</p>}
            {result.createdLabels > 0 && <p>{result.createdLabels} yeni etiket oluşturuldu.</p>}
            {result.skippedCards > 0 && <p className="text-muted-foreground">{result.skippedCards} kart atlanan sütunlardan olduğu için içe aktarılmadı.</p>}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button type="button" onClick={handlePreview} disabled={!fileContent || previewing}>
              {previewing ? 'Okunuyor…' : 'Önizle'}
            </Button>
          )}
          {step === 'mapping' && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                Geri
              </Button>
              <Button type="button" onClick={handleApply} disabled={applying}>
                {applying ? 'Uygulanıyor…' : 'Onayla ve içe aktar'}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button type="button" onClick={() => setOpen(false)}>
              Kapat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
