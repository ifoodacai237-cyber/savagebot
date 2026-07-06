import React from "react";
import { useGuild } from "@/lib/guild-context";
import {
  useGetGuildConfig,
  useUpdateGuildConfig,
  getGetGuildConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ModulePage, FormSection } from "@/components/module-page";
import { ShoppingCart, Save, Loader2 } from "lucide-react";

export default function Shop() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      lojaTitle: "",
      lojaText: "",
      lojaBanner: "",
      lojaThumb: "",
      lojaColor: "#7c3aed",
      lojaConversao: "",
      lojaUseDivider: false,
      shopEmojiComprar: "",
      shopEmojiVitrine: "",
      shopEmojiConverter: "",
      shopEmojiSaldo: "",
      shopEmojiGift: "",
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        lojaTitle: config.lojaTitle ?? "",
        lojaText: config.lojaText ?? "",
        lojaBanner: config.lojaBanner ?? "",
        lojaThumb: config.lojaThumb ?? "",
        lojaColor: config.lojaColor ?? "#7c3aed",
        lojaConversao: config.lojaConversao ?? "",
        lojaUseDivider: config.lojaUseDivider ?? false,
        shopEmojiComprar: config.shopEmojiComprar ?? "",
        shopEmojiVitrine: config.shopEmojiVitrine ?? "",
        shopEmojiConverter: config.shopEmojiConverter ?? "",
        shopEmojiSaldo: config.shopEmojiSaldo ?? "",
        shopEmojiGift: config.shopEmojiGift ?? "",
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Loja atualizada com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Loja"
      description="Configure a aparência e funcionamento da loja do servidor."
      icon={<ShoppingCart className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Aparência do Painel">
            <FormField control={form.control} name="lojaTitle" render={({ field }) => (
              <FormItem>
                <FormLabel>Título da Loja</FormLabel>
                <FormControl><Input placeholder="Loja do Servidor" {...field} value={field.value ?? ""} data-testid="input-shop-title" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="lojaText" render={({ field }) => (
              <FormItem>
                <FormLabel>Texto Descritivo</FormLabel>
                <FormControl><Textarea placeholder="Compre itens exclusivos com suas FallenCoins!" {...field} value={field.value ?? ""} className="resize-none" rows={3} data-testid="textarea-shop-text" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="lojaColor" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor (Hex)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center">
                    <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#7c3aed"} onChange={(e) => field.onChange(e.target.value)} data-testid="color-shop" />
                    <Input placeholder="#7c3aed" {...field} value={field.value ?? ""} className="font-mono" data-testid="input-shop-color" />
                  </div>
                </FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Imagens">
            <FormField control={form.control} name="lojaBanner" render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Banner</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-shop-banner" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="lojaThumb" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Miniatura</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-shop-thumb" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Configuracoes">
            <FormField control={form.control} name="lojaConversao" render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa de Conversao</FormLabel>
                <FormControl><Input placeholder="Ex: 100" {...field} value={field.value ?? ""} data-testid="input-shop-conversao" /></FormControl>
                <FormDescription>Quantas mensagens/minutos de voz equivalem a 1 FallenCoin</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="lojaUseDivider" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Usar Divisor</FormLabel><FormDescription>Linha divisória no painel da loja</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-shop-use-divider" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Emojis dos Botoes">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="shopEmojiComprar" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji Comprar</FormLabel>
                  <FormControl><Input placeholder="🛒" {...field} value={field.value ?? ""} data-testid="input-shop-emoji-comprar" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="shopEmojiVitrine" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji Vitrine</FormLabel>
                  <FormControl><Input placeholder="🏪" {...field} value={field.value ?? ""} data-testid="input-shop-emoji-vitrine" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="shopEmojiConverter" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji Converter</FormLabel>
                  <FormControl><Input placeholder="🔄" {...field} value={field.value ?? ""} data-testid="input-shop-emoji-converter" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="shopEmojiSaldo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji Saldo</FormLabel>
                  <FormControl><Input placeholder="💰" {...field} value={field.value ?? ""} data-testid="input-shop-emoji-saldo" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="shopEmojiGift" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji Gift</FormLabel>
                  <FormControl><Input placeholder="🎁" {...field} value={field.value ?? ""} data-testid="input-shop-emoji-gift" /></FormControl>
                </FormItem>
              )} />
            </div>
          </FormSection>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-shop">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
