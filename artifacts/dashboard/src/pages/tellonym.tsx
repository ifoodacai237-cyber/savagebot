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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ModulePage, FormSection } from "@/components/module-page";
import { MessageCircleQuestion, Save, Loader2 } from "lucide-react";

export default function Tellonym() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      tellonymChannel: "",
      tellonymColor: "#7c3aed",
      tellonymBanner: "",
      tellonymThumb: "",
      tellonymTitle: "",
      tellonymText: "",
      tellonymFooter: "",
      tellonymBtnLabel: "",
      tellonymBtnEmoji: "",
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        tellonymChannel: config.tellonymChannel ?? "",
        tellonymColor: config.tellonymColor ?? "#7c3aed",
        tellonymBanner: config.tellonymBanner ?? "",
        tellonymThumb: config.tellonymThumb ?? "",
        tellonymTitle: config.tellonymTitle ?? "",
        tellonymText: config.tellonymText ?? "",
        tellonymFooter: config.tellonymFooter ?? "",
        tellonymBtnLabel: config.tellonymBtnLabel ?? "",
        tellonymBtnEmoji: config.tellonymBtnEmoji ?? "",
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Tellonym atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Tellonym"
      description="Configure o modulo de mensagens anonimas do servidor."
      icon={<MessageCircleQuestion className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Canal">
            <FormField control={form.control} name="tellonymChannel" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Canal</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-tellonym-channel" /></FormControl>
                <FormDescription>Canal onde as perguntas anonimas serao enviadas</FormDescription>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Mensagem do Painel">
            <FormField control={form.control} name="tellonymTitle" render={({ field }) => (
              <FormItem>
                <FormLabel>Titulo</FormLabel>
                <FormControl><Input placeholder="Perguntas Anonimas" {...field} value={field.value ?? ""} data-testid="input-tellonym-title" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="tellonymText" render={({ field }) => (
              <FormItem>
                <FormLabel>Texto</FormLabel>
                <FormControl><Textarea placeholder="Envie uma pergunta anonima!" {...field} value={field.value ?? ""} className="resize-none" rows={3} data-testid="textarea-tellonym-text" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="tellonymFooter" render={({ field }) => (
              <FormItem>
                <FormLabel>Rodape</FormLabel>
                <FormControl><Input placeholder="Texto do rodape..." {...field} value={field.value ?? ""} data-testid="input-tellonym-footer" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Botao">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tellonymBtnLabel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Label do Botao</FormLabel>
                  <FormControl><Input placeholder="Enviar Pergunta" {...field} value={field.value ?? ""} data-testid="input-tellonym-btn-label" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="tellonymBtnEmoji" render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji do Botao</FormLabel>
                  <FormControl><Input placeholder="💬" {...field} value={field.value ?? ""} data-testid="input-tellonym-btn-emoji" /></FormControl>
                </FormItem>
              )} />
            </div>
          </FormSection>

          <FormSection title="Aparencia">
            <FormField control={form.control} name="tellonymColor" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor (Hex)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center">
                    <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#7c3aed"} onChange={(e) => field.onChange(e.target.value)} data-testid="color-tellonym" />
                    <Input placeholder="#7c3aed" {...field} value={field.value ?? ""} className="font-mono" data-testid="input-tellonym-color" />
                  </div>
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="tellonymBanner" render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Banner</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-tellonym-banner" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="tellonymThumb" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Miniatura</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-tellonym-thumb" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-tellonym">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
