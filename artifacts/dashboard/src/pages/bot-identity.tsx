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
import { Bot, Save, Loader2 } from "lucide-react";

export default function BotIdentity() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      botIconUrl: "",
      botBannerUrl: "",
      botBio: "",
      aiChannelId: "",
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        botIconUrl: config.botIconUrl ?? "",
        botBannerUrl: config.botBannerUrl ?? "",
        botBio: config.botBio ?? "",
        aiChannelId: config.aiChannelId ?? "",
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Identidade atualizada com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Identidade do Bot"
      description="Personalize a aparencia e identidade do bot especificamente para este servidor."
      icon={<Bot className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Personalizacao por Servidor">
            <FormField control={form.control} name="botIconUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Icone do Bot</FormLabel>
                <FormControl><Input placeholder="https://cdn.discordapp.com/..." {...field} value={field.value ?? ""} data-testid="input-bot-icon-url" /></FormControl>
                <FormDescription>URL da imagem usada como icone do bot neste servidor. Use o comando /personalizar icone.</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="botBannerUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Banner do Bot</FormLabel>
                <FormControl><Input placeholder="https://cdn.discordapp.com/..." {...field} value={field.value ?? ""} data-testid="input-bot-banner-url" /></FormControl>
                <FormDescription>URL do banner exibido no perfil do bot neste servidor.</FormDescription>
              </FormItem>
            )} />
            <FormField control={form.control} name="botBio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio do Bot</FormLabel>
                <FormControl><Textarea placeholder="Descricao personalizada do bot para este servidor..." {...field} value={field.value ?? ""} className="resize-none" rows={4} data-testid="textarea-bot-bio" /></FormControl>
                <FormDescription>Texto exibido na bio do bot especificamente neste servidor.</FormDescription>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Inteligencia Artificial">
            <FormField control={form.control} name="aiChannelId" render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Canal de IA</FormLabel>
                <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-ai-channel-id" /></FormControl>
                <FormDescription>
                  Canal onde o bot respondera automaticamente com IA ao ser mencionado.
                  Configure sua chave da Groq API no servidor para ativar este modulo.
                </FormDescription>
              </FormItem>
            )} />
          </FormSection>

          <div className="glass rounded-xl p-5 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Como funciona a personalizacao</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O bot usa a API do Discord para definir avatar, banner e bio especificos por servidor.
                  Essas configuracoes sobrescrevem as configuracoes globais do bot apenas neste servidor.
                  As mudancas podem levar alguns segundos para refletir no Discord.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-bot-identity">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
