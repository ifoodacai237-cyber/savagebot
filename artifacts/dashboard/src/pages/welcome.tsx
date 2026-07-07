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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ModulePage, FormSection } from "@/components/module-page";
import { DiscordEmbedPreview } from "@/components/discord-embed-preview";
import { MessageSquare, Save, Loader2 } from "lucide-react";

export default function Welcome() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

  const form = useForm({
    defaultValues: {
      welcomeEnabled: true,
      welcomeChannel: "",
      welcomeColor: "#7c3aed",
      welcomeBanner: "",
      welcomeThumb: "",
      welcomeTitle: "",
      welcomeText: "",
      welcomeFooter: "",
      welcomeRoles: "",
      welcomeChannels: "",
      welcomeUseDivider: false,
      welcomeBannerPosition: "top",
      welcomeShowTitle: true,
      welcomeShowAvatar: true,
      welcomeDeleteAfter: null as number | null,
    },
  });

  const watched = form.watch();

  React.useEffect(() => {
    if (config) {
      form.reset({
        welcomeEnabled: config.welcomeEnabled ?? true,
        welcomeChannel: config.welcomeChannel ?? "",
        welcomeColor: config.welcomeColor ?? "#7c3aed",
        welcomeBanner: config.welcomeBanner ?? "",
        welcomeThumb: config.welcomeThumb ?? "",
        welcomeTitle: config.welcomeTitle ?? "",
        welcomeText: config.welcomeText ?? "",
        welcomeFooter: config.welcomeFooter ?? "",
        welcomeRoles: config.welcomeRoles ?? "",
        welcomeChannels: config.welcomeChannels ?? "",
        welcomeUseDivider: config.welcomeUseDivider ?? false,
        welcomeBannerPosition: config.welcomeBannerPosition ?? "top",
        welcomeShowTitle: config.welcomeShowTitle ?? true,
        welcomeShowAvatar: config.welcomeShowAvatar ?? true,
        welcomeDeleteAfter: config.welcomeDeleteAfter ?? null,
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      {
        guildId: selectedGuildId,
        data: {
          ...data,
          welcomeDeleteAfter: data.welcomeDeleteAfter ? Number(data.welcomeDeleteAfter) : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Boas-vindas atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Boas-vindas"
      description="Configure a mensagem de boas-vindas para novos membros do servidor."
      icon={<MessageSquare className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Formulário */}
        <div className="flex-1 min-w-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormSection title="Configurações Gerais">
                <FormField control={form.control} name="welcomeEnabled" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Módulo Ativo</FormLabel><FormDescription>Ativa ou desativa o sistema de boas-vindas</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeChannel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Canal</FormLabel>
                    <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>ID do canal onde as mensagens de boas-vindas serão enviadas</FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor (Hex)</FormLabel>
                    <FormControl>
                      <div className="flex gap-3 items-center">
                        <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#7c3aed"} onChange={(e) => field.onChange(e.target.value)} />
                        <Input placeholder="#7c3aed" {...field} value={field.value ?? ""} className="font-mono" />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeDeleteAfter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto-deletar (segundos)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0 = nunca deletar" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                    </FormControl>
                    <FormDescription>Deletar automaticamente após X segundos. Deixe vazio para nunca deletar.</FormDescription>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Mensagem">
                <FormField control={form.control} name="welcomeTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input placeholder="Bem-vindo ao servidor, {user}!" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Use {"{user}"}, {"{username}"}, {"{server}"}, {"{count}"}</FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto</FormLabel>
                    <FormControl><Textarea placeholder="Texto principal da mensagem..." {...field} value={field.value ?? ""} className="resize-none" rows={3} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeFooter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rodapé</FormLabel>
                    <FormControl><Input placeholder="Texto do rodapé..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Imagens">
                <FormField control={form.control} name="welcomeBanner" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Banner</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeThumb" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Miniatura</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeBannerPosition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posição do Banner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "top"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="top">Topo</SelectItem>
                        <SelectItem value="bottom">Rodapé</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Opções Visuais">
                <FormField control={form.control} name="welcomeShowTitle" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Mostrar Título</FormLabel><FormDescription>Exibir o título na mensagem</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeShowAvatar" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Mostrar Avatar</FormLabel><FormDescription>Exibir o avatar do usuário</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeUseDivider" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Usar Divisor</FormLabel><FormDescription>Linha divisória na mensagem</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Cargos e Canais Automáticos">
                <FormField control={form.control} name="welcomeRoles" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargos ao Entrar (IDs separados por vírgula)</FormLabel>
                    <FormControl><Input placeholder="123456789, 987654321" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Cargos atribuídos automaticamente ao novo membro</FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="welcomeChannels" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canais para Adicionar (IDs separados por vírgula)</FormLabel>
                    <FormControl><Input placeholder="123456789, 987654321" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8">
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Preview */}
        <div className="xl:w-[380px] xl:sticky xl:top-24 xl:self-start">
          <DiscordEmbedPreview
            data={{
              title: watched.welcomeShowTitle ? (watched.welcomeTitle || undefined) : undefined,
              description: watched.welcomeText || undefined,
              footer: watched.welcomeFooter || undefined,
              color: watched.welcomeColor,
              bannerUrl: watched.welcomeBanner || undefined,
              thumbUrl: watched.welcomeShowAvatar ? (watched.welcomeThumb || undefined) : undefined,
              bannerPosition: watched.welcomeBannerPosition,
              useDivider: watched.welcomeUseDivider,
            }}
          />
        </div>
      </div>
    </ModulePage>
  );
}
