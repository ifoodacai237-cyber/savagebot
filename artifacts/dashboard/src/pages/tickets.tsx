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
import { Ticket, Save, Loader2, Send, RefreshCw } from "lucide-react";
import { useSendTicketPanel, useUpdateTicketPanel } from "@workspace/api-client-react";

export default function Tickets() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();
  const sendPanel = useSendTicketPanel();
  const updatePanel = useUpdateTicketPanel();

  const handleSendPanel = () => {
    if (!selectedGuildId) return;
    sendPanel.mutate(
      { guildId: selectedGuildId },
      {
        onSuccess: () => toast.success("Painel enviado no canal de tickets!"),
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          toast.error(msg ?? "Erro ao enviar painel.");
        },
      }
    );
  };

  const handleUpdatePanel = () => {
    if (!selectedGuildId) return;
    updatePanel.mutate(
      { guildId: selectedGuildId },
      {
        onSuccess: () => toast.success("Painel atualizado no Discord!"),
        onError: (err: unknown) => {
          const resp = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
          if (resp?.error === "NO_PANEL_ID") {
            toast.error("Nenhum painel rastreado. Use /ticket painel no Discord primeiro.");
          } else if (resp?.error === "PANEL_NOT_FOUND") {
            toast.error("Mensagem não encontrada. Envie um novo painel com o botão abaixo.");
          } else {
            toast.error(resp?.message ?? "Erro ao atualizar painel.");
          }
        },
      }
    );
  };

  const form = useForm({
    defaultValues: {
      ticketChannel: "",
      ticketCategory: "",
      ticketColor: "#7c3aed",
      ticketBanner: "",
      ticketThumb: "",
      ticketTitle: "",
      ticketText: "",
      ticketFooter: "",
      ticketPingRole: "",
      ticketPingUser: "",
      ticketBtnLabel: "",
      ticketBtnEmoji: "",
      ticketBtnStyle: "primary",
      ticketOpenText: "",
      ticketUseSeparator: false,
      ticketBannerPosition: "top",
      ticketOnlyBanner: false,
      ticketUseMenu: false,
      ticketQuestion1: "",
      ticketQuestion2: "",
      ticketQuestion3: "",
    },
  });

  const watched = form.watch();

  React.useEffect(() => {
    if (config) {
      form.reset({
        ticketChannel: config.ticketChannel ?? "",
        ticketCategory: config.ticketCategory ?? "",
        ticketColor: config.ticketColor ?? "#7c3aed",
        ticketBanner: config.ticketBanner ?? "",
        ticketThumb: config.ticketThumb ?? "",
        ticketTitle: config.ticketTitle ?? "",
        ticketText: config.ticketText ?? "",
        ticketFooter: config.ticketFooter ?? "",
        ticketPingRole: config.ticketPingRole ?? "",
        ticketPingUser: config.ticketPingUser ?? "",
        ticketBtnLabel: config.ticketBtnLabel ?? "",
        ticketBtnEmoji: config.ticketBtnEmoji ?? "",
        ticketBtnStyle: config.ticketBtnStyle ?? "primary",
        ticketOpenText: config.ticketOpenText ?? "",
        ticketUseSeparator: config.ticketUseSeparator ?? false,
        ticketBannerPosition: config.ticketBannerPosition ?? "top",
        ticketOnlyBanner: config.ticketOnlyBanner ?? false,
        ticketUseMenu: config.ticketUseMenu ?? false,
        ticketQuestion1: config.ticketQuestion1 ?? "",
        ticketQuestion2: config.ticketQuestion2 ?? "",
        ticketQuestion3: config.ticketQuestion3 ?? "",
      });
    }
  }, [config]);

  const onSubmit = (data: ReturnType<typeof form.getValues>) => {
    if (!selectedGuildId) return;
    mutation.mutate(
      { guildId: selectedGuildId, data },
      {
        onSuccess: () => {
          toast.success("Tickets atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(selectedGuildId) });
        },
        onError: () => toast.error("Erro ao salvar. Tente novamente."),
      }
    );
  };

  return (
    <ModulePage
      title="Sistema de Tickets"
      description="Configure o sistema de suporte e atendimento por tickets."
      icon={<Ticket className="w-6 h-6" />}
      isLoading={isLoading && !!selectedGuildId}
      noGuildSelected={!selectedGuildId}
    >
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Formulário */}
        <div className="flex-1 min-w-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormSection title="Canais">
                <FormField control={form.control} name="ticketChannel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Canal de Abertura</FormLabel>
                    <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Canal onde o painel de tickets será enviado</FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketCategory" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Categoria</FormLabel>
                    <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormDescription>Categoria onde os canais de tickets serão criados</FormDescription>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Mensagem do Painel">
                <FormField control={form.control} name="ticketTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl><Input placeholder="Suporte" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto</FormLabel>
                    <FormControl><Textarea placeholder="Clique no botão abaixo para abrir um ticket." {...field} value={field.value ?? ""} className="resize-none" rows={3} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketFooter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rodapé</FormLabel>
                    <FormControl><Input placeholder="Texto do rodapé..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketOpenText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto ao Abrir Ticket</FormLabel>
                    <FormControl><Textarea placeholder="Bem-vindo ao seu ticket! Um membro da equipe irá atendê-lo em breve." {...field} value={field.value ?? ""} className="resize-none" rows={2} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Botão">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="ticketBtnLabel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label do Botão</FormLabel>
                      <FormControl><Input placeholder="Abrir Ticket" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ticketBtnEmoji" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emoji do Botão</FormLabel>
                      <FormControl><Input placeholder="🎫" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="ticketBtnStyle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilo do Botão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "primary"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="primary">Primário (Azul)</SelectItem>
                        <SelectItem value="secondary">Secundário (Cinza)</SelectItem>
                        <SelectItem value="success">Sucesso (Verde)</SelectItem>
                        <SelectItem value="danger">Perigo (Vermelho)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Notificações">
                <FormField control={form.control} name="ticketPingRole" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Cargo para Notificar</FormLabel>
                    <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketPingUser" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Usuário para Notificar</FormLabel>
                    <FormControl><Input placeholder="000000000000000000" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Imagens">
                <FormField control={form.control} name="ticketBanner" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Banner</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketThumb" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Miniatura</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketColor" render={({ field }) => (
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
                <FormField control={form.control} name="ticketBannerPosition" render={({ field }) => (
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

              <FormSection title="Opções Avançadas">
                <FormField control={form.control} name="ticketUseSeparator" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Usar Separador</FormLabel><FormDescription>Linha divisória no painel</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketOnlyBanner" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Apenas Banner</FormLabel><FormDescription>Exibir somente o banner, sem texto</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketUseMenu" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div><FormLabel>Usar Menu de Seleção</FormLabel><FormDescription>Menu dropdown ao invés de botões</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Perguntas ao Abrir">
                <FormField control={form.control} name="ticketQuestion1" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta 1</FormLabel>
                    <FormControl><Input placeholder="Qual o motivo do seu ticket?" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketQuestion2" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta 2</FormLabel>
                    <FormControl><Input placeholder="Como podemos te ajudar?" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ticketQuestion3" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta 3</FormLabel>
                    <FormControl><Input placeholder="Alguma informação adicional?" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </FormSection>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={updatePanel.isPending}
                  onClick={handleUpdatePanel}
                  className="gap-2"
                >
                  {updatePanel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Atualizar Painel no Discord
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={sendPanel.isPending}
                  onClick={handleSendPanel}
                  className="gap-2"
                >
                  {sendPanel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Novo Painel
                </Button>
                <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8">
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Preview */}
        <div className="xl:w-[380px] xl:sticky xl:top-24 xl:self-start">
          <DiscordEmbedPreview
            data={{
              title: watched.ticketTitle || undefined,
              description: watched.ticketOnlyBanner ? undefined : (watched.ticketText || undefined),
              footer: watched.ticketFooter || undefined,
              color: watched.ticketColor,
              bannerUrl: watched.ticketBanner || undefined,
              thumbUrl: watched.ticketThumb || undefined,
              bannerPosition: watched.ticketBannerPosition,
              onlyBanner: watched.ticketOnlyBanner,
              useDivider: watched.ticketUseSeparator,
              button: {
                label: watched.ticketBtnLabel,
                emoji: watched.ticketBtnEmoji,
                style: watched.ticketBtnStyle,
              },
            }}
          />
        </div>
      </div>
    </ModulePage>
  );
}
