import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, ImageOff, Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Componente único de seleção/edição de capa de livro.
 *
 * Suporta:
 *  - Aba "Arquivo": <input type="file" accept="image/*"> com preview 4:5
 *  - Aba "Câmera": <input type="file" accept="image/*" capture="environment">
 *    (no tablet/celular abre a câmera nativa diretamente)
 *  - Aba "URL": colar uma URL pública (ex.: capa de site, Google Images)
 *
 * O componente retorna o "estado em rascunho" via callbacks. Quem o usa decide
 * quando enviar para o backend (no submit do formulário).
 *
 * Visual: a área de preview é sempre 4:5 retrato, centralizada, com fallback elegante.
 */

type Mode = "file" | "url";

export interface CoverPickerValue {
  mode: Mode;
  fileBase64?: string; // data URL pronto para enviar ao backend
  externalUrl?: string;
}

interface Props {
  initialUrl?: string | null;
  onChange: (value: CoverPickerValue | null) => void;
  /** Permite o botão "remover" para limpar a capa atual. */
  allowClear?: boolean;
  onClear?: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function CoverPicker({ initialUrl, onChange, allowClear, onClear }: Props) {
  const [activeTab, setActiveTab] = useState<"file" | "camera" | "url">("file");
  const [previewSrc, setPreviewSrc] = useState<string | null>(initialUrl ?? null);
  const [externalUrl, setExternalUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      toast.error("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem maior que 5 MB. Reduza antes de enviar.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviewSrc(dataUrl);
      onChange({ mode: "file", fileBase64: dataUrl });
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }
  };

  const handleUrlConfirm = () => {
    const url = externalUrl.trim();
    if (!url) {
      toast.error("Cole uma URL de imagem.");
      return;
    }
    try {
      // Validação leve no client; o backend valida com z.string().url()
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      toast.error("URL inválida.");
      return;
    }
    setPreviewSrc(url);
    onChange({ mode: "url", externalUrl: url });
  };

  const handleClear = () => {
    setPreviewSrc(null);
    setExternalUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onChange(null);
    onClear?.();
  };

  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-4">
      {/* Preview 4:5 fixo */}
      <div className="space-y-2">
        <div
          className="w-full bg-muted rounded-md overflow-hidden border flex items-center justify-center"
          style={{ aspectRatio: "4 / 5" }}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="Capa do livro"
              className="w-full h-full object-cover"
              onError={() => {
                toast.error("Não foi possível carregar a imagem da URL.");
                setPreviewSrc(null);
              }}
            />
          ) : (
            <div className="text-muted-foreground text-xs flex flex-col items-center gap-1 p-3 text-center">
              <ImageOff className="h-5 w-5" />
              <span>Sem capa</span>
              <span className="text-[10px] opacity-70">(formato 4:5)</span>
            </div>
          )}
        </div>
        {allowClear && previewSrc && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="w-full"
            onClick={handleClear}
          >
            Remover capa
          </Button>
        )}
      </div>

      {/* Tabs de origem da imagem */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="file">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Arquivo
          </TabsTrigger>
          <TabsTrigger value="camera">
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Câmera
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-3 space-y-2">
          <Label htmlFor="cover-file">Selecionar imagem do dispositivo</Label>
          <Input
            ref={fileInputRef}
            id="cover-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WEBP até 5 MB. Recomendamos a proporção 4:5 (ex.: 800×1000).
          </p>
        </TabsContent>

        <TabsContent value="camera" className="mt-3 space-y-2">
          <Label htmlFor="cover-camera">Tirar foto agora</Label>
          <Input
            ref={cameraInputRef}
            id="cover-camera"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            No tablet/celular, abre a câmera traseira. Tire a foto da capa centralizada,
            sem sombras, com boa iluminação.
          </p>
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-2">
          <Label htmlFor="cover-url">URL pública da imagem</Label>
          <div className="flex gap-2">
            <Input
              id="cover-url"
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrlConfirm();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={handleUrlConfirm}>
              Usar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole o link direto da imagem (ex.: capa de site da editora). A URL fica
            armazenada como referência — se sair do ar, a capa some.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
