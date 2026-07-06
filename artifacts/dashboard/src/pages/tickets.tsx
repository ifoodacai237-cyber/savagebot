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
import { Ticket, Save, Loader2 } from "lucide-react";

export default function Tickets() {
  const { selectedGuildId } = useGuild();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(selectedGuildId || "", {
    query: { enabled: !!selectedGuildId, queryKey: getGetGuildConfigQueryKey(selectedGuildId || "") },
  });

  const mutation = useUpdateGuildConfig();

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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Canais">
            <FormField
              control={form.control}
              name="ticketChannel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Canal de Abertura</FormLabel>
                  <FormControl>
                    <Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-ticket-channel" />
                  </FormControl>
                  <FormDescription>Canal onde o painel de tickets será enviado</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID da Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-ticket-category" />
                  </FormControl>
                  <FormDescription>Categoria onde os canais de tickets serão criados</FormDescription>
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Mensagem do Painel">
            <FormField
              control={form.control}
              name="ticketTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Suporte" {...field} value={field.value ?? ""} data-testid="input-ticket-title" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Clique no botão abaixo para abrir um ticket." {...field} value={field.value ?? ""} className="resize-none" rows={3} data-testid="textarea-ticket-text" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketFooter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rodapé</FormLabel>
                  <FormControl>
                    <Input placeholder="Texto do rodapé..." {...field} value={field.value ?? ""} data-testid="input-ticket-footer" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketOpenText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto ao Abrir Ticket</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bem-vindo ao seu ticket! Um membro da equipe irá atendê-lo em breve." {...field} value={field.value ?? ""} className="resize-none" rows={2} data-testid="textarea-ticket-open-text" />
                  </FormControl>
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Botão">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ticketBtnLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label do Botão</FormLabel>
                    <FormControl>
                      <Input placeholder="Abrir Ticket" {...field} value={field.value ?? ""} data-testid="input-ticket-btn-label" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ticketBtnEmoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emoji do Botão</FormLabel>
                    <FormControl>
                      <Input placeholder="🎫" {...field} value={field.value ?? ""} data-testid="input-ticket-btn-emoji" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="ticketBtnStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estilo do Botão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "primary"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ticket-btn-style">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="primary">Primário (Azul)</SelectItem>
                      <SelectItem value="secondary">Secundário (Cinza)</SelectItem>
                      <SelectItem value="success">Sucesso (Verde)</SelectItem>
                      <SelectItem value="danger">Perigo (Vermelho)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Notificações">
            <FormField
              control={form.control}
              name="ticketPingRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Cargo para Notificar</FormLabel>
                  <FormControl>
                    <Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-ticket-ping-role" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketPingUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Usuário para Notificar</FormLabel>
                  <FormControl>
                    <Input placeholder="000000000000000000" {...field} value={field.value ?? ""} data-testid="input-ticket-ping-user" />
                  </FormControl>
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Imagens">
            <FormField
              control={form.control}
              name="ticketBanner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Banner</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-ticket-banner" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketThumb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Miniatura</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value ?? ""} data-testid="input-ticket-thumb" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor (Hex)</FormLabel>
                  <FormControl>
                    <div className="flex gap-3 items-center">
                      <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent" value={field.value ?? "#7c3aed"} onChange={(e) => field.onChange(e.target.value)} data-testid="color-ticket" />
                      <Input placeholder="#7c3aed" {...field} value={field.value ?? ""} className="font-mono" data-testid="input-ticket-color" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketBannerPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posição do Banner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "top"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ticket-banner-position">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="top">Topo</SelectItem>
                      <SelectItem value="bottom">Rodapé</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Opções Avançadas">
            <FormField control={form.control} name="ticketUseSeparator" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Usar Separador</FormLabel><FormDescription>Linha divisória no painel</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ticket-use-separator" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="ticketOnlyBanner" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Apenas Banner</FormLabel><FormDescription>Exibir somente o banner, sem texto</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ticket-only-banner" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="ticketUseMenu" render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div><FormLabel>Usar Menu de Seleção</FormLabel><FormDescription>Menu dropdown ao invés de botões</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ticket-use-menu" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <FormSection title="Perguntas ao Abrir">
            <FormField control={form.control} name="ticketQuestion1" render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta 1</FormLabel>
                <FormControl><Input placeholder="Qual o motivo do seu ticket?" {...field} value={field.value ?? ""} data-testid="input-ticket-question-1" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="ticketQuestion2" render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta 2</FormLabel>
                <FormControl><Input placeholder="Como podemos te ajudar?" {...field} value={field.value ?? ""} data-testid="input-ticket-question-2" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="ticketQuestion3" render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta 3</FormLabel>
                <FormControl><Input placeholder="Alguma informação adicional?" {...field} value={field.value ?? ""} data-testid="input-ticket-question-3" /></FormControl>
              </FormItem>
            )} />
          </FormSection>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8" data-testid="button-save-tickets">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </ModulePage>
  );
}
